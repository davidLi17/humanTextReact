import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import SidePanelApp from "../../entrypoints/sidepanel/App";
import type { ChatMessage } from "../../entrypoints/shared/chatTypes";
import { MESSAGE_TYPES } from "../../entrypoints/shared/constants";
import {
  checkChatRequestBudget,
  createAttachedPageMeta,
  selectAttachedPageSegments,
} from "../../entrypoints/shared/pageContext";
import { prepareWebReadingOverviewRequest } from "../../entrypoints/shared/webReadingOverview";
import { JARGON_STORAGE_KEY } from "../../entrypoints/shared/jargonTypes";
import {
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

type Listener = (...args: any[]) => unknown;

interface BrowserMockOptions {
  sessions?: unknown[];
  activeSessionId?: string;
  settings?: Record<string, unknown>;
  /** 模拟当前活动标签页；缺省时 tabs.query 返回空数组，提取链路必然失败 */
  activeTab?: { id: number; url: string; title?: string };
  /** content script 的正文提取响应 */
  tabExtractResponse?: unknown;
  /** 覆盖后台响应，供清理请求等异步边界测试使用。 */
  runtimeSendMessage?: (message: any) => unknown | Promise<unknown>;
  /** 模拟 storage.local.set 的真实失败边界，回调抛错时不写入。 */
  localStorageSet?: (items: Record<string, unknown>) => unknown | Promise<unknown>;
}

function selectStoredValues(
  store: Record<string, unknown>,
  keys: string | string[] | null
) {
  if (keys == null) return structuredClone(store);
  const names = Array.isArray(keys) ? keys : [keys];
  return Object.fromEntries(
    names
      .filter((name) => Object.hasOwn(store, name))
      .map((name) => [name, structuredClone(store[name])])
  );
}

function createBrowserMock(options: BrowserMockOptions = {}) {
  const localStore: Record<string, unknown> = {};
  if (options.sessions) {
    localStore.sidepanel_chat_sessions = structuredClone(options.sessions);
  }
  if (options.activeSessionId) {
    localStore.sidepanel_active_session_id = options.activeSessionId;
  }

  const syncStore: Record<string, unknown> = {
    settings: {
      apiKey: "test-key",
      baseUrl: "https://example.com/chat",
      model: "test-model",
      temperature: 0,
      promptTemplate: "测试提示词",
      thinkingEnabled: false,
      showSelectionToolbar: true,
      contextualSelectionEnabled: false,
      logLevel: "off",
      theme: "light",
      fontScalePercent: 100,
      ...options.settings,
    },
  };
  const runtimeListeners = new Set<Listener>();
  const storageListeners = new Set<Listener>();
  const removedRuntimeListeners: Listener[] = [];
  const removedStorageListeners: Listener[] = [];
  const sentMessages: any[] = [];
  const sentTabMessages: any[] = [];
  const localWrites: Record<string, unknown>[] = [];

  const createStorageArea = (store: Record<string, unknown>, record = false) => ({
    get: async (keys: string | string[] | null) =>
      selectStoredValues(store, keys),
    set: async (items: Record<string, unknown>) => {
      const snapshot = structuredClone(items);
      if (record && options.localStorageSet) {
        await options.localStorageSet(snapshot);
      }
      Object.assign(store, snapshot);
      if (record) localWrites.push(snapshot);
    },
    remove: async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete store[key];
      }
    },
  });

  const browser = {
    runtime: {
      onMessage: {
        addListener(listener: Listener) {
          runtimeListeners.add(listener);
        },
        removeListener(listener: Listener) {
          removedRuntimeListeners.push(listener);
          runtimeListeners.delete(listener);
        },
      },
      async sendMessage(message: any) {
        sentMessages.push(structuredClone(message));
        return options.runtimeSendMessage
          ? await options.runtimeSendMessage(message)
          : { success: true };
      },
      async openOptionsPage() {},
      getManifest: () => ({ version: "1.5.3" }),
    },
    storage: {
      local: createStorageArea(localStore, true),
      sync: createStorageArea(syncStore),
      onChanged: {
        addListener(listener: Listener) {
          storageListeners.add(listener);
        },
        removeListener(listener: Listener) {
          removedStorageListeners.push(listener);
          storageListeners.delete(listener);
        },
      },
    },
    tabs: {
      query: async () =>
        options.activeTab ? [structuredClone(options.activeTab)] : [],
      async sendMessage(tabId: number, message: any) {
        sentTabMessages.push({ tabId, message: structuredClone(message) });
        return (
          options.tabExtractResponse ?? {
            success: false,
            error: "测试未配置 tabExtractResponse",
          }
        );
      },
    },
  };

  return {
    browser,
    localStore,
    localWrites,
    removedRuntimeListeners,
    removedStorageListeners,
    runtimeListeners,
    sentMessages,
    sentTabMessages,
    storageListeners,
    emitRuntimeMessage(message: unknown) {
      for (const listener of [...runtimeListeners]) listener(message);
    },
  };
}

/** 一个「进行中」的会话：已有问答，用于验证通读不再新建会话 */
function createOngoingSession() {
  return {
    id: "ongoing-session",
    title: "进行中的会话",
    createdAt: 100,
    updatedAt: 200,
    messages: [
      {
        id: "m1",
        role: "user",
        content: "之前的问题",
        createdAt: 100,
        status: "completed",
      },
      {
        id: "m2",
        role: "assistant",
        content: "之前的回答",
        createdAt: 200,
        status: "completed",
      },
    ],
  };
}

/** 构造一个能成功提取正文的 browser mock（活动标签页 + 提取响应） */
function createReadablePageMock(
  session: ReturnType<typeof createOngoingSession>,
  content = "这是被附加的网页正文内容，用于验证上下文附加行为是否正确。"
) {
  return createBrowserMock({
    sessions: [session],
    activeSessionId: session.id,
    activeTab: {
      id: 7,
      url: "https://example.com/article",
      title: "示例文章",
    },
    tabExtractResponse: {
      success: true,
      data: {
        title: "示例文章",
        url: "https://example.com/article",
        // 必须长于 MIN_PAGE_CONTENT_CHARS（15），否则会被“内容过短”守卫拦下
        content,
        wordCount: content.length,
      },
    },
  });
}

/** 落盘可能多次，取最近一次「含附加卡片」的会话快照 */
function findAttachedSessions(mock: ReturnType<typeof createBrowserMock>) {
  for (const write of [...mock.localWrites].reverse()) {
    const sessions = write.sidepanel_chat_sessions as any[] | undefined;
    if (
      sessions?.some((session) =>
        session.messages.some(
          (message: any) => message.pageMeta?.contextOnly === true
        )
      )
    ) {
      return sessions;
    }
  }
  return undefined;
}

/** 断言附加结果落进当前会话：不新建会话、不改标题、只多一张正文卡片 */
function expectAttachedToCurrentSession(
  sessions: any[],
  sentMessages: any[]
) {
  expect(sessions).toHaveLength(1);
  expect(sessions[0].id).toBe("ongoing-session");
  expect(sessions[0].title).toBe("进行中的会话");

  const messages = sessions[0].messages;
  // 只追加一张正文卡片，没有助手占位消息
  expect(messages).toHaveLength(3);
  const card = messages.at(-1);
  expect(card.role).toBe("user");
  expect(card.status).toBe("completed");
  expect(card.pageMeta.contextOnly).toBe(true);
  expect(card.pageMeta.sourceContent).toContain("这是被附加的网页正文内容");
  expect(card.pageMeta.attachedPage).toMatchObject({
    version: 1,
    selectedSegments: [1],
  });

  // 全程没有发起模型请求
  expect(
    sentMessages.filter((message) => message.action === MESSAGE_TYPES.TRANSLATE)
  ).toHaveLength(0);
}

