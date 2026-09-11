/**
 * 参数适配改造的护栏测试（entrypoints/shared/modelCatalog.ts）
 *
 * 这次改造把「发什么参数」从 translationService / apiService 里的硬编码
 * 收敛到 modelCatalog。测试的重点不是新功能，而是**防止动主请求路径时改坏默认路径**：
 *
 * 不变量 1：DeepSeek 与任何未识别的 baseUrl，必须与改造前逐字段一致 ——
 *           `{ temperature: <入参>, thinking: { type: "enabled" | "disabled" } }`，
 *           既不能少字段，也不能多出 reasoning_effort / enable_thinking / reasoning。
 * 不变量 2：连接测试与正式翻译共用同一套参数决策 —— 连接测试不得自行发明
 *           temperature / 思考字段，Kimi 一侧省略 temperature，两侧都必须省略。
 *
 * 断言全部走「线上形态」（JSON.stringify 之后），因为请求真正发出去的就是它。
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ApiService } from "../../entrypoints/background/apiService.ts";
import { HistoryManager } from "../../entrypoints/background/historyManager.ts";
import { MessageUtils } from "../../entrypoints/background/messageUtils.ts";
import { RequestManager } from "../../entrypoints/background/requestManager.ts";
import { TranslationService } from "../../entrypoints/background/translationService.ts";
import { API_HINTS } from "../../entrypoints/options/config/index.ts";
import { DEFAULT_SETTINGS } from "../../entrypoints/shared/constants/index.ts";
import {
  buildConnectionTestParams,
  buildModelParams,
  PROVIDER_PROFILES,
  resolveProvider,
} from "../../entrypoints/shared/modelCatalog.ts";
import { createSidepanelTarget } from "../../entrypoints/shared/requestProtocol.ts";
import { SettingsUtils } from "../../entrypoints/shared/settingsUtils.ts";
import { preserveGlobals, setTestGlobal } from "../helpers/testEnvironment.js";

// ---------------------------------------------------------------------------
// 地面真值：提供商地址只从 options/config 的 API_HINTS 派生，
// 避免把「实现自己写的地址」当成期望值而自证正确。
// ---------------------------------------------------------------------------

function hintUrl(name) {
  const hint = API_HINTS.find((entry) => entry.name === name);
  if (!hint?.url) throw new Error(`API_HINTS 缺少 ${name} 的地址`);
  return hint.url;
}

const PROVIDER_URL = {
  deepseek: hintUrl("DeepSeek"),
  zhipu: hintUrl("智谱AI (GLM)"),
  volcengine: hintUrl("火山引擎"),
  moonshot: hintUrl("月之暗面"),
  openrouter: hintUrl("OpenRouter"),
  qwen: hintUrl("通义千问"),
};

const PROVIDER_IDS = Object.keys(PROVIDER_URL).sort();

const THINKING_ON = { type: "enabled" };
const THINKING_OFF = { type: "disabled" };

/**
 * 冻结的行为规格（快速 = thinkingEnabled false / 深度 = thinkingEnabled true）。
 * temperature 取用户设置值 0.7。
 */
const PARAM_SNAPSHOTS = {
  deepseek: {
    fast: { temperature: 0.7, thinking: THINKING_OFF },
    deep: { temperature: 0.7, thinking: THINKING_ON },
  },
  zhipu: {
    fast: { temperature: 0.7, thinking: THINKING_ON, reasoning_effort: "medium" },
    deep: { temperature: 0.7, thinking: THINKING_ON, reasoning_effort: "high" },
  },
  // 火山引擎「保持今天行为」：与 DeepSeek 同构
  volcengine: {
    fast: { temperature: 0.7, thinking: THINKING_OFF },
    deep: { temperature: 0.7, thinking: THINKING_ON },
  },
  // Kimi：无 temperature
  moonshot: {
    fast: { thinking: THINKING_OFF },
    deep: { thinking: THINKING_ON },
  },
  openrouter: {
    fast: { temperature: 0.7, reasoning: { effort: "medium" } },
    deep: { temperature: 0.7, reasoning: { effort: "high" } },
  },
  qwen: {
    fast: { temperature: 0.7, enable_thinking: false },
    deep: { temperature: 0.7, enable_thinking: true },
  },
};

/** 改造前 translationService 对**所有**地址都发的参数形态（不变量 1 的基准） */
function legacyModelParams(temperature, thinkingEnabled) {
  return {
    temperature,
    thinking: thinkingEnabled ? THINKING_ON : THINKING_OFF,
  };
}

