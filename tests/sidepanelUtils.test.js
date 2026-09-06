import { afterEach, describe, expect, test } from "bun:test";
import {
  extractActiveTabContent,
  openSidePanel,
  toggleSidePanel,
} from "../entrypoints/shared/sidepanelUtils.ts";

const originalChrome = globalThis.chrome;
const originalBrowser = globalThis.browser;

afterEach(() => {
  globalThis.chrome = originalChrome;
  globalThis.browser = originalBrowser;
});

describe("sidepanel utilities", () => {
  test("openSidePanel opens the requested window", async () => {
    let openedParams = null;
    globalThis.browser = {
      sidePanel: {
        open: async (params) => {
          openedParams = params;
        },
      },
    };

    expect(await openSidePanel({ windowId: 9101 })).toBe(true);
    expect(openedParams).toEqual({ windowId: 9101 });
  });

  test("toggleSidePanel opens when the side panel context is absent", async () => {
    let openedParams = null;
    globalThis.browser = {
      runtime: {
        getContexts: async () => [],
      },
      sidePanel: {
        open: async (params) => {
          openedParams = params;
        },
      },
    };

    expect(await toggleSidePanel({ windowId: 9201, tabId: 9301 })).toBe(true);
    expect(openedParams).toEqual({ windowId: 9201 });
  });

  test("toggleSidePanel closes when the side panel context is present", async () => {
    let contextFilter = null;
    let closedParams = null;
    globalThis.browser = {
      runtime: {
        getContexts: async (filter) => {
          contextFilter = filter;
          return [{ contextType: "SIDE_PANEL" }];
        },
      },
      sidePanel: {
        close: async (params) => {
          closedParams = params;
        },
      },
    };

    expect(await toggleSidePanel({ windowId: 9202, tabId: 9302 })).toBe(true);
    expect(contextFilter).toEqual({
      contextTypes: ["SIDE_PANEL"],
      windowIds: [9202],
    });
    expect(closedParams).toEqual({ windowId: 9202 });
  });

  test("toggleSidePanel coalesces duplicate shortcut requests", async () => {
    let resolveOpen;
    let openCount = 0;
    let markOpenStarted;
    const openStarted = new Promise((resolve) => {
      markOpenStarted = resolve;
    });
    globalThis.browser = {
      runtime: {
        getContexts: async () => [],
      },
      sidePanel: {
        open: () => {
          openCount += 1;
          markOpenStarted();
          return new Promise((resolve) => {
            resolveOpen = resolve;
          });
        },
      },
    };

    const first = toggleSidePanel({ windowId: 9203 });
    const duplicate = toggleSidePanel({ windowId: 9203 });
    await openStarted;
    expect(openCount).toBe(1);

    resolveOpen();
    expect(await first).toBe(true);
    expect(await duplicate).toBe(true);
  });

  test("toggleSidePanel reports failure when close is unavailable", async () => {
    globalThis.browser = {
      runtime: {
        getContexts: async () => [{ contextType: "SIDE_PANEL" }],
      },
      sidePanel: {},
    };

    expect(await toggleSidePanel({ windowId: 9204 })).toBe(false);
  });
});

describe("extractActiveTabContent failure stages (任务1: 失败可定位链路环节)", () => {
  afterEach(() => {
    globalThis.browser = originalBrowser;
    globalThis.chrome = originalChrome;
  });

  function mockTab(url) {
    return {
      tabs: {
        query: async () => [{ id: 7, url, title: "测试页" }],
      },
    };
  }

  test("missing active tab reports stage 'tab'", async () => {
    globalThis.browser = {
      tabs: { query: async () => [] },
    };

    const result = await extractActiveTabContent();
    expect(result.success).toBe(false);
    expect(result.stage).toBe("tab");
    expect(result.error).toContain("活动标签页");
  });

  test("restricted browser page reports stage 'restricted'", async () => {
    globalThis.browser = mockTab("chrome://settings/");

    const result = await extractActiveTabContent();
    expect(result.success).toBe(false);
    expect(result.stage).toBe("restricted");
    expect(result.error).toContain("浏览器内置系统页面");
  });

  test("explicit content-script failure propagates the reason as stage 'cs-extract' without silent fallback", async () => {
    let fallbackCalled = false;
    globalThis.browser = {
      ...mockTab("https://example.com/article"),
      scripting: {
        executeScript: async () => {
          fallbackCalled = true;
          return [];
        },
      },
    };
    globalThis.browser.tabs.sendMessage = async () => ({
      success: false,
      error: "页面解析算法抛错",
    });

    const result = await extractActiveTabContent();
    expect(result.success).toBe(false);
    expect(result.stage).toBe("cs-extract");
    expect(result.error).toContain("页面解析算法抛错");
    expect(fallbackCalled).toBe(false);
  });

  test("successful content-script response maps page data through", async () => {
    globalThis.browser = mockTab("https://example.com/article");
    globalThis.browser.tabs.sendMessage = async () => ({
      success: true,
      data: {
        title: "文章标题",
        url: "https://example.com/article",
        content: "正文内容",
        excerpt: "正文内容",
        wordCount: 4,
      },
    });

    const result = await extractActiveTabContent();
    expect(result.success).toBe(true);
    expect(result.data.title).toBe("文章标题");
    expect(result.data.content).toBe("正文内容");
  });

  test("uninjected content script falls back to executeScript successfully", async () => {
    globalThis.browser = mockTab("https://example.com/article");
    globalThis.browser.tabs.sendMessage = async () => {
      throw new Error("Could not establish connection");
    };
    globalThis.browser.scripting = {
      executeScript: async () => [
        {
          result: {
            title: "兜底标题",
            url: "https://example.com/article",
            content: "兜底正文",
            wordCount: 4,
          },
        },
      ],
    };

    const result = await extractActiveTabContent();
    expect(result.success).toBe(true);
    expect(result.data.title).toBe("兜底标题");
  });

  test("executeScript rejection by permissions reports stage 'fallback-extract' with a specific reason", async () => {
    globalThis.browser = mockTab("https://example.com/article");
    globalThis.browser.tabs.sendMessage = async () => {
      throw new Error("Could not establish connection");
    };
    globalThis.browser.scripting = {
      executeScript: async () => {
        throw new Error(
          'Cannot access contents of url "https://example.com". Extend the manifest permissions...'
        );
      },
    };

    const result = await extractActiveTabContent();
    expect(result.success).toBe(false);
    expect(result.stage).toBe("fallback-extract");
    expect(result.error).toContain("禁止扩展注入");
  });

  test("executeScript empty result reports stage 'fallback-extract'", async () => {
    globalThis.browser = mockTab("https://example.com/article");
    globalThis.browser.tabs.sendMessage = async () => {
      throw new Error("Receiving end does not exist");
    };
    globalThis.browser.scripting = {
      executeScript: async () => [{}],
    };

    const result = await extractActiveTabContent();
    expect(result.success).toBe(false);
    expect(result.stage).toBe("fallback-extract");
    expect(result.error).toContain("动态注入兜底");
  });
});
