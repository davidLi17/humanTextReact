import { afterEach, describe, expect, test } from "bun:test";
import { openSidePanel } from "../entrypoints/shared/sidepanelUtils.ts";

afterEach(() => {
  delete globalThis.chrome;
  delete globalThis.browser;
});

describe("sidepanelUtils", () => {
  test("calls chrome.sidePanel.open when windowId is provided", async () => {
    let openedParams = null;
    globalThis.chrome = {
      sidePanel: {
        open: async (params) => {
          openedParams = params;
        },
      },
    };

    const success = await openSidePanel({ windowId: 999 });
    expect(success).toBe(true);
    expect(openedParams).toEqual({ windowId: 999 });
  });

  test("calls browser.sidePanel.open when tabId is provided", async () => {
    let openedParams = null;
    globalThis.browser = {
      sidePanel: {
        open: async (params) => {
          openedParams = params;
        },
      },
    };

    const success = await openSidePanel({ tabId: 888 });
    expect(success).toBe(true);
    expect(openedParams).toEqual({ tabId: 888 });
  });

  test("gracefully returns false when sidePanel API is unavailable", async () => {
    const success = await openSidePanel({ windowId: 123 });
    expect(success).toBe(false);
  });
});