/** 未知 / 自建 / 中转地址：必须全部回落改造前行为 */
const UNKNOWN_BASE_URLS = [
  "",
  "   ",
  "https://example.com/chat",
  "https://my-relay.example.net/v1/chat/completions",
  "https://api.deepseek.com.evil.example/v1/chat/completions",
  "http://localhost:11434/v1/chat/completions",
  "not-a-url",
];

/** 请求体经 JSON.stringify 后的真实线上形态（undefined 字段会消失） */
function wire(value) {
  return JSON.parse(JSON.stringify(value));
}

/** 请求体里除 model / messages / stream 之外的「模型参数」键（排序后，顺序无关） */
const NON_MODEL_PARAM_KEYS = ["model", "messages", "stream"];
function modelParamKeys(body) {
  return Object.keys(body)
    .filter((key) => !NON_MODEL_PARAM_KEYS.includes(key))
    .sort();
}

// ---------------------------------------------------------------------------
// fetch 捕获装置（复用 tests/integration 里既有的 mock 手法）
// ---------------------------------------------------------------------------

const restoreGlobals = preserveGlobals("fetch");
const originalGetSettings = SettingsUtils.getSettings;
const originalSendRuntimeMessage = MessageUtils.sendRuntimeMessage;
const originalSaveHistory = HistoryManager.saveTranslationHistory;

const TEST_TEXT = "测试";
const TEST_PROMPT = "测试提示词";
const TEST_TEMPERATURE = 0.7;

let capturedBodies;
let requestCounter;
const requestIds = new Set();

function sseResponse() {
  return new Response(
    'data: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\n',
    { status: 200, headers: { "Content-Type": "text/event-stream" } }
  );
}

beforeEach(() => {
  capturedBodies = [];
  requestCounter = 0;
  requestIds.clear();
  setTestGlobal("fetch", async (_url, options) => {
    capturedBodies.push(JSON.parse(options.body));
    return sseResponse();
  });
  MessageUtils.sendRuntimeMessage = async () => true;
  HistoryManager.saveTranslationHistory = async () => {};
});

afterEach(() => {
  restoreGlobals();
  SettingsUtils.getSettings = originalGetSettings;
  MessageUtils.sendRuntimeMessage = originalSendRuntimeMessage;
  HistoryManager.saveTranslationHistory = originalSaveHistory;
  for (const requestId of requestIds) RequestManager.cleanupRequest(requestId);
  requestIds.clear();
});

/** 跑一次真实翻译，返回 fetch 实际发出去的请求体 */
async function captureTranslationBody({
  baseUrl,
  model,
  temperature = TEST_TEMPERATURE,
  thinkingEnabled = false,
}) {
  SettingsUtils.getSettings = async () => ({
    apiKey: "test-key",
    baseUrl,
    model,
    temperature,
    promptTemplate: TEST_PROMPT,
    thinkingEnabled: false,
    showSelectionToolbar: false,
    contextualSelectionEnabled: false,
    prismModeEnabled: false,
    logLevel: "off",
    theme: "system",
  });

  const requestId = `model-catalog-request-${++requestCounter}`;
  requestIds.add(requestId);
  RequestManager.createRequest(requestId, createSidepanelTarget("model-catalog"));
  const context = RequestManager.claimRequest(requestId);
  if (!context) throw new Error("测试请求未成功领取");

  await TranslationService.translateText(
    { text: TEST_TEXT, thinkingEnabled },
    context
  );

  const body = capturedBodies.at(-1);
  if (!body) throw new Error("翻译请求未发出，无法捕获请求体");
  return body;
}

/** 跑一次连接测试，返回 fetch 实际发出去的请求体 */
async function captureConnectionTestBody({ baseUrl, model }) {
  await ApiService.testApiConnection("test-key", baseUrl, model);
  const body = capturedBodies.at(-1);
  if (!body) throw new Error("连接测试请求未发出，无法捕获请求体");
  return body;
}

// ---------------------------------------------------------------------------
// 六家 × 快/深 的参数快照
// ---------------------------------------------------------------------------

