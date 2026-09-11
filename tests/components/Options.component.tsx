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
import Options from "../../entrypoints/options/Options";
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
  const now = Date.now();
  const localStore: Record<string, unknown> = {
    apiKey: "sk-initial-key",
    settings: {
      apiKey: "sk-initial-key",
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-flash",
      updatedAt: now + 100,
    },
  };
  const syncStore: Record<string, unknown> = {
    settings: {
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-flash",
      temperature: 0.7,
      promptTemplate: "测试系统提示词",
      thinkingEnabled: false,
      showSelectionToolbar: true,
      contextualSelectionEnabled: false,
      logLevel: "off",
      theme: "system",
      fontScalePercent: 100,
      updatedAt: now,
    },
  };
  const runtimeListeners = new Set<Listener>();
  const storageListeners = new Set<Listener>();
  const sentMessages: any[] = [];
  const localWrites: Record<string, unknown>[] = [];
  const syncWrites: Record<string, unknown>[] = [];

  const createStorageArea = (
    store: Record<string, unknown>,
    writesList: Record<string, unknown>[]
  ) => ({
    get: async (keys: string | string[] | null) =>
      selectStoredValues(store, keys),
    set: async (items: Record<string, unknown>) => {
      const snapshot = structuredClone(items);
      Object.assign(store, snapshot);
      writesList.push(snapshot);
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
          runtimeListeners.delete(listener);
        },
      },
      async sendMessage(message: any) {
        sentMessages.push(structuredClone(message));
        if (message.action === "testApiConnection") {
          return { success: true };
        }
        if (message.action === "getDiagnosticLogs") {
          return { success: true, records: [], summary: { total: 0, errors: 0 } };
        }
        return { success: true };
      },
      getManifest: () => ({ version: "1.4.1", name: "人话翻译器" }),
      getURL: (path: string) => `chrome-extension://human-text/${path}`,
    },
    commands: {
      getAll: async () => [
        { name: "translate-selection", shortcut: "Alt+H" },
      ],
    },
    storage: {
      local: createStorageArea(localStore, localWrites),
      sync: createStorageArea(syncStore, syncWrites),
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
      create: async () => {},
    },
  };

  return {
    browser,
    localStore,
    syncStore,
    localWrites,
    syncWrites,
    sentMessages,
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

describe("Options 设置页面组件级交互与逻辑增强", () => {
  test("正确渲染 Header 品牌信息、Logo、标题与版本号 v1.4.1", async () => {
    const { browser } = createBrowserMock();
    setTestGlobal("browser", browser);
    setTestGlobal("chrome", browser);

    render(<Options />);

    expect(screen.getByText("人话翻译器")).toBeTruthy();
    expect(screen.getByText("v1.4.1")).toBeTruthy();
    const logo = screen.getByAltText("人话翻译器 Logo") as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo.getAttribute("src")).toBe("/icon/48.png");
  });

  test("支持 Tab 导航切换与全部展开过滤", async () => {
    const { browser } = createBrowserMock();
    setTestGlobal("browser", browser);
    setTestGlobal("chrome", browser);

    render(<Options />);

    // 初始状态下全部展开，应看到全部几个关键分类标题
    expect(screen.getByRole("heading", { name: "API 设置" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "交互偏好设置" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "外观与显示" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "问题诊断" })).toBeTruthy();

    // 切换到 'API 与模型' tab
    const apiTab = screen.getByRole("button", { name: /API 与模型/ });
    fireEvent.click(apiTab);

    expect(screen.getByRole("heading", { name: "API 设置" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "交互偏好设置" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "外观与显示" })).toBeNull();

    // 切换到 '外观显示' tab
    const appearanceTab = screen.getByRole("button", { name: /外观显示/ });
    fireEvent.click(appearanceTab);

    expect(screen.queryByRole("heading", { name: "API 设置" })).toBeNull();
    expect(screen.getByRole("heading", { name: "外观与显示" })).toBeTruthy();

    // 切回 '全部展开' tab
    const allTab = screen.getByRole("button", { name: /全部展开/ });
    fireEvent.click(allTab);

    expect(screen.getByRole("heading", { name: "API 设置" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "交互偏好设置" })).toBeTruthy();
  });

  test("API Key 状态 Badge 与 Base URL Chips 激活态高亮", async () => {
    const { browser } = createBrowserMock();
    setTestGlobal("browser", browser);
    setTestGlobal("chrome", browser);

    render(<Options />);

    // 等待初始加载设置
    await waitFor(() => {
      expect(screen.getByText("已配置")).toBeTruthy();
    });

    // DeepSeek 的 chip 应该带有 active 类
    const deepseekChip = screen.getByRole("button", { name: /DeepSeek/ });
    expect(deepseekChip.className).toContain("active");

    // 点击火山引擎切换 Base URL
    const volcanoChip = screen.getByRole("button", { name: /火山引擎/ });
    fireEvent.click(volcanoChip);

    expect(volcanoChip.className).toContain("active");
    expect(deepseekChip.className).not.toContain("active");
  });

  test("测试 API 连接成功后自动持久化保存设置", async () => {
    const { browser, sentMessages } = createBrowserMock();
    setTestGlobal("browser", browser);
    setTestGlobal("chrome", browser);

    render(<Options />);

    // 等待初始配置加载完毕
    await waitFor(() => {
      expect(screen.getByDisplayValue("sk-initial-key")).toBeTruthy();
    });

    const testBtn = screen.getByRole("button", { name: /测试连接/ });
    await act(async () => {
      fireEvent.click(testBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/API连接测试成功，设置已自动保存/)).toBeTruthy();
    });

    const testMsg = sentMessages.find((m) => m.action === "testApiConnection");
    expect(testMsg).toBeTruthy();
    expect(testMsg.apiKey).toBe("sk-initial-key");
  });

  test("外观设置模块包含实时字号效果预览卡片", async () => {
    const { browser } = createBrowserMock();
    setTestGlobal("browser", browser);
    setTestGlobal("chrome", browser);

    render(<Options />);

    // 切换到外观显示 tab
    const appearanceTab = screen.getByRole("button", { name: /外观显示/ });
    fireEvent.click(appearanceTab);

    expect(screen.getByText("实时字号效果预览")).toBeTruthy();
    expect(screen.getByText(/心智对齐/)).toBeTruthy();
    expect(screen.getByText(/人话翻译：/)).toBeTruthy();
  });

  test("顶栏操作区支持快捷保存与重置默认", async () => {
    const { browser } = createBrowserMock();
    setTestGlobal("browser", browser);
    setTestGlobal("chrome", browser);

    render(<Options />);

    const saveBtns = screen.getAllByRole("button", { name: /保存设置/ });
    expect(saveBtns.length).toBeGreaterThanOrEqual(1);

    const topResetBtn = screen.getByRole("button", { name: /重置默认/ });
    expect(topResetBtn).toBeTruthy();
  });
});