function createSegmentedPageContent() {
  const createSegment = (marker: string, filler: string) =>
    marker + filler.repeat(16_000 - marker.length);
  return [
    createSegment("首段唯一标记", "甲"),
    createSegment("中段唯一标记", "乙"),
    createSegment("末段唯一标记如何完成这个季度目标需要明确责任人", "丙"),
  ].join("");
}

function createAttachedPageMessage(content: string) {
  return {
    id: "attached-page",
    role: "user" as const,
    content: "通读网页: 《测试网页》",
    pageMeta: createAttachedPageMeta({
      title: "测试网页",
      url: "https://example.com/article",
      content,
      wordCount: content.length,
    }),
    createdAt: 100,
    status: "completed" as const,
  };
}

function getTranslateMessages(mock: ReturnType<typeof createBrowserMock>) {
  return mock.sentMessages.filter(
    (message) => message.action === MESSAGE_TYPES.TRANSLATE
  );
}

function getAttachedCard(sessions: any[]) {
  return sessions[0].messages.find(
    (message: any) => message.pageMeta?.attachedPage
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createJargonSourceSession() {
  const sourceContext = {
    selectedText: "幂等性",
    paragraph: "支付回调可能重复到达，因此接口需要保证幂等性，避免重复扣款。",
    source: {
      title: "支付接口设计",
      url: "https://docs.example.com/payment/idempotency",
    },
  };
  return {
    sourceContext,
    session: {
      id: "jargon-source-session",
      title: "支付术语",
      createdAt: 100,
      updatedAt: 300,
      messages: [
        {
          id: "jargon-question",
          role: "user" as const,
          content: "幂等性",
          selectionContext: sourceContext,
          createdAt: 100,
          status: "completed" as const,
        },
        {
          id: "jargon-answer",
          role: "assistant" as const,
          content: [
            "## 🍼 直白人话版",
            "同一个请求执行多次，最终效果和执行一次一样。",
            "",
            "## 👔 向上汇报版",
            "通过幂等机制提升资金链路稳健性。",
            "",
            "## 🔪 犀利真相版",
            "别让重试把钱扣两遍。",
          ].join("\n"),
          createdAt: 200,
          status: "completed" as const,
        },
      ],
    },
  };
}

async function openAttachedPageDetails() {
  fireEvent.click(await screen.findByText("预览已保存原文"));
}

function getReadCurrentPageButton() {
  return screen.getByRole("button", {
    name: "通读当前网页",
  });
}

const restoreGlobals = preserveGlobals("browser", "chrome");
let documentRootAttributes: {
  dataTheme: string | null;
  dataThemeMode: string | null;
  style: string | null;
};

beforeEach(() => {
  documentRootAttributes = {
    dataTheme: document.documentElement.getAttribute("data-theme"),
    dataThemeMode: document.documentElement.getAttribute("data-theme-mode"),
    style: document.documentElement.getAttribute("style"),
  };
  document.body.innerHTML = "";
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
  for (const [name, value] of [
    ["data-theme", documentRootAttributes.dataTheme],
    ["data-theme-mode", documentRootAttributes.dataThemeMode],
    ["style", documentRootAttributes.style],
  ] as const) {
    if (value === null) document.documentElement.removeAttribute(name);
    else document.documentElement.setAttribute(name, value);
  }
  restoreGlobals();
});

describe("Sidepanel App 真实 React 交互", () => {
  test("发送输入，只接收当前 requestId 的流式更新，并在 done 后持久化", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(input, { target: { value: "请解释增长飞轮" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    const translateMessage = await waitFor(() => {
      const message = mock.sentMessages.find(
        (item) => item.action === MESSAGE_TYPES.TRANSLATE
      );
      expect(message).toBeDefined();
      return message;
    });
    expect(translateMessage.messages.at(-1)).toMatchObject({
      role: "user",
      content: "请解释增长飞轮",
    });
    expect((await screen.findAllByText("请解释增长飞轮")).length).toBe(2);

    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: `${translateMessage.requestId}-old`,
        sessionId: translateMessage.sessionId,
        content: "旧请求污染内容",
        done: false,
      });
    });
    expect(screen.queryByText("旧请求污染内容")).toBeNull();

    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: translateMessage.requestId,
        sessionId: translateMessage.sessionId,
        content: "第一段流式回答",
        done: false,
      });
    });
    expect(await screen.findByText("第一段流式回答")).toBeTruthy();

    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: translateMessage.requestId,
        sessionId: translateMessage.sessionId,
        content: "最终回答",
        done: true,
      });
    });
    expect(await screen.findByText("最终回答")).toBeTruthy();
    await waitFor(() => {
      const persisted = mock.localWrites.findLast((write) => {
        const sessions = write.sidepanel_chat_sessions as any[] | undefined;
        return sessions?.some((session) =>
          session.messages.some(
            (message: any) =>
              message.role === "assistant" &&
              message.content === "最终回答" &&
              message.status === "completed"
          )
        );
      });
      expect(persisted).toBeDefined();
    });
    expect(screen.getByRole("button", { name: "发送" })).toBeTruthy();
  });

  test("卸载时移除当前 runtime 消息监听", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    const view = render(<SidePanelApp />);
    await screen.findByText("人话翻译与长文通读");
    await waitFor(() => expect(mock.runtimeListeners.size).toBe(1));
    await waitFor(() => expect(mock.storageListeners.size).toBeGreaterThanOrEqual(2));
    const activeListener = [...mock.runtimeListeners][0];
    const storageListenerCount = mock.storageListeners.size;

    view.unmount();

    expect(mock.runtimeListeners.size).toBe(0);
    expect(mock.removedRuntimeListeners).toContain(activeListener);
    expect(mock.removedStorageListeners.length).toBeGreaterThanOrEqual(2);
    expect(mock.storageListeners.size).toBeLessThan(storageListenerCount);
  });

  test("从本地存储恢复已有会话和完成态回答", async () => {
    const restoredSession = {
      id: "restored-session",
      title: "已恢复的会话",
      createdAt: 100,
      updatedAt: 200,
      messages: [
        {
          id: "restored-user",
          role: "user",
          content: "恢复前的问题",
          createdAt: 100,
          status: "completed",
        },
        {
          id: "restored-assistant",
          role: "assistant",
          content: "恢复后的真实回答",
          createdAt: 200,
          status: "completed",
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [restoredSession],
      activeSessionId: restoredSession.id,
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);

    expect(await screen.findByText("恢复前的问题")).toBeTruthy();
    expect(await screen.findByText("恢复后的真实回答")).toBeTruthy();
    expect(screen.getByTitle("已恢复的会话")).toBeTruthy();
  });

  test("已有对话时点通读只把正文附加到当前会话，不新建会话也不发模型请求", async () => {
    const mock = createReadablePageMock(createOngoingSession());
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    // 会话文本出现即代表水合已完成，handleReadCurrentPage 的水合前置守卫才会放行
    await screen.findByText("之前的问题");

    fireEvent.click(getReadCurrentPageButton());

    await waitFor(() => expect(findAttachedSessions(mock)).toBeDefined());
    expectAttachedToCurrentSession(
      findAttachedSessions(mock)!,
      mock.sentMessages
    );
  });

  test("右键菜单的 READ_WEB_PAGE 消息能触发通读，并清掉待办键", async () => {
    const mock = createReadablePageMock(createOngoingSession());
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    await screen.findByText("之前的问题");
    await waitFor(() => expect(mock.runtimeListeners.size).toBe(1));

    // 侧边栏已打开时，storage 通道的领取门闩早已置位、effect 也不会重跑，
    // 唯一的通路就是后台右键菜单发出的这条 runtime 消息。
    // （此前 action 名写成 "readCurrentWebPage"，与常量不匹配，消息被静默丢弃）
    mock.localStore.pendingWebPageRead = { timestamp: Date.now(), tabId: 7 };
    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.READ_WEB_PAGE,
        tabId: 7,
      });
    });

    await waitFor(() => expect(findAttachedSessions(mock)).toBeDefined());
    expectAttachedToCurrentSession(
      findAttachedSessions(mock)!,
      mock.sentMessages
    );
    // 消费后清掉待办，避免新鲜度窗口内重载侧边栏被 storage 通道重复触发
    expect(mock.localStore.pendingWebPageRead).toBeUndefined();
  });

  test("长网页附加后可选择后续段落，选择本身不发起模型请求", async () => {
    const mock = createReadablePageMock(
      createOngoingSession(),
      createSegmentedPageContent()
    );
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    await screen.findByText("之前的问题");
    fireEvent.click(getReadCurrentPageButton());

    await waitFor(() => expect(findAttachedSessions(mock)).toBeDefined());
    const attachedSessions = findAttachedSessions(mock)!;
    const card = getAttachedCard(attachedSessions);
    expect(card.pageMeta.attachedPage).toMatchObject({
      content: createSegmentedPageContent(),
      selectedSegments: [1],
    });

    await openAttachedPageDetails();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "第 3 段参与回答" })
    );

    await waitFor(() => {
      const saved = findAttachedSessions(mock);
      expect(getAttachedCard(saved!).pageMeta.attachedPage.selectedSegments).toEqual([
        1,
        3,
      ]);
    });
    expect(getTranslateMessages(mock)).toHaveLength(0);
  });

  test("重新挂载后保留选择的末段，并在追问请求中带入末段原文", async () => {
    const pageContent = createSegmentedPageContent();
    const mock = createReadablePageMock(createOngoingSession(), pageContent);
    setTestGlobal("browser", mock.browser);

    const view = render(<SidePanelApp />);
    await screen.findByText("之前的问题");
    fireEvent.click(getReadCurrentPageButton());
    await waitFor(() => expect(findAttachedSessions(mock)).toBeDefined());
    await openAttachedPageDetails();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "第 1 段参与回答" })
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "第 3 段参与回答" })
    );
    await waitFor(() => {
      expect(
        getAttachedCard(findAttachedSessions(mock)!).pageMeta.attachedPage
          .selectedSegments
      ).toEqual([3]);
    });

    view.unmount();
    render(<SidePanelApp />);
    await screen.findByText("之前的问题");
    await openAttachedPageDetails();
    expect(
      (screen.getByRole("checkbox", {
        name: "第 3 段参与回答",
      }) as HTMLInputElement).checked
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", {
        name: "第 1 段参与回答",
      }) as HTMLInputElement).checked
    ).toBe(false);

    const question = "请根据最后一段给出建议";
    fireEvent.change(
      screen.getByPlaceholderText(/输入追问、黑话术语或指令/),
      { target: { value: question } }
    );
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    const request = await waitFor(() => {
      const messages = getTranslateMessages(mock);
      expect(messages).toHaveLength(1);
      return messages[0];
    });
    const payloadText = JSON.stringify(request.messages);
    expect(payloadText).toContain("末段唯一标记");
    expect(payloadText).not.toContain("首段唯一标记");
    expect(request.messages.at(-1)).toMatchObject({
      role: "user",
      content: question,
    });
  });

  test("按目标提取只发送冻结末段，核实依据可查看且伪造引文不产生入口", async () => {
    const pageContent = createSegmentedPageContent();
    const mock = createReadablePageMock(createOngoingSession(), pageContent);
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    await screen.findByText("之前的问题");
    fireEvent.click(getReadCurrentPageButton());
    await waitFor(() => expect(findAttachedSessions(mock)).toBeDefined());
    await openAttachedPageDetails();
    fireEvent.click(screen.getByRole("checkbox", { name: "第 1 段参与回答" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "第 3 段参与回答" }));
    await waitFor(() => {
      expect(
        getAttachedCard(findAttachedSessions(mock)!).pageMeta.attachedPage
          .selectedSegments
      ).toEqual([3]);
    });

    const goal = "找出对当前交付最有用的一项行动";
    fireEvent.change(screen.getByLabelText("这次想解决什么问题？"), {
      target: { value: goal },
    });
    fireEvent.click(screen.getByRole("button", { name: "提取对我有用的信息" }));
    const request = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    expect(request.prismMode).toBe(false);
    expect(request.bypassJargonVault).toBe(true);
    expect(request.messages).toHaveLength(2);
    const requestText = JSON.stringify(request.messages);
    expect(requestText).toContain(goal);
    expect(requestText).toContain("末段唯一标记");
    expect(requestText).not.toContain("首段唯一标记");
    expect(request.messages[0].content).toContain("human-text-evidence:v1");
    expect(request.messages[1].content).toContain("【用户目标】");
    expect(request.messages[1].content).toContain("【本次冻结的已选原文】");

    const storedAfterRequest = mock.localStore.sidepanel_chat_sessions as any[];
    const groundedUser = storedAfterRequest[0].messages.at(-2);
    const sourcePage = storedAfterRequest[0].messages.find(
      (message: any) => message.pageMeta?.attachedPage
    );
    expect(groundedUser).toMatchObject({
      role: "user",
      groundedGoalMeta: expect.objectContaining({
        version: 1,
        goal,
        sourcePageMessageId: sourcePage.id,
        sourceSnapshotFingerprint: expect.any(String),
        selectedSegments: [expect.objectContaining({ index: 3, start: 32_000, end: 48_000 })],
      }),
    });

    const validQuote = "如何完成这个季度目标需要明确责任人";
    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: request.requestId,
        sessionId: request.sessionId,
        content: [
          "建议先围绕末段提到的唯一标记做验证。[依据:E1]",
          "",
          "<!-- human-text-evidence:v1",
          JSON.stringify({
            citations: [
              { id: "E1", segmentIndex: 3, quote: validQuote },
              { id: "E2", segmentIndex: 1, quote: "首段唯一标记甲甲甲甲" },
            ],
          }),
          "-->",
        ].join("\n"),
        done: true,
      });
    });
    await screen.findByText(/原文依据/);
    expect(screen.getByRole("button", { name: "查看第 3 段原文" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "查看第 1 段原文" })).toBeNull();
    expect(screen.queryByText(/human-text-evidence:v1/)).toBeNull();
    expect(
      Array.from(document.querySelectorAll(".suggested-pill-btn")).some((button) =>
        button.textContent?.includes(validQuote)
      )
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "查看第 3 段原文" }));
    expect(document.querySelector("mark")?.textContent).toBe(validQuote);
  });

  test("目标提取失败后改勾选范围，重试仍使用首次冻结的末段", async () => {
    const mock = createReadablePageMock(
      createOngoingSession(),
      createSegmentedPageContent()
    );
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);
    await screen.findByText("之前的问题");
    fireEvent.click(getReadCurrentPageButton());
    await waitFor(() => expect(findAttachedSessions(mock)).toBeDefined());
    await openAttachedPageDetails();
    fireEvent.click(screen.getByRole("checkbox", { name: "第 1 段参与回答" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "第 3 段参与回答" }));
    await waitFor(() => expect(getAttachedCard(findAttachedSessions(mock)!).pageMeta.attachedPage.selectedSegments).toEqual([3]));

    fireEvent.change(screen.getByLabelText("这次想解决什么问题？"), {
      target: { value: "只分析最后一段" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提取对我有用的信息" }));
    const firstRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: firstRequest.requestId,
        sessionId: firstRequest.sessionId,
        error: "本地模型故障",
        done: true,
      });
    });
    await screen.findByText("本地模型故障");
    fireEvent.click(screen.getByRole("checkbox", { name: "第 3 段参与回答" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "第 2 段参与回答" }));
    await waitFor(() => expect(getAttachedCard(findAttachedSessions(mock)!).pageMeta.attachedPage.selectedSegments).toEqual([2]));

    fireEvent.click(screen.getByTitle("重试生成"));
    const retryRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(2);
      return requests[1];
    });
    const retryText = JSON.stringify(retryRequest.messages);
    expect(retryText).toContain("末段唯一标记");
    expect(retryText).not.toContain("中段唯一标记");
    expect(retryRequest.prismMode).toBe(false);
    expect(retryRequest.bypassJargonVault).toBe(true);
  });

  test("目标提取超过预算时保留目标和旧消息，不创建空回答", async () => {
    const attached = createAttachedPageMessage(createSegmentedPageContent());
    attached.pageMeta = selectAttachedPageSegments(attached.pageMeta, [1, 2, 3]);
    const session = {
      id: "grounded-budget-session",
      title: "目标提取预算测试",
      createdAt: 100,
      updatedAt: 200,
      messages: [
        attached,
        {
          id: "old-question",
          role: "user" as const,
          content: "已经存在的问题",
          createdAt: 110,
          status: "completed" as const,
        },
        {
          id: "old-answer",
          role: "assistant" as const,
          content: "已经存在的回答",
          createdAt: 120,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);
    await screen.findByText("已经存在的回答");

    const goalInput = screen.getByLabelText("这次想解决什么问题？") as HTMLTextAreaElement;
    fireEvent.change(goalInput, { target: { value: "这条目标草稿不能被清空" } });
    fireEvent.click(screen.getByRole("button", { name: "提取对我有用的信息" }));

    expect(
      (await screen.findAllByText(/超过 48000 个字符的保守上限/)).length
    ).toBeGreaterThan(0);
    expect(goalInput.value).toBe("这条目标草稿不能被清空");
    expect(getTranslateMessages(mock)).toHaveLength(0);
    const stored = mock.localStore.sidepanel_chat_sessions as any[];
    expect(stored[0].messages.map((message: any) => message.id)).toEqual(
      session.messages.map((message) => message.id)
    );
  });

  test("超过请求预算时保留草稿与原会话，不发送模型请求", async () => {
    const pageContent = "网页背景唯一标记" + "甲".repeat(15_900);
    const attachedPage = createAttachedPageMessage(pageContent);
    const session = {
      id: "budget-session",
      title: "预算测试会话",
      createdAt: 100,
      updatedAt: 200,
      messages: [
        attachedPage,
        {
          id: "long-history",
          role: "user" as const,
          content: "历史内容".repeat(12_500),
          createdAt: 200,
          status: "completed" as const,
        },
        {
          id: "history-answer",
          role: "assistant" as const,
          content: "历史回答",
          createdAt: 201,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    await screen.findByText("预算测试会话");
    const input = screen.getByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(input, { target: { value: "这条草稿不能被清空" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(
      (await screen.findAllByText(/超过 48000 个字符的保守上限/)).length
    ).toBeGreaterThan(0);
    expect((input as HTMLTextAreaElement).value).toBe("这条草稿不能被清空");
    expect(getTranslateMessages(mock)).toHaveLength(0);
    const stored = mock.localStore.sidepanel_chat_sessions as any[];
    expect(stored).toHaveLength(1);
    expect(stored[0].messages.map((message: any) => message.id)).toEqual(
      session.messages.map((message) => message.id)
    );
  });

  test("棱镜模式把全文总览推过预算时不创建消息，也不发送请求", async () => {
    const runId = "prism-overview-run";
    const baseMessages: ChatMessage[] = [
      {
        id: "overview-source",
        role: "user",
        content: "第 1 段",
        pageMeta: {
          title: "棱镜预算网页",
          url: "https://example.com/prism-overview",
          isWebPageReading: true,
          readingRunId: runId,
          segmentIndex: 1,
          totalSegments: 1,
          sourceContent: "网页原文",
        },
        createdAt: 100,
        status: "completed",
      },
      {
        id: "overview-answer",
        role: "assistant",
        content: "x",
        createdAt: 101,
        status: "completed",
      },
    ];
    const baseRequest = prepareWebReadingOverviewRequest(baseMessages, runId);
    expect(baseRequest.success).toBe(true);
    if (!baseRequest.success) throw new Error("总览夹具应当可生成请求");
    const staticChars = baseRequest.inputChars - 1;
    const messages: ChatMessage[] = [
      baseMessages[0],
      {
        ...baseMessages[1],
        content: "甲".repeat(47_900 - staticChars),
      },
    ];
    const prepared = prepareWebReadingOverviewRequest(messages, runId);
    expect(prepared.success).toBe(true);
    if (!prepared.success) throw new Error("接近上限的总览应通过原始校验");
    expect(prepared.inputChars).toBe(47_900);
    expect(
      checkChatRequestBudget(prepared.messages, {
        systemPrompt: "测试提示词",
        prismMode: true,
      }).ok
    ).toBe(false);

    const session = {
      id: "prism-overview-session",
      title: "棱镜总览预算",
      createdAt: 100,
      updatedAt: 101,
      messages,
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
      settings: { prismModeEnabled: true },
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const overviewButton = await screen.findByRole("button", {
      name: "生成全文总览",
    });
    fireEvent.click(overviewButton);
    expect(
      (await screen.findAllByText(/超过 48000 个字符的保守上限/)).length
    ).toBeGreaterThan(0);
    expect(getTranslateMessages(mock)).toHaveLength(0);
    expect(
      (mock.localStore.sidepanel_chat_sessions as any[])[0].messages.map(
        (message: any) => message.id
      )
    ).toEqual(messages.map((message) => message.id));

    fireEvent.click(overviewButton);
    await waitFor(() => expect(getTranslateMessages(mock)).toHaveLength(0));
  });

  test("编辑与重新生成普通问题时都会带入已选网页原文", async () => {
    const pageContent = "编辑重试网页原文唯一标记" + "甲".repeat(3_000);
    const attachedPage = createAttachedPageMessage(pageContent);
    const session = {
      id: "edit-retry-session",
      title: "编辑重试测试",
      createdAt: 100,
      updatedAt: 300,
      messages: [
        attachedPage,
        {
          id: "ordinary-question",
          role: "user" as const,
          content: "原来的普通问题",
          createdAt: 200,
          status: "completed" as const,
        },
        {
          id: "ordinary-answer",
          role: "assistant" as const,
          content: "原来的普通回答",
          createdAt: 300,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    await screen.findByText("原来的普通问题");
    fireEvent.click(screen.getAllByTitle("编辑消息").at(-1)!);
    const editor = await screen.findByPlaceholderText("输入修改后的消息...");
    fireEvent.change(editor, { target: { value: "编辑后的普通问题" } });
    fireEvent.click(screen.getByRole("button", { name: "保存并重新发送" }));

    const editedRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    expect(JSON.stringify(editedRequest.messages)).toContain(pageContent);
    expect(JSON.stringify(editedRequest.messages)).toContain("编辑后的普通问题");

    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: editedRequest.requestId,
        sessionId: editedRequest.sessionId,
        content: "编辑后的回答",
        done: true,
      });
    });
    expect(await screen.findByText("编辑后的回答")).toBeTruthy();
    fireEvent.click(await screen.findByTitle("重新生成回答"));

    const retryRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(2);
      return requests[1];
    });
    expect(JSON.stringify(retryRequest.messages)).toContain(pageContent);
    expect(JSON.stringify(retryRequest.messages)).toContain("编辑后的普通问题");
  });

  test("导入的损坏目标提取元数据仍按普通用户消息显示编辑入口", async () => {
    const session = {
      id: "invalid-grounded-meta-session",
      title: "损坏目标元数据",
      createdAt: 100,
      updatedAt: 200,
      messages: [
        {
          id: "invalid-grounded-user",
          role: "user" as const,
          content: "这是一条仍应可编辑的普通问题",
          groundedGoalMeta: {} as never,
          createdAt: 100,
          status: "completed" as const,
        },
        {
          id: "invalid-grounded-answer",
          role: "assistant" as const,
          content: "这是一条普通回答",
          createdAt: 200,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);

    await screen.findByText("这是一条仍应可编辑的普通问题");
    fireEvent.click(screen.getByTitle("编辑消息"));
    expect(await screen.findByPlaceholderText("输入修改后的消息...")).toBeTruthy();
  });

  test("立即发送等待 CLEANUP 时拒绝并发普通发送，并保留期间写入的新草稿", async () => {
    const cleanup = createDeferred<{ success: true }>();
    const mock = createBrowserMock({
      runtimeSendMessage(message) {
        if (message.action === MESSAGE_TYPES.CLEANUP) return cleanup.promise;
        return { success: true };
      },
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(input, { target: { value: "正在生成的原问题" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(getTranslateMessages(mock)).toHaveLength(1));

    fireEvent.change(input, { target: { value: "后续队列题" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await screen.findByText("后续队列题");

    fireEvent.change(input, { target: { value: "优先题" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    await waitFor(() => {
      expect(
        mock.sentMessages.filter(
          (message) => message.action === MESSAGE_TYPES.CLEANUP
        )
      ).toHaveLength(1);
    });
    expect(getTranslateMessages(mock)).toHaveLength(1);
    const draftWrittenDuringCleanup = "清理等待期间的新草稿";
    fireEvent.change(input, { target: { value: draftWrittenDuringCleanup } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    expect(getTranslateMessages(mock)).toHaveLength(1);
    expect((input as HTMLTextAreaElement).value).toBe(draftWrittenDuringCleanup);

    await act(async () => {
      cleanup.resolve({ success: true });
      await cleanup.promise;
    });
    await waitFor(() => {
      const translations = getTranslateMessages(mock);
      expect(translations).toHaveLength(2);
      expect(translations[1].messages.at(-1)).toMatchObject({
        role: "user",
        content: "优先题",
      });
    });
    expect((input as HTMLTextAreaElement).value).toBe(draftWrittenDuringCleanup);
    const remainingQueue = screen.getByRole("region", {
      name: "排队中的提示词队列",
    });
    expect(remainingQueue.textContent).toContain("后续队列题");
    expect(remainingQueue.textContent).not.toContain("优先题");
  });

  test("超限的立即发送保留草稿，且不向原请求发 CLEANUP", async () => {
    const session = {
      id: "immediate-budget-session",
      title: "立即发送预算测试",
      createdAt: 100,
      updatedAt: 100,
      messages: [
        {
          id: "near-budget-history",
          role: "user" as const,
          content: "历史内容".repeat(11_950),
          createdAt: 100,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    await screen.findByText("立即发送预算测试");
    const input = screen.getByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(input, { target: { value: "原请求" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(getTranslateMessages(mock)).toHaveLength(1));

    const immediateDraft = "立即发送但超过预算".repeat(80);
    fireEvent.change(input, { target: { value: immediateDraft } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(
      (await screen.findAllByText(/超过 48000 个字符的保守上限/)).length
    ).toBeGreaterThan(0);
    expect((input as HTMLTextAreaElement).value).toBe(immediateDraft);
    expect(getTranslateMessages(mock)).toHaveLength(1);
    expect(
      mock.sentMessages.filter(
        (message) => message.action === MESSAGE_TYPES.CLEANUP
      )
    ).toHaveLength(0);
  });

  test("清空 A 队列不影响 B，切回 B 后自动派发其队首", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(input, { target: { value: "A 会话原问题" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    const aRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    fireEvent.change(input, { target: { value: "A 待清空一" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await screen.findByText("A 待清空一");
    fireEvent.change(input, { target: { value: "A 待清空二" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    fireEvent.click(screen.getByTitle("新建对话"));
    await screen.findByText("人话翻译与长文通读");
    fireEvent.change(input, { target: { value: "B 会话原问题" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    const bRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(2);
      return requests[1];
    });
    fireEvent.change(input, { target: { value: "B 待保留题" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await screen.findByText("B 待保留题");

    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    const aDrawerItem = screen
      .getAllByTitle("A 会话原问题")
      .find((element) => element.closest(".drawer-item"))
      ?.closest(".drawer-item") as HTMLElement | undefined;
    expect(aDrawerItem).toBeDefined();
    fireEvent.click(aDrawerItem!);
    fireEvent.click(await screen.findByTitle(/查看更多 1 条排队中的问题/));
    fireEvent.click(screen.getByTitle("清空所有排队问题"));
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "排队中的提示词队列" })
      ).toBeNull()
    );

    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: bRequest.requestId,
        sessionId: bRequest.sessionId,
        content: "B 的原问题完成",
        done: true,
      });
    });
    expect(getTranslateMessages(mock)).toHaveLength(2);

    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    const bDrawerItem = screen
      .getAllByTitle("B 会话原问题")
      .find((element) => element.closest(".drawer-item"))
      ?.closest(".drawer-item") as HTMLElement | undefined;
    expect(bDrawerItem).toBeDefined();
    fireEvent.click(bDrawerItem!);
    const bQueuedRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(3);
      return requests[2];
    });
    expect(bQueuedRequest.sessionId).toBe(bRequest.sessionId);
    expect(bQueuedRequest.sessionId).not.toBe(aRequest.sessionId);
    expect(bQueuedRequest.messages.at(-1)).toMatchObject({
      role: "user",
      content: "B 待保留题",
    });
  });

  test("队列只属于创建它的会话，切换与删除都不会把题目路由到其他会话", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(input, { target: { value: "A 会话的原请求" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    const aRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });

    fireEvent.change(input, { target: { value: "A 会话优先题" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await screen.findByText("A 会话优先题");

    fireEvent.click(screen.getByTitle("新建对话"));
    await screen.findByText("人话翻译与长文通读");
    expect(
      screen.queryByRole("region", { name: "排队中的提示词队列" })
    ).toBeNull();
    expect((input as HTMLTextAreaElement).value).toBe("");
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    await waitFor(() => {
      expect(getTranslateMessages(mock)).toHaveLength(1);
      expect(
        getTranslateMessages(mock).filter(
          (message) => message.sessionId !== aRequest.sessionId
        )
      ).toHaveLength(0);
    });

    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    const aDrawerItem = screen
      .getAllByTitle("A 会话的原请求")
      .find((element) => element.closest(".drawer-item"))
      ?.closest(".drawer-item") as HTMLElement | undefined;
    expect(aDrawerItem).toBeDefined();
    fireEvent.click(aDrawerItem!);
    await screen.findByText("A 会话优先题");
    const promotedRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(2);
      return requests[1];
    });
    expect(promotedRequest.sessionId).toBe(aRequest.sessionId);
    expect(promotedRequest.messages.at(-1)).toMatchObject({
      role: "user",
      content: "A 会话优先题",
    });

    fireEvent.change(input, { target: { value: "A 会话待清除题" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await screen.findByText("A 会话待清除题");
    expect(screen.getByText("A 会话待清除题")).toBeTruthy();

    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    fireEvent.click(screen.getByTitle("删除会话"));
    await screen.findByText("人话翻译与长文通读");
    expect(
      screen.queryByRole("region", { name: "排队中的提示词队列" })
    ).toBeNull();
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    await waitFor(() => {
      expect(getTranslateMessages(mock)).toHaveLength(2);
      expect(
        getTranslateMessages(mock).some(
          (message) =>
            message.sessionId !== aRequest.sessionId &&
            message.messages.at(-1)?.content === "A 会话待清除题"
        )
      ).toBe(false);
    });
  });

  test("搜索旧回答命中后激活目标会话并高亮消息，同时保留原会话草稿", async () => {
    const sessions = [
      {
        id: "search-session-a",
        title: "A 会话标题",
        createdAt: 100,
        updatedAt: 300,
        messages: [
          {
            id: "a-question",
            role: "user" as const,
            content: "A 的问题",
            createdAt: 100,
            status: "completed" as const,
          },
          {
            id: "a-answer",
            role: "assistant" as const,
            content: "A 的回答",
            createdAt: 200,
            status: "completed" as const,
          },
        ],
      },
      {
        id: "search-session-b",
        title: "B 会话标题",
        createdAt: 200,
        updatedAt: 400,
        messages: [
          ...Array.from({ length: 6 }, (_, index) => ({
            id: `b-filler-${index}`,
            role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
            content: `B 的历史消息 ${index}`,
            createdAt: 210 + index,
            status: "completed" as const,
          })),
          {
            id: "target-old-answer",
            role: "assistant" as const,
            content: "旧回答里保留了 session-search-target 这个关键词。",
            createdAt: 300,
            status: "completed" as const,
          },
        ],
      },
    ];
    const mock = createBrowserMock({
      sessions,
      activeSessionId: "search-session-a",
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(input, { target: { value: "A 会话的未发送草稿" } });
    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));

    const searchInput = await screen.findByTestId("session-search-input");
    fireEvent.change(searchInput, { target: { value: "session-search-target" } });
    const result = await screen.findByTestId("session-search-result");
    expect(result.getAttribute("data-session-id")).toBe("search-session-b");
    expect(result.getAttribute("data-message-id")).toBe("target-old-answer");
    fireEvent.click(result);

    await waitFor(() => {
      expect(screen.queryByTestId("session-search-input")).toBeNull();
    });
    await screen.findByText("旧回答里保留了 session-search-target 这个关键词。", {
      exact: true,
    });
    await waitFor(() => {
      expect(
        document.querySelector(
          '[data-message-id="target-old-answer"][data-search-highlighted="true"]'
        )
      ).toBeTruthy();
    });
    expect(getTranslateMessages(mock)).toHaveLength(0);

    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    await screen.findByTestId("session-search-input");
    let aDrawerItem: HTMLElement | undefined;
    await waitFor(() => {
      aDrawerItem = screen
        .getAllByTitle("A 会话标题")
        .find((element) => element.closest(".drawer-item"))
        ?.closest(".drawer-item") as HTMLElement | undefined;
      expect(aDrawerItem).toBeDefined();
    });
    expect(aDrawerItem).toBeDefined();
    fireEvent.click(aDrawerItem!);
    expect(
      ((await screen.findByPlaceholderText(
        /输入追问、黑话术语或指令/
      )) as HTMLTextAreaElement).value
    ).toBe("A 会话的未发送草稿");
  });

  test("会话搜索无结果时显示提示，清空查询后恢复会话列表且不请求模型", async () => {
    const session = {
      id: "search-empty-session",
      title: "可恢复的会话",
      createdAt: 100,
      updatedAt: 100,
      messages: [
        {
          id: "search-empty-message",
          role: "user" as const,
          content: "一条历史问题",
          createdAt: 100,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    const searchInput = await screen.findByTestId("session-search-input");
    fireEvent.change(searchInput, { target: { value: "完全不存在的关键词" } });
    expect(await screen.findByText(/没有找到|暂无.*结果/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("session-search-clear"));
    await waitFor(() => {
      expect(
        screen
          .getAllByTitle("可恢复的会话")
          .some((element) => element.closest(".drawer-item"))
      ).toBe(true);
    });
    expect(getTranslateMessages(mock)).toHaveLength(0);
  });

  test("侧栏收藏预填选区来源与直白解释，编辑后写入生词本", async () => {
    const { session, sourceContext } = createJargonSourceSession();
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    fireEvent.click(await screen.findByTitle("存入黑话生词本"));

    expect(await screen.findByRole("dialog", { name: "保存到生词本" })).toBeTruthy();
    expect((screen.getByLabelText("术语") as HTMLInputElement).value).toBe("幂等性");
    expect((screen.getByLabelText("人话释义") as HTMLTextAreaElement).value).toBe(
      "同一个请求执行多次，最终效果和执行一次一样。"
    );
    expect(screen.queryByDisplayValue(/资金链路稳健性/)).toBeNull();
    expect((screen.getByLabelText("原句或提问") as HTMLTextAreaElement).value).toBe(
      sourceContext.paragraph
    );
    expect((screen.getByLabelText("来源链接") as HTMLInputElement).value).toBe(
      sourceContext.source.url
    );

    fireEvent.change(screen.getByLabelText("术语"), {
      target: { value: "支付幂等" },
    });
    fireEvent.change(screen.getByLabelText("人话释义"), {
      target: { value: "重复请求只产生一次扣款结果。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存到生词本" }));

    await waitFor(() => {
      expect((mock.localStore[JARGON_STORAGE_KEY] as any[])?.[0]?.term).toBe(
        "支付幂等"
      );
    });
    const saved = (mock.localStore[JARGON_STORAGE_KEY] as any[])[0];
    expect(saved).toMatchObject({
      term: "支付幂等",
      explanation: "重复请求只产生一次扣款结果。",
      sourceContext: sourceContext.paragraph,
      sourceUrl: sourceContext.source.url,
      isStarred: true,
    });
    expect(getTranslateMessages(mock)).toHaveLength(0);
  });

  test("取消收藏不写存储，保存失败时保留已编辑内容并可重试", async () => {
    const { session } = createJargonSourceSession();
    let failJargonWrite = false;
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
      localStorageSet(items) {
        if (failJargonWrite && Object.hasOwn(items, JARGON_STORAGE_KEY)) {
          throw new Error("测试存储写入失败");
        }
      },
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const openSaveDialog = async () => {
      fireEvent.click(await screen.findByTitle("存入黑话生词本"));
      await screen.findByRole("dialog", { name: "保存到生词本" });
    };

    await openSaveDialog();
    fireEvent.change(screen.getByLabelText("术语"), {
      target: { value: "不应保存的术语" },
    });
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(mock.localStore[JARGON_STORAGE_KEY]).toBeUndefined();

    await openSaveDialog();
    fireEvent.change(screen.getByLabelText("术语"), {
      target: { value: "失败后仍保留" },
    });
    fireEvent.change(screen.getByLabelText("人话释义"), {
      target: { value: "这段编辑不能因存储失败而消失。" },
    });
    failJargonWrite = true;
    fireEvent.click(screen.getByRole("button", { name: "保存到生词本" }));

    expect(await screen.findByText("测试存储写入失败")).toBeTruthy();
    expect((screen.getByLabelText("术语") as HTMLInputElement).value).toBe(
      "失败后仍保留"
    );
    expect((screen.getByLabelText("人话释义") as HTMLTextAreaElement).value).toBe(
      "这段编辑不能因存储失败而消失。"
    );
    expect(mock.localStore[JARGON_STORAGE_KEY]).toBeUndefined();

    failJargonWrite = false;
    fireEvent.click(screen.getByRole("button", { name: "保存到生词本" }));
    await waitFor(() => {
      expect((mock.localStore[JARGON_STORAGE_KEY] as any[])?.[0]?.term).toBe(
        "失败后仍保留"
      );
    });
  });

  test("生词本继续问创建新会话并预填完整上下文，主动发送前不请求模型", async () => {
    const originalSession = createOngoingSession();
    const mock = createBrowserMock({
      sessions: [originalSession],
      activeSessionId: originalSession.id,
    });
    const jargonItem = {
      id: "saved-jargon",
      term: "幂等性",
      explanation: "同一个请求重复执行，结果保持一致。",
      sourceContext: "支付回调重试时必须保证幂等性。",
      sourceUrl: "https://docs.example.com/idempotency",
      category: "通用",
      tags: ["接口"],
      isStarred: true,
      createdAt: 100,
      updatedAt: 100,
    };
    mock.localStore[JARGON_STORAGE_KEY] = [jargonItem];
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const composer = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);
    fireEvent.change(composer, { target: { value: "原会话未发送草稿" } });
    fireEvent.click(screen.getByRole("button", { name: "切换到生词本" }));

    expect(await screen.findByText(jargonItem.sourceContext, { exact: true })).toBeTruthy();
    expect(screen.getByTitle("查看原文").getAttribute("href")).toBe(
      jargonItem.sourceUrl
    );
    fireEvent.click(screen.getByTitle("继续问"));

    const followUpDraft = (await screen.findByPlaceholderText(
      /输入追问、黑话术语或指令/
    )) as HTMLTextAreaElement;
    expect(followUpDraft.value).toContain(`术语：${jargonItem.term}`);
    expect(followUpDraft.value).toContain(`人话释义：${jargonItem.explanation}`);
    expect(followUpDraft.value).toContain(`原句或提问：${jargonItem.sourceContext}`);
    expect(followUpDraft.value).toContain(`来源链接：${jargonItem.sourceUrl}`);
    const expectedFollowUpDraft = followUpDraft.value;
    expect(getTranslateMessages(mock)).toHaveLength(0);

    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    const originalDrawerItem = screen
      .getAllByTitle(originalSession.title)
      .find((element) => element.closest(".drawer-item"))
      ?.closest(".drawer-item") as HTMLElement;
    fireEvent.click(originalDrawerItem);
    await waitFor(() => {
      expect(
        (
          screen.getByPlaceholderText(
            /输入追问、黑话术语或指令/
          ) as HTMLTextAreaElement
        ).value
      ).toBe("原会话未发送草稿");
    });

    fireEvent.click(screen.getByTitle("会话与生词本抽屉"));
    const newDrawerItem = Array.from(
      document.querySelectorAll<HTMLElement>(".drawer-item")
    ).find(
      (element) =>
        element.querySelector(".item-title")?.textContent?.trim() === "新对话"
    );
    if (!newDrawerItem) throw new Error("未找到继续问新建的会话");
    fireEvent.click(newDrawerItem);
    await waitFor(() => {
      expect(
        (
          screen.getByPlaceholderText(
            /输入追问、黑话术语或指令/
          ) as HTMLTextAreaElement
        ).value
      ).toBe(expectedFollowUpDraft);
    });
    expect(getTranslateMessages(mock)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    const [request] = getTranslateMessages(mock);
    expect(request.messages.at(-1).content).toContain(`术语：${jargonItem.term}`);
    expect(request.messages.at(-1).content).toContain(jargonItem.explanation);
    expect(request.messages.at(-1).content).toContain(jargonItem.sourceContext);
    expect(request.messages.at(-1).content).toContain(jargonItem.sourceUrl);
  });

  test("回答补讲保留旧回答，沿用网页上下文并固定关闭棱镜", async () => {
    const attached = createAttachedPageMessage(
      "补讲需要沿用的网页正文唯一标记" + "甲".repeat(80)
    );
    const session = {
      id: "refinement-session",
      title: "补讲测试",
      createdAt: 100,
      updatedAt: 300,
      messages: [
        attached,
        {
          id: "refinement-user",
          role: "user" as const,
          content: "解释这段内容",
          createdAt: 200,
          status: "completed" as const,
        },
        {
          id: "refinement-answer",
          role: "assistant" as const,
          content: "这是原回答，请换一种方式说明。",
          createdAt: 300,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
      settings: { prismModeEnabled: true },
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    await screen.findByText("这是原回答，请换一种方式说明。");
    fireEvent.click(screen.getByRole("button", { name: "这里没看懂" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "再白一点" }));

    const request = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    expect(request.prismMode).toBe(false);
    expect(request.bypassJargonVault).toBe(true);
    expect(request.messages.at(-1).content).toContain(
      "这是原回答，请换一种方式说明。"
    );
    expect(
      request.messages.some((message: any) =>
        String(message.content).includes("补讲需要沿用的网页正文唯一标记")
      )
    ).toBe(true);
    expect(
      (mock.localStore.sidepanel_chat_sessions as any[])[0].messages.some(
        (message: any) => message.id === "refinement-answer"
      )
    ).toBe(true);
  });

  test("补讲选区只接受同一回答，跨回答时回退当前回答片段", async () => {
    const session = {
      id: "refinement-selection-session",
      title: "补讲选区测试",
      createdAt: 100,
      updatedAt: 400,
      messages: [
        {
          id: "q1",
          role: "user" as const,
          content: "问题一",
          createdAt: 100,
          status: "completed" as const,
        },
        {
          id: "a1",
          role: "assistant" as const,
          content: "第一个回答片段",
          createdAt: 200,
          status: "completed" as const,
        },
        {
          id: "q2",
          role: "user" as const,
          content: "问题二",
          createdAt: 300,
          status: "completed" as const,
        },
        {
          id: "a2",
          role: "assistant" as const,
          content: "第二个回答应该被引用",
          createdAt: 400,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);
    await screen.findByText("第二个回答应该被引用");

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-message-id]")
    );
    const firstAnswer = rows.find((row) => row.dataset.messageId === "a1");
    if (!firstAnswer) throw new Error("未找到第一个回答气泡");
    const range = document.createRange();
    range.selectNodeContents(firstAnswer);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.mouseUp(document.querySelector(".chat-content")!);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const actions = screen.getAllByRole("button", { name: "这里没看懂" });
    fireEvent.click(actions[1]);
    fireEvent.click(screen.getByRole("menuitem", { name: "按原文逐句讲" }));

    const request = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    expect(request.messages.at(-1).content).toContain("第二个回答应该被引用");
    expect(request.messages.at(-1).content).not.toContain("第一个回答片段");
  });

  test("同一回答的局部选区在补讲菜单鼠标按下后仍作为定向片段发送", async () => {
    const selectedExcerpt = "局部关键句应当被引用";
    const omittedTail = "这一段剩余文字不应成为定向片段";
    const session = {
      id: "refinement-local-selection-session",
      title: "局部补讲测试",
      createdAt: 100,
      updatedAt: 200,
      messages: [
        {
          id: "local-question",
          role: "user" as const,
          content: "原问题",
          createdAt: 100,
          status: "completed" as const,
        },
        {
          id: "local-answer",
          role: "assistant" as const,
          content: `${selectedExcerpt}。${omittedTail}。`,
          createdAt: 200,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);
    await screen.findByText(session.messages[1].content, { exact: true });

    const messageRow = document.querySelector<HTMLElement>(
      '[data-message-id="local-answer"]'
    );
    const markdown = messageRow?.querySelector<HTMLElement>(".markdown-content");
    const textNode = markdown?.querySelector("p")?.firstChild || markdown?.firstChild;
    if (!messageRow || !textNode || textNode.nodeType !== Node.TEXT_NODE) {
      throw new Error("未找到可划选的助手回答正文");
    }
    const text = textNode.textContent || "";
    const start = text.indexOf(selectedExcerpt);
    if (start < 0) throw new Error("未找到待验证的局部回答片段");
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, start + selectedExcerpt.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.mouseUp(document.querySelector(".chat-content")!);
    await screen.findByRole("toolbar", { name: "划词追问" });

    const refinementButton = screen.getByRole("button", { name: "这里没看懂" });
    fireEvent.mouseDown(refinementButton);
    fireEvent.click(refinementButton);
    const action = screen.getByRole("menuitem", { name: "按原文逐句讲" });
    fireEvent.mouseDown(action);
    fireEvent.click(action);

    const request = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    const refinementPrompt = request.messages.at(-1).content;
    expect(refinementPrompt).toContain(selectedExcerpt);
    expect(refinementPrompt).not.toContain(omittedTail);
  });

  test("补讲收到真实错误后重挂载，点击重试仍物化原定向指令", async () => {
    const session = {
      id: "refinement-refresh-retry-session",
      title: "补讲刷新重试测试",
      createdAt: 100,
      updatedAt: 200,
      messages: [
        {
          id: "refresh-question",
          role: "user" as const,
          content: "原始问题",
          createdAt: 100,
          status: "completed" as const,
        },
        {
          id: "refresh-answer",
          role: "assistant" as const,
          content: "需要在刷新后保持的原回答",
          createdAt: 200,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);
    await screen.findByText("需要在刷新后保持的原回答");
    fireEvent.click(screen.getByRole("button", { name: "这里没看懂" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "再白一点" }));
    const firstRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });

    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: firstRequest.requestId,
        sessionId: session.id,
        error: "本地模型故障",
        done: true,
      });
    });
    await screen.findByText("本地模型故障");
    await waitFor(() => {
      const stored = mock.localStore.sidepanel_chat_sessions as any[];
      expect(stored[0].messages.at(-1)).toMatchObject({
        role: "assistant",
        status: "error",
        errorMessage: "本地模型故障",
      });
    });

    cleanup();
    render(<SidePanelApp />);
    await screen.findByText("本地模型故障");
    fireEvent.click(screen.getByTitle("重试生成"));
    const retryRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(2);
      return requests[1];
    });
    expect(retryRequest.prismMode).toBe(false);
    expect(retryRequest.bypassJargonVault).toBe(true);
    expect(retryRequest.messages.at(-1).content).toContain(
      "需要在刷新后保持的原回答"
    );
  });

  test("补讲回答失败后重试仍物化同一份定向指令", async () => {
    const session = {
      id: "refinement-retry-session",
      title: "补讲重试测试",
      createdAt: 100,
      updatedAt: 200,
      messages: [
        {
          id: "retry-question",
          role: "user" as const,
          content: "原问题",
          createdAt: 100,
          status: "completed" as const,
        },
        {
          id: "retry-answer",
          role: "assistant" as const,
          content: "需要补讲的原回答",
          createdAt: 200,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);
    await screen.findByText("需要补讲的原回答");
    fireEvent.click(screen.getByRole("button", { name: "这里没看懂" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "换个贴合本文的例子" }));
    const firstRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    const firstAssistantId = firstRequest.requestId;
    mock.emitRuntimeMessage({
      action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
      requestId: firstAssistantId,
      sessionId: session.id,
      content: "补讲结果",
      done: true,
    });
    await screen.findByText("补讲结果");
    const retryButtons = screen.getAllByRole("button", { name: "重新生成" });
    fireEvent.click(retryButtons.at(-1)!);
    const retryRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(2);
      return requests[1];
    });
    expect(retryRequest.prismMode).toBe(false);
    expect(retryRequest.bypassJargonVault).toBe(true);
    expect(retryRequest.messages.at(-1).content).toContain("需要补讲的原回答");
  });

  test("回顾对话主线只发送当前会话，保留冻结范围并在刷新后恢复四节结果", async () => {
    const pageCard = createAttachedPageMessage("回顾网页正文绝不能重复进入专用总结请求");
    pageCard.pageMeta.title = "回顾来源网页标题";
    const currentSession = {
      id: "recap-current-session",
      title: "当前会话",
      createdAt: 100,
      updatedAt: 400,
      messages: [
        {
          id: "recap-user-1",
          role: "user" as const,
          content: "当前目标是让本周交付按时完成",
          createdAt: 100,
          status: "completed" as const,
        },
        {
          id: "recap-assistant-1",
          role: "assistant" as const,
          content: "已经确认需要明确每个人的责任边界。",
          createdAt: 200,
          status: "completed" as const,
        },
        pageCard,
        {
          id: "recap-assistant-2",
          role: "assistant" as const,
          content: "尚未确认验收时间，需要下一步跟进。",
          createdAt: 400,
          status: "completed" as const,
        },
      ],
    };
    const otherSession = {
      id: "recap-other-session",
      title: "不应进入请求的会话",
      createdAt: 500,
      updatedAt: 600,
      messages: [
        {
          id: "other-user",
          role: "user" as const,
          content: "另一会话绝不发送到当前回顾请求",
          createdAt: 500,
          status: "completed" as const,
        },
      ],
    };
    const mock = createBrowserMock({
      sessions: [currentSession, otherSession],
      activeSessionId: currentSession.id,
    });
    setTestGlobal("browser", mock.browser);

    const view = render(<SidePanelApp />);
    await screen.findByText("当前目标是让本周交付按时完成");
    fireEvent.click(screen.getByRole("button", { name: "回顾对话主线" }));
    const request = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    expect(request.prismMode).toBe(false);
    expect(request.bypassJargonVault).toBe(true);
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].content).toContain("【对话主线回顾任务 v1】");
    expect(request.messages[1].content).toContain("【覆盖信息】");
    expect(request.messages[1].content).toContain("【本次覆盖的当前会话文字】");
    const requestText = JSON.stringify(request.messages);
    expect(requestText).toContain("当前目标是让本周交付按时完成");
    expect(requestText).toContain("回顾来源网页标题");
    expect(requestText).not.toContain("回顾网页正文绝不能重复进入专用总结请求");
    expect(requestText).not.toContain("另一会话绝不发送到当前回顾请求");

    const storedAfterRequest = mock.localStore.sidepanel_chat_sessions as any[];
    const recapUser = storedAfterRequest[0].messages.at(-2);
    expect(recapUser).toMatchObject({
      role: "user",
      content: "回顾对话主线",
      conversationRecapMeta: expect.objectContaining({
        version: 1,
        sourceFingerprint: expect.any(String),
        totalMessageCount: 4,
        coveredMessageCount: 4,
        truncated: false,
        sourceMessageIds: expect.arrayContaining([
          "recap-user-1",
          "recap-assistant-1",
          pageCard.id,
          "recap-assistant-2",
        ]),
      }),
    });

    const recapContent = [
      "## 当前目标",
      "让本周交付按时完成。",
      "## 已确认结论",
      "责任边界需要明确。",
      "## 未解决问题",
      "验收时间尚未确定。",
      "## 下一步",
      "今天确认验收时间并同步负责人。",
    ].join("\n\n");
    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: request.requestId,
        sessionId: request.sessionId,
        content: recapContent,
        done: true,
      });
    });
    await screen.findByText("当前目标", { exact: true });
    expect(screen.getByText("已确认结论", { exact: true })).toBeTruthy();
    expect(screen.getByText("未解决问题", { exact: true })).toBeTruthy();
    expect(screen.getByText("下一步", { exact: true })).toBeTruthy();
    expect(
      document.querySelector(".conversation-recap-scope")?.textContent?.replace(/\s+/g, "")
    ).toBe("本次覆盖4/4条消息");

    view.unmount();
    render(<SidePanelApp />);
    await screen.findByText("今天确认验收时间并同步负责人。");
    expect(
      document.querySelector(".conversation-recap-scope")?.textContent?.replace(/\s+/g, "")
    ).toBe("本次覆盖4/4条消息");
  });

  test("回顾失败重试仍使用首次冻结范围，空会话和忙时按钮禁用", async () => {
    const emptyMock = createBrowserMock();
    setTestGlobal("browser", emptyMock.browser);
    const emptyView = render(<SidePanelApp />);
    await screen.findByText("人话翻译与长文通读");
    expect(
      (screen.getByRole("button", {
        name: "回顾对话主线",
      }) as HTMLButtonElement).disabled
    ).toBe(true);
    emptyView.unmount();

    const session = createOngoingSession();
    const mock = createBrowserMock({
      sessions: [session],
      activeSessionId: session.id,
    });
    setTestGlobal("browser", mock.browser);
    render(<SidePanelApp />);
    await screen.findByText("之前的问题");
    const recapButton = screen.getByRole("button", { name: "回顾对话主线" });
    fireEvent.click(recapButton);
    const firstRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    expect((recapButton as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: firstRequest.requestId,
        sessionId: firstRequest.sessionId,
        error: "回顾服务暂时不可用",
        done: true,
      });
    });
    await screen.findByText("回顾服务暂时不可用");
    fireEvent.click(screen.getByTitle("重试生成"));
    const retryRequest = await waitFor(() => {
      const requests = getTranslateMessages(mock);
      expect(requests).toHaveLength(2);
      return requests[1];
    });
    expect(retryRequest.prismMode).toBe(false);
    expect(retryRequest.bypassJargonVault).toBe(true);
    expect(retryRequest.messages).toEqual(firstRequest.messages);
  });
});