describe("buildModelParams 六家 × 快/深 全量快照", () => {
  for (const provider of PROVIDER_IDS) {
    for (const mode of ["fast", "deep"]) {
      test(`${provider} ${mode === "fast" ? "快速" : "深度"} 模式逐字段一致`, () => {
        const expected = PARAM_SNAPSHOTS[provider][mode];
        const params = wire(
          buildModelParams({
            baseUrl: PROVIDER_URL[provider],
            model: "any-model",
            thinkingEnabled: mode === "deep",
            temperature: TEST_TEMPERATURE,
          })
        );

        expect(params).toEqual(expected);
        // 键集合也必须一致：不能多出别家的字段
        expect(Object.keys(params).sort()).toEqual(Object.keys(expected).sort());
      });
    }
  }

  test("moonshot 两种模式都不携带 temperature", () => {
    for (const thinkingEnabled of [false, true]) {
      const params = wire(
        buildModelParams({
          baseUrl: PROVIDER_URL.moonshot,
          model: "kimi-k2.6",
          thinkingEnabled,
          temperature: TEST_TEMPERATURE,
        })
      );
      expect("temperature" in params).toBe(false);
    }
  });

  test("temperature 原样透传（0 不能被默认值吞掉）", () => {
    for (const temperature of [0, 0.1, 0.7, 1, 2]) {
      const params = buildModelParams({
        baseUrl: PROVIDER_URL.deepseek,
        model: "deepseek-flash",
        thinkingEnabled: false,
        temperature,
      });
      expect(params.temperature).toBe(temperature);
    }
  });
});

// ---------------------------------------------------------------------------
// 不变量 1：DeepSeek 与未知端点零漂移
// ---------------------------------------------------------------------------

