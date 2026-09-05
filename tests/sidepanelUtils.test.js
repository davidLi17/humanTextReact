import { afterEach, describe, expect, test } from "bun:test";
import {
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
    globalThis.browser = {
      runtime: {
        getContexts: async () => [],
      },
      sidePanel: {
        open: () => {
          openCount += 1;
          return new Promise((resolve) => {
            resolveOpen = resolve;
          });
        },
      },
    };

    const first = toggleSidePanel({ windowId: 9203 });
    const duplicate = toggleSidePanel({ windowId: 9203 });
    await Promise.resolve();
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
