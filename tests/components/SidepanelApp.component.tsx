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
import { MESSAGE_TYPES } from "../../entrypoints/shared/constants";
import {
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

type Listener = (...args: any[]) => unknown;

interface BrowserMockOptions {
  sessions?: unknown[];
  activeSessionId?: string;
  /** 模拟当前活动标签页；缺省时 tabs.query 返回空数组，提取链路必然失败 */
  activeTab?: { id: number; url: string; title?: string };
  /** content script 的正文提取响应 */
  tabExtractResponse?: unknown;
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
        return { success: true };
      },
      async openOptionsPage() {},
      getManifest: () => ({ version: "1.4.1" }),
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
    const ongoingSession = {
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
    const mock = createBrowserMock({
      sessions: [ongoingSession],
      activeSessionId: ongoingSession.id,
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
          content: "这是被附加的网页正文内容，用于验证上下文附加行为是否正确。",
          wordCount: 27,
        },
      },
    });
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    // 会话文本出现即代表水合已完成，handleReadCurrentPage 的水合前置守卫才会放行
    await screen.findByText("之前的问题");

    // 落盘写入可能不止一次，取最近一次「含附加卡片」的快照
    const findAttachedSessions = () => {
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
    };

    fireEvent.click(
      screen.getByTitle("一键提取并人话通读当前打开的网页正文")
    );

    await waitFor(() => expect(findAttachedSessions()).toBeDefined());

    const sessions = findAttachedSessions()!;
    // 关键：没有新建会话，仍然是原来那一个
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("ongoing-session");
    // 已有对话的标题不被改写
    expect(sessions[0].title).toBe("进行中的会话");

    const messages = sessions[0].messages;
    // 只追加一张正文卡片，没有助手占位消息
    expect(messages).toHaveLength(3);
    const card = messages.at(-1);
    expect(card.role).toBe("user");
    expect(card.status).toBe("completed");
    expect(card.pageMeta.contextOnly).toBe(true);
    expect(card.pageMeta.sourceContent).toContain("这是被附加的网页正文内容");

    // 全程没有发起模型请求
    expect(
      mock.sentMessages.filter(
        (message) => message.action === MESSAGE_TYPES.TRANSLATE
      )
    ).toHaveLength(0);
  });
});