describe("不变量 1：DeepSeek / 未知端点不得有行为漂移", () => {
  test("buildModelParams 对 DeepSeek 与未知地址产出改造前的参数形态", () => {
    for (const baseUrl of [PROVIDER_URL.deepseek, ...UNKNOWN_BASE_URLS]) {
      for (const thinkingEnabled of [false, true]) {
        const params = wire(
          buildModelParams({
            baseUrl,
            model: "deepseek-flash",
            thinkingEnabled,
            temperature: TEST_TEMPERATURE,
          })
        );
        expect(params).toEqual(legacyModelParams(TEST_TEMPERATURE, thinkingEnabled));
        expect(Object.keys(params).sort()).toEqual(
          ["temperature", "thinking"].sort()
        );
      }
    }
  });

  test("translateText 对 DeepSeek 发出的请求体与改造前逐字段一致", async () => {
    const body = await captureTranslationBody({
      baseUrl: PROVIDER_URL.deepseek,
      model: "deepseek-flash",
      temperature: TEST_TEMPERATURE,
      thinkingEnabled: false,
    });

    // 不仅是「thinking 存在」，而是整个请求体逐字段相等
    expect(body).toEqual({
      model: "deepseek-flash",
      messages: [
        { role: "system", content: TEST_PROMPT },
        { role: "user", content: TEST_TEXT },
      ],
      temperature: TEST_TEMPERATURE,
      stream: true,
      thinking: { type: "disabled" },
    });
    // 键集合与改造前完全相同（顺序无关）：既没丢键，也没多键
    expect(Object.keys(body).sort()).toEqual(
      ["messages", "model", "stream", "temperature", "thinking"].sort()
    );
  });

  test("translateText 对未知/自建/中转地址发出的请求体不变", async () => {
    for (const baseUrl of UNKNOWN_BASE_URLS) {
      capturedBodies = [];
      const body = await captureTranslationBody({
        baseUrl,
        model: "self-hosted-model",
        temperature: 0.3,
        thinkingEnabled: true,
      });

      expect(body).toEqual({
        model: "self-hosted-model",
        messages: [
          { role: "system", content: TEST_PROMPT },
          { role: "user", content: TEST_TEXT },
        ],
        temperature: 0.3,
        stream: true,
        thinking: { type: "enabled" },
      });
      expect(Object.keys(body).sort()).toEqual(
        ["messages", "model", "stream", "temperature", "thinking"].sort()
      );

      // 改造后新引入的字段一个都不许出现在默认路径上
      for (const key of [
        "reasoning",
        "reasoning_effort",
        "enable_thinking",
      ]) {
        expect(key in body).toBe(false);
      }
    }
  });

  test("出厂默认配置落在 DeepSeek 冻结分支上（默认路径 == 快照路径）", () => {
    expect(DEFAULT_SETTINGS.baseUrl).toBe(PROVIDER_URL.deepseek);
    expect(resolveProvider(DEFAULT_SETTINGS.baseUrl)?.id).toBe("deepseek");
    expect(DEFAULT_SETTINGS.model).toBe(
      PROVIDER_PROFILES.find((profile) => profile.id === "deepseek").defaultModel
    );
    expect(
      wire(
        buildModelParams({
          baseUrl: DEFAULT_SETTINGS.baseUrl,
          model: DEFAULT_SETTINGS.model,
          thinkingEnabled: false,
          temperature: DEFAULT_SETTINGS.temperature,
        })
      )
    ).toEqual({
      temperature: DEFAULT_SETTINGS.temperature,
      thinking: { type: "disabled" },
    });
  });

  test("translateText 的 temperature 入参优先级不变（params > settings > 默认）", async () => {
    SettingsUtils.getSettings = async () => ({
      apiKey: "test-key",
      baseUrl: PROVIDER_URL.deepseek,
      model: "deepseek-flash",
      temperature: 0.42,
      promptTemplate: TEST_PROMPT,
      thinkingEnabled: false,
      showSelectionToolbar: false,
      contextualSelectionEnabled: false,
      prismModeEnabled: false,
      logLevel: "off",
      theme: "system",
    });

    const requestId = "model-catalog-temperature-priority";
    requestIds.add(requestId);
    RequestManager.createRequest(
      requestId,
      createSidepanelTarget("model-catalog")
    );
    const context = RequestManager.claimRequest(requestId);
    await TranslationService.translateText(
      { text: TEST_TEXT, temperature: 0 },
      context
    );

    // 0 是显式入参，不能被 settings 的 0.42 覆盖
    expect(capturedBodies.at(-1).temperature).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 不变量 2：连接测试与正式翻译共用同一套参数生成
// ---------------------------------------------------------------------------

describe("不变量 2：连接测试与正式翻译的模型参数同源", () => {
  for (const provider of PROVIDER_IDS) {
    for (const mode of ["fast", "deep"]) {
      test(`${provider} ${mode === "fast" ? "快速" : "深度"}：两侧参数同源且不矛盾`, async () => {
        const baseUrl = PROVIDER_URL[provider];
        const model = "any-model";
        const thinkingEnabled = mode === "deep";

        capturedBodies = [];
        const translationBody = await captureTranslationBody({
          baseUrl,
          model,
          temperature: TEST_TEMPERATURE,
          thinkingEnabled,
        });
        const connectionBody = await captureConnectionTestBody({
          baseUrl,
          model,
        });

        // --- 正式翻译侧：实际发出去的参数 == buildModelParams == 规格 ---
        const expectedModelParams = wire(
          buildModelParams({
            baseUrl,
            model,
            thinkingEnabled,
            temperature: TEST_TEMPERATURE,
          })
        );
        expect(modelParamKeys(translationBody)).toEqual(
          Object.keys(expectedModelParams).sort()
        );
        for (const [key, value] of Object.entries(expectedModelParams)) {
          expect(translationBody[key]).toEqual(value);
        }
        expect(modelParamKeys(translationBody)).toEqual(
          Object.keys(PARAM_SNAPSHOTS[provider][mode]).sort()
        );

        // --- 连接测试侧：参数必须来自 buildConnectionTestParams，不得自行发明 ---
        const expectedConnectionParams = wire(
          buildConnectionTestParams({ baseUrl, model })
        );
        expect(modelParamKeys(connectionBody)).toEqual(
          Object.keys(expectedConnectionParams).sort()
        );
        for (const [key, value] of Object.entries(expectedConnectionParams)) {
          expect(connectionBody[key]).toEqual(value);
        }
        expect(connectionBody.model).toBe(model);

        // 连接测试没有思考开关，就不得自己编一个思考参数出来
        for (const key of [
          "thinking",
          "reasoning",
          "reasoning_effort",
          "enable_thinking",
        ]) {
          expect(key in connectionBody).toBe(false);
        }

        // --- 跨侧一致性 ---
        // Kimi：buildModelParams 省略 temperature，连接测试也必须省略
        if (provider === "moonshot") {
          expect("temperature" in translationBody).toBe(false);
          expect("temperature" in connectionBody).toBe(false);
        } else {
          expect(translationBody.temperature).toBe(TEST_TEMPERATURE);
          expect(connectionBody.temperature).toBe(0.1);
        }
      });
    }
  }

  test("连接测试对未知地址回落默认 temperature=0.1", async () => {
    const body = await captureConnectionTestBody({
      baseUrl: "https://my-relay.example.net/v1/chat/completions",
      model: "any-model",
    });
    expect(body).toEqual({
      model: "any-model",
      messages: [{ role: "user", content: "test" }],
      temperature: 0.1,
      max_tokens: 512,
    });
  });
});

// ---------------------------------------------------------------------------
// resolveProvider
// ---------------------------------------------------------------------------

describe("resolveProvider", () => {
  test("识别六家 baseUrl（带路径 / 尾斜杠 / 大小写 / 省略协议）", () => {
    for (const provider of PROVIDER_IDS) {
      const url = PROVIDER_URL[provider];
      const variants = [
        url,
        `${url}/`,
        url.replace("/v1/chat/completions", "").replace("/api/paas/v4/chat/completions", ""),
        url.toUpperCase(),
        // 路径大小写不同（有些网关对 path 大小写并不敏感）
        url.replace(/\/[^/]*$/, (segment) => segment.toUpperCase()),
        `${url}?api-version=1`,
        `${url}#fragment`,
        url.replace("https://", ""),
      ];

      for (const variant of variants) {
        const profile = resolveProvider(variant);
        if (!profile) {
          throw new Error(`resolveProvider 未识别 ${provider} 的地址：${variant}`);
        }
        expect(profile.id).toBe(provider);
      }
    }
  });

  test("主机名大小写与端口不影响识别", () => {
    expect(resolveProvider("https://API.DeepSeek.com/v1/chat/completions").id).toBe(
      "deepseek"
    );
    expect(
      resolveProvider("https://api.moonshot.cn:443/v1/chat/completions").id
    ).toBe("moonshot");
    expect(resolveProvider("  https://openrouter.ai/api/v1/chat/completions  ").id).toBe(
      "openrouter"
    );
  });

  test("未知 / 自建 / 中转 / 相似域名一律返回 null", () => {
    for (const baseUrl of UNKNOWN_BASE_URLS) {
      expect(resolveProvider(baseUrl)).toBeNull();
    }
    // 只是看起来像 DeepSeek 的域名不算
    expect(resolveProvider("https://api.deepseek.com.evil.example/chat")).toBeNull();
    expect(resolveProvider("https://notdeepseek.com/v1/chat/completions")).toBeNull();
  });

  test("返回的 profile 与 PROVIDER_PROFILES 中的对象是同一个", () => {
    for (const provider of PROVIDER_IDS) {
      const profile = resolveProvider(PROVIDER_URL[provider]);
      expect(profile).not.toBeNull();
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.defaultModel.length).toBeGreaterThan(0);
      expect(profile.models.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// PROVIDER_PROFILES 与 options/config 的 API_HINTS 一致性（防止两处漂移）
// ---------------------------------------------------------------------------

describe("PROVIDER_PROFILES 与 API_HINTS 一致性", () => {
  test("六家的 apiUrl / defaultModel 逐条一致", () => {
    const hints = API_HINTS.filter((hint) => hint.url);
    expect(hints).toHaveLength(PROVIDER_IDS.length);
    expect(PROVIDER_PROFILES).toHaveLength(hints.length);

    for (const hint of hints) {
      const profile = PROVIDER_PROFILES.find(
        (candidate) => candidate.apiUrl === hint.url
      );
      if (!profile) {
        throw new Error(
          `PROVIDER_PROFILES 缺少与 API_HINTS「${hint.name}」一致的 apiUrl：${hint.url}`
        );
      }
      expect(profile.defaultModel).toBe(hint.defaultModel);
    }
  });

  test("provider id 集合与合同冻结的 ProviderId 一致", () => {
    const ids = PROVIDER_PROFILES.map((profile) => profile.id).sort();
    expect(ids).toEqual(PROVIDER_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("每个 profile 的 apiUrl 都能被 resolveProvider 反查回自己", () => {
    for (const profile of PROVIDER_PROFILES) {
      expect(resolveProvider(profile.apiUrl)?.id).toBe(profile.id);
    }
  });
});

// ---------------------------------------------------------------------------
// buildConnectionTestParams
// ---------------------------------------------------------------------------

describe("buildConnectionTestParams", () => {
  test("除 Kimi 外 temperature 均为 0.1，max_tokens 均为 512", () => {
    for (const provider of PROVIDER_IDS) {
      const params = wire(
        buildConnectionTestParams({
          baseUrl: PROVIDER_URL[provider],
          model: "any-model",
        })
      );

      expect(params.max_tokens).toBe(512);
      if (provider === "moonshot") {
        expect(params).toEqual({ max_tokens: 512 });
        expect("temperature" in params).toBe(false);
      } else {
        expect(params).toEqual({ temperature: 0.1, max_tokens: 512 });
      }
    }
  });

  test("未知 / 自建地址回落 { temperature: 0.1, max_tokens: 512 }", () => {
    for (const baseUrl of UNKNOWN_BASE_URLS) {
      expect(
        buildConnectionTestParams({ baseUrl, model: "any-model" })
      ).toEqual({ temperature: 0.1, max_tokens: 512 });
    }
  });
});
