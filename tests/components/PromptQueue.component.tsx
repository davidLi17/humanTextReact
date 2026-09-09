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

function createBrowserMock() {
  const localStore: Record<string, unknown> = {};
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
  const sentMessages: any[] = [];
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
      id: "test-extension-id",
      sendMessage: async (message: any) => {
        sentMessages.push(message);
        return { success: true };
      },
      onMessage: {
        addListener(listener: Listener) {
          runtimeListeners.add(listener);
        },
        removeListener(listener: Listener) {
          runtimeListeners.delete(listener);
        },
      },
      getManifest: () => ({ version: "1.4.0" }),
    },
    storage: {
      local: createStorageArea(localStore, true),
      sync: createStorageArea(syncStore),
      onChanged: {
        addListener(listener: Listener) {
          storageListeners.add(listener);
        },
        removeListener(listener: Listener) {
          storageListeners.delete(listener);
        },
      },
    },
    tabs: {
      query: async () => [],
    },
  };

  return {
    browser,
    sentMessages,
    emitRuntimeMessage(message: unknown) {
      for (const listener of [...runtimeListeners]) listener(message);
    },
  };
}

const restoreGlobals = preserveGlobals("browser", "chrome");

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  cleanup();
  restoreGlobals();
});

describe("Sidepanel 提示词排队系统 (Prompt Queue System)", () => {
  test("在流式输出中输入新问题，按 Enter 自动入队且不中断当前流式", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);

    // 1. 发送第一个问题
    fireEvent.change(input, { target: { value: "问题一：什么是黑话？" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    // 验证第一个问题已发出
    await waitFor(() => {
      expect(
        mock.sentMessages.some(
          (m) =>
            m.action === MESSAGE_TYPES.TRANSLATE &&
            m.messages.at(-1)?.content === "问题一：什么是黑话？"
        )
      ).toBe(true);
    });

    // 模拟第一个问题开始流式输出
    const firstRequest = mock.sentMessages.find(
      (m) => m.action === MESSAGE_TYPES.TRANSLATE
    );
    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: firstRequest.requestId,
        sessionId: firstRequest.sessionId,
        content: "正在回答黑话的定义...",
        done: false,
      });
    });

    // 验证界面已进入流式状态（出现停止生成按钮）
    expect(await screen.findByRole("button", { name: "停止生成" })).toBeTruthy();

    // 2. 在流式状态下输入第二个问题并按 Enter
    fireEvent.change(input, { target: { value: "问题二：那赋能和抓手呢？" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    // 验证输入框已被清空
    expect((input as HTMLTextAreaElement).value).toBe("");

    // 验证此时并没有立即向后台发送第二个 TRANSLATE 消息
    const translateMessages = mock.sentMessages.filter(
      (m) => m.action === MESSAGE_TYPES.TRANSLATE
    );
    expect(translateMessages.length).toBe(1);

    // 3. 验证输入框上方成功浮现排队队列条卡片
    const queueBar = await screen.findByRole("region", {
      name: "排队中的提示词队列",
    });
    expect(queueBar).toBeTruthy();
    expect(screen.getByText("排队中")).toBeTruthy();
    expect(screen.getByText("问题二：那赋能和抓手呢？")).toBeTruthy();
    expect(screen.getByTitle(/优先发送/)).toBeTruthy();
    expect(screen.getByTitle("取消排队并移除")).toBeTruthy();
  });

  test("上一个问题流式结束后，排队问题自动出队并触发连环自动解答", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);

    // 1. 发起首个请求
    fireEvent.change(input, { target: { value: "首个问题" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    const firstRequest = await waitFor(() => {
      const msg = mock.sentMessages.find(
        (m) => m.action === MESSAGE_TYPES.TRANSLATE
      );
      expect(msg).toBeDefined();
      return msg;
    });

    // 2. 排队加入后续两个问题
    fireEvent.change(input, { target: { value: "排队第二题" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    // 验证排队条显示
    expect(await screen.findByText("排队第二题")).toBeTruthy();

    // 3. 模拟首个请求完成 (done: true)
    act(() => {
      mock.emitRuntimeMessage({
        action: MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION,
        requestId: firstRequest.requestId,
        sessionId: firstRequest.sessionId,
        content: "首个问题的完整答案",
        done: true,
      });
    });

    // 4. 验证自动出队串联调度：第二个排队问题自动发送给后台
    await waitFor(
      () => {
        const secondRequest = mock.sentMessages.find(
          (m) =>
            m.action === MESSAGE_TYPES.TRANSLATE &&
            m.requestId !== firstRequest.requestId &&
            m.messages.at(-1)?.content === "排队第二题"
        );
        expect(secondRequest).toBeDefined();
      },
      { timeout: 3000 }
    );
  });

  test("支持点击取消按钮从队列中移除问题", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);

    // 发起首个请求
    fireEvent.change(input, { target: { value: "初始问题" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    // 排队
    fireEvent.change(input, { target: { value: "我想取消的问题" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(await screen.findByText("我想取消的问题")).toBeTruthy();

    // 点击移除按钮
    const removeBtn = screen.getByTitle("取消排队并移除");
    fireEvent.click(removeBtn);

    // 验证排队条消失
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: "排队中的提示词队列" })
      ).toBeNull();
    });
  });

  test("支持点击优先发送按钮立即打断当前输出并抢先发送", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);

    // 发起首个请求
    fireEvent.change(input, { target: { value: "长回答问题" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    // 排队
    fireEvent.change(input, { target: { value: "紧急优先问题" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(await screen.findByText("紧急优先问题")).toBeTruthy();

    // 点击优先发送
    const promoteBtn = screen.getByTitle(/优先发送/);
    fireEvent.click(promoteBtn);

    // 验证立即作为新请求发出
    await waitFor(() => {
      const urgentRequest = mock.sentMessages.find(
        (m) =>
          m.action === MESSAGE_TYPES.TRANSLATE &&
          m.messages.at(-1)?.content === "紧急优先问题"
      );
      expect(urgentRequest).toBeDefined();
    });
  });

  test("支持 ⌘+Enter (Mac) / Ctrl+Enter 快捷键直接打断当前流式输出并立即发送新问题", async () => {
    const mock = createBrowserMock();
    setTestGlobal("browser", mock.browser);

    render(<SidePanelApp />);
    const input = await screen.findByPlaceholderText(/输入追问、黑话术语或指令/);

    // 1. 发起首个请求
    fireEvent.change(input, { target: { value: "首个慢速问题" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    // 2. 输入打断问题，按下 ⌘+Enter
    fireEvent.change(input, { target: { value: "打断并立即执行的新问题" } });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    // 3. 验证新问题立即作为请求发出
    await waitFor(() => {
      const interruptedRequest = mock.sentMessages.find(
        (m) =>
          m.action === MESSAGE_TYPES.TRANSLATE &&
          m.messages.at(-1)?.content === "打断并立即执行的新问题"
      );
      expect(interruptedRequest).toBeDefined();
    });
  });
});
