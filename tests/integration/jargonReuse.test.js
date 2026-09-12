import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { HistoryManager } from "../../entrypoints/background/historyManager.ts";
import { MessageUtils } from "../../entrypoints/background/messageUtils.ts";
import { RequestManager } from "../../entrypoints/background/requestManager.ts";
import {
  setLocalResultDeliveryTimeoutForTests,
  TranslationService,
} from "../../entrypoints/background/translationService.ts";
import { getJargonReuseTerm } from "../../entrypoints/shared/jargonReuse.ts";
import {
  findExactJargonItem,
  setJargonLookupTimeoutForTests,
} from "../../entrypoints/shared/jargonStorage.ts";
import { JARGON_STORAGE_KEY } from "../../entrypoints/shared/jargonTypes.ts";
import {
  createRequestId,
  POPUP_TRANSLATION_TARGET,
} from "../../entrypoints/shared/requestProtocol.ts";
import { SettingsUtils } from "../../entrypoints/shared/settingsUtils.ts";
import { retryAssistantMessageAndTruncate } from "../../entrypoints/shared/chatEditRetry.ts";
import {
  getRequestTimeoutRuntime,
  setRequestTimeoutRuntimeForTests,
} from "../../entrypoints/shared/requestTimeout.ts";
import {
  createMemoryBrowserStorage,
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("browser", "fetch");
const originalGetSettings = SettingsUtils.getSettings;
const originalSendRuntimeMessage = MessageUtils.sendRuntimeMessage;
const originalSaveHistory = HistoryManager.saveTranslationHistory;

let requestIds;
let sentMessages;
let savedHistory;
let fetchCalls;

class TrackingClock {
  nextId = 1;
  timers = new Map();

  setTimeout = (handler, delay) => {
    const id = this.nextId++;
    this.timers.set(id, { handler, delay });
    return id;
  };

  clearTimeout = (id) => {
    this.timers.delete(id);
  };

  get size() {
    return this.timers.size;
  }
}

function createRequest() {
  const requestId = createRequestId();
  requestIds.add(requestId);
  RequestManager.createRequest(requestId, POPUP_TRANSLATION_TARGET);
  const context = RequestManager.claimRequest(requestId);
  if (!context) throw new Error("测试请求未成功领取");
  return { requestId, context };
}

function createStoredJargon() {
  return {
    id: "jargon-1",
    term: "颗粒度",
    explanation: "事情分析到多细。",
    analogy: "像地图的缩放级别。",
    category: "大厂黑话",
    tags: ["工作"],
    isStarred: true,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createAiResponse(content = "模型结果") {
  return new Response(
    `data: ${JSON.stringify({
      choices: [{ delta: { content } }],
    })}\n\ndata: [DONE]\n\n`,
    { status: 200 }
  );
}

beforeEach(() => {
  requestIds = new Set();
  sentMessages = [];
  savedHistory = [];
  fetchCalls = 0;
  setJargonLookupTimeoutForTests(10);
  setLocalResultDeliveryTimeoutForTests(10);

  const mock = createMemoryBrowserStorage({
    local: { [JARGON_STORAGE_KEY]: [createStoredJargon()] },
  });
  setTestGlobal("browser", mock.browser);
  setTestGlobal("fetch", async () => {
    fetchCalls += 1;
    return createAiResponse();
  });
  SettingsUtils.getSettings = async () => ({
    apiKey: "test-key",
    baseUrl: "https://example.com/chat",
    model: "test-model",
    temperature: 0,
    promptTemplate: "测试提示词",
    thinkingEnabled: false,
  });
  MessageUtils.sendRuntimeMessage = async (message) => {
    sentMessages.push(message);
    return true;
  };
  HistoryManager.saveTranslationHistory = async (...args) => {
    savedHistory.push(args);
  };
});

afterEach(() => {
  for (const requestId of requestIds) {
    RequestManager.cleanupRequest(requestId);
  }
  setJargonLookupTimeoutForTests();
  setLocalResultDeliveryTimeoutForTests();
  setRequestTimeoutRuntimeForTests(undefined);
  SettingsUtils.getSettings = originalGetSettings;
  MessageUtils.sendRuntimeMessage = originalSendRuntimeMessage;
  HistoryManager.saveTranslationHistory = originalSaveHistory;
  restoreGlobals();
});

describe("生词本自动复用资格", () => {
  test("只接受单轮纯文本，明确排除图片、上下文、多轮和 bypass", () => {
    expect(getJargonReuseTerm({ text: " 颗粒度 " })).toBe("颗粒度");
    expect(
      getJargonReuseTerm({ messages: [{ role: "user", content: "颗粒度" }] })
    ).toBe("颗粒度");

    expect(getJargonReuseTerm({ text: "颗粒度", images: [{}] })).toBeUndefined();
    expect(
      getJargonReuseTerm({
        text: "颗粒度",
        selectionContext: { paragraph: "上下文里的颗粒度" },
      })
    ).toBeUndefined();
    expect(
      getJargonReuseTerm({
        messages: [
          { role: "user", content: "颗粒度" },
          { role: "assistant", content: "旧回答" },
          { role: "user", content: "再解释一下" },
        ],
      })
    ).toBeUndefined();
    expect(
      getJargonReuseTerm({ text: "颗粒度", bypassJargonVault: true })
    ).toBeUndefined();
  });

  test("精确匹配区分大小写，不执行模糊或 Unicode 归一化", async () => {
    expect((await findExactJargonItem("颗粒度"))?.id).toBe("jargon-1");
    expect(await findExactJargonItem("颗粒")).toBeUndefined();

    const mock = createMemoryBrowserStorage({
      local: {
        [JARGON_STORAGE_KEY]: [
          { ...createStoredJargon(), term: "RAG" },
        ],
      },
    });
    setTestGlobal("browser", mock.browser);
    expect(await findExactJargonItem("rag")).toBeUndefined();
  });
});

describe("TranslationService 生词本复用", () => {
  test("命中时无需 API Key，只交付释义和独立来源元信息并保存历史", async () => {
    SettingsUtils.getSettings = async () => {
      throw new Error("命中时不应读取 API 设置");
    };
    const { context } = createRequest();

    await expect(
      TranslationService.translateText({ text: "颗粒度" }, context)
    ).resolves.toBe("事情分析到多细。");

    expect(fetchCalls).toBe(0);
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]).toMatchObject({
      content: "事情分析到多细。",
      resultSource: "jargon-vault",
      done: true,
    });
    expect(sentMessages[0].item).toBeUndefined();
    expect(sentMessages[0].category).toBeUndefined();
    expect(savedHistory[0]).toEqual([
      "颗粒度",
      "事情分析到多细。",
      "",
      "jargon-vault",
    ]);
  });

  test("存储读取超时按未命中回退模型", async () => {
    const mock = createMemoryBrowserStorage();
    mock.browser.storage.local.get = (key) =>
      key === JARGON_STORAGE_KEY ? new Promise(() => {}) : Promise.resolve({});
    setTestGlobal("browser", mock.browser);
    const { context } = createRequest();

    await expect(
      TranslationService.translateText({ text: "颗粒度" }, context)
    ).resolves.toBe("模型结果");

    expect(fetchCalls).toBe(1);
    expect(sentMessages.at(-1)).toMatchObject({
      content: "模型结果",
      done: true,
    });
    expect(sentMessages.at(-1).resultSource).toBeUndefined();
  });

  test("存储读取异常按未命中回退模型", async () => {
    const mock = createMemoryBrowserStorage();
    mock.browser.storage.local.get = (key) => {
      if (key === JARGON_STORAGE_KEY) throw new Error("storage unavailable");
      return Promise.resolve({});
    };
    setTestGlobal("browser", mock.browser);
    const { context } = createRequest();

    await expect(
      TranslationService.translateText({ text: "颗粒度" }, context)
    ).resolves.toBe("模型结果");
    expect(fetchCalls).toBe(1);
  });

  test("显式重新生成跳过已命中词条并调用模型", async () => {
    const { context } = createRequest();

    await expect(
      TranslationService.translateText(
        { text: "颗粒度", bypassJargonVault: true },
        context
      )
    ).resolves.toBe("模型结果");

    expect(fetchCalls).toBe(1);
    expect(sentMessages.at(-1).resultSource).toBeUndefined();
  });

  test("模型引用尾块原样交付侧栏，同时全局历史只保存可读正文", async () => {
    const rawAnswer = [
      "应优先修复支付失败率。[依据:E1]",
      "<!-- human-text-evidence:v1",
      '{"citations":[{"id":"E1","segmentIndex":2,"quote":"应优先修复支付失败率"}]}',
      "-->",
    ].join("\n");
    setTestGlobal("fetch", async () => {
      fetchCalls += 1;
      return createAiResponse(rawAnswer);
    });
    const { context } = createRequest();

    await expect(
      TranslationService.translateText(
        { text: "按目标提取", bypassJargonVault: true },
        context
      )
    ).resolves.toBe(rawAnswer);

    expect(sentMessages.at(-1)).toMatchObject({
      content: rawAnswer,
      done: true,
    });
    expect(savedHistory).toHaveLength(1);
    expect(savedHistory[0][1]).toBe("应优先修复支付失败率。[依据:E1]");
    expect(savedHistory[0][1]).not.toContain("human-text-evidence:v1");
  });

  test("未命中且只有默认占位 Key 时提示配置，不发起请求", async () => {
    SettingsUtils.getSettings = async () => ({
      apiKey: "your_api_key",
      baseUrl: "https://example.com/chat",
      model: "test-model",
      temperature: 0,
      promptTemplate: "测试提示词",
      thinkingEnabled: false,
    });
    const { context } = createRequest();

    await expect(
      TranslationService.translateText({ text: "未保存词条" }, context)
    ).rejects.toThrow("请先在设置中配置 API Key");
    expect(fetchCalls).toBe(0);
    expect(sentMessages.at(-1).error).toBe("请先在设置中配置 API Key");
  });

  test("查找期间取消请求后不再调用模型", async () => {
    const mock = createMemoryBrowserStorage();
    mock.browser.storage.local.get = () => new Promise(() => {});
    setTestGlobal("browser", mock.browser);
    const { requestId, context } = createRequest();
    const operation = TranslationService.translateText(
      { text: "颗粒度" },
      context
    );

    RequestManager.cleanupRequest(requestId);
    await expect(operation).resolves.toBeUndefined();
    expect(fetchCalls).toBe(0);
    expect(sentMessages).toHaveLength(0);
  });

  test("本地结果交付失败时直接失败，不会再次调用模型", async () => {
    MessageUtils.sendRuntimeMessage = async () => {
      throw new Error("本地交付失败");
    };
    const { context } = createRequest();

    await expect(
      TranslationService.translateText({ text: "颗粒度" }, context)
    ).rejects.toThrow("本地交付失败");
    expect(fetchCalls).toBe(0);
  });

  test("历史写入挂起不阻塞请求完成，终态前已清空守卫计时器", async () => {
    const clock = new TrackingClock();
    const policy = getRequestTimeoutRuntime().policy;
    setRequestTimeoutRuntimeForTests({ policy, clock });
    HistoryManager.saveTranslationHistory = () => new Promise(() => {});
    const { requestId, context } = createRequest();

    await expect(
      TranslationService.translateText({ text: "颗粒度" }, context)
    ).resolves.toBe("事情分析到多细。");

    expect(RequestManager.isActiveRequest(requestId)).toBe(false);
    expect(clock.size).toBe(0);
    expect(fetchCalls).toBe(0);
  });

  test("本地终态消息交付挂起会有限结束并清理请求", async () => {
    MessageUtils.sendRuntimeMessage = () => new Promise(() => {});
    const { requestId, context } = createRequest();

    await expect(
      TranslationService.translateText({ text: "颗粒度" }, context)
    ).resolves.toBeUndefined();

    expect(RequestManager.isActiveRequest(requestId)).toBe(false);
    expect(fetchCalls).toBe(0);
  });
});

describe("生词本来源状态", () => {
  test("重新生成会清空旧回答的来源元信息", () => {
    const result = retryAssistantMessageAndTruncate(
      [
        {
          id: "user-1",
          role: "user",
          content: "颗粒度",
          createdAt: 1,
          status: "completed",
        },
        {
          id: "assistant-1",
          role: "assistant",
          content: "事情分析到多细。",
          resultSource: "jargon-vault",
          createdAt: 2,
          status: "completed",
        },
      ],
      "assistant-1",
      { now: 3 }
    );

    expect(result.updatedMessages.at(-1)).toMatchObject({
      id: "assistant-1",
      content: "",
      status: "streaming",
      resultSource: undefined,
    });
  });
});
