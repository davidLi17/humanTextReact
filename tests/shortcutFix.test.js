import { afterEach, describe, expect, test } from "bun:test";
import {
  getSelectedTextFromPage,
  initContentShortcuts,
  isOpenSidepanelShortcut,
  isTranslateShortcut,
} from "../entrypoints/content/shortcutListener.ts";
import { ShortcutManager } from "../entrypoints/background/shortcutManager.ts";
import { ContextMenuHandler } from "../entrypoints/background/contextMenuHandler.ts";
import { preserveGlobals } from "./helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("browser", "chrome", "window", "document");
const originalListenerState = ShortcutManager.isListenerRegistered;

describe("Shortcut Fix and Dual-Channel Dispatcher Tests", () => {
  afterEach(() => {
    restoreGlobals();
    ShortcutManager.isListenerRegistered = originalListenerState;
  });

  describe("1. Content Script Key Matching (Cross-Platform & macOS Deadkeys)", () => {
    test("correctly recognizes Alt/Option+D on Windows, Linux and macOS", () => {
      const baseEvent = {
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        code: "KeyD",
      };
      for (const key of ["d", "D", "∂"]) {
        expect(isTranslateShortcut({ ...baseEvent, key })).toBe(true);
      }
      for (const event of [
        { ...baseEvent, key: "d", ctrlKey: true },
        { ...baseEvent, key: "d", metaKey: true },
        { ...baseEvent, key: "a", code: "KeyA" },
      ]) {
        expect(isTranslateShortcut(event)).toBe(false);
      }
    });

    test("correctly recognizes Alt+S on Windows/Linux and macOS", () => {
      const baseEvent = {
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        code: "KeyS",
      };
      for (const key of ["s", "S", "ß"]) {
        expect(isOpenSidepanelShortcut({ ...baseEvent, key })).toBe(true);
      }
      expect(
        isOpenSidepanelShortcut({ ...baseEvent, key: "s", ctrlKey: true })
      ).toBe(false);
    });
  });

  describe("2. Selected Text Extraction from DOM & Input Elements", () => {
    test("extracts text from standard DOM selection", () => {
      globalThis.window = {
        getSelection: () => ({
          toString: () => "  端到端全链路压测  ",
        }),
      };
      globalThis.document = {
        activeElement: null,
      };

      expect(getSelectedTextFromPage()).toBe("端到端全链路压测");
    });

    test("extracts selected text from input element when DOM selection is empty", () => {
      globalThis.window = {
        getSelection: () => ({
          toString: () => "",
        }),
      };
      globalThis.document = {
        activeElement: {
          tagName: "INPUT",
          value: "请解释一下什么是沉浸式交互架构？",
          selectionStart: 8,
          selectionEnd: 15,
        },
      };

      expect(getSelectedTextFromPage()).toBe("沉浸式交互架构");
    });

    test("returns empty string when nothing is selected", () => {
      globalThis.window = {
        getSelection: () => ({
          toString: () => "",
        }),
      };
      globalThis.document = {
        activeElement: null,
      };

      expect(getSelectedTextFromPage()).toBe("");
    });
  });

  describe("3. Content Script In-Page Keydown Handler (Dual-Channel In-page Fallback)", () => {
    test("handles Option+D keydown: shows popup and sends translate message", async () => {
      let shownSelection = "";
      let shownRequestId = "";
      const mockPopupManager = {
        showPopup: (selection, reqId) => {
          shownSelection = selection;
          shownRequestId = reqId;
        },
      };

      let sentMessage = null;
      globalThis.browser = {
        runtime: {
          sendMessage: async (msg) => {
            sentMessage = msg;
            return { success: true };
          },
        },
      };

      globalThis.window = {
        getSelection: () => ({
          toString: () => "颗粒度对齐",
        }),
        addEventListener: (event, handler) => {
          globalThis.window._handler = handler;
        },
        removeEventListener: (event, handler) => {
          delete globalThis.window._handler;
        },
      };
      globalThis.document = {
        activeElement: null,
      };

      const cleanup = initContentShortcuts(mockPopupManager);

      let defaultPrevented = false;
      let propagationStopped = false;
      const fakeEvent = {
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        code: "KeyD",
        key: "∂",
        preventDefault: () => {
          defaultPrevented = true;
        },
        stopPropagation: () => {
          propagationStopped = true;
        },
      };

      await globalThis.window._handler(fakeEvent);

      expect(defaultPrevented).toBe(true);
      expect(propagationStopped).toBe(true);
      expect(shownSelection).toBe("颗粒度对齐");
      expect(shownRequestId).toBeString();
      expect(sentMessage).toEqual({
        action: "translate",
        text: "颗粒度对齐",
        requestId: shownRequestId,
      });

      cleanup();
      expect(globalThis.window._handler).toBeUndefined();
    });

    test("handles Option+S keydown: saves selected text and sends toggleSidepanel message", async () => {
      const mockPopupManager = {
        showPopup: () => {},
      };

      let storageSaved = null;
      let sentMessage = null;
      globalThis.browser = {
        runtime: {
          sendMessage: async (msg) => {
            sentMessage = msg;
            return { success: true };
          },
        },
        storage: {
          local: {
            set: async (val) => {
              storageSaved = val;
            },
          },
        },
      };

      globalThis.window = {
        getSelection: () => ({
          toString: () => "心智模型构建",
        }),
        addEventListener: (event, handler) => {
          globalThis.window._handler = handler;
        },
        removeEventListener: (event, handler) => {
          if (globalThis.window._handler === handler) {
            delete globalThis.window._handler;
          }
        },
      };
      globalThis.document = {
        activeElement: null,
      };

      const cleanup = initContentShortcuts(mockPopupManager);

      let defaultPrevented = false;
      const fakeEvent = {
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        code: "KeyS",
        key: "ß",
        preventDefault: () => {
          defaultPrevented = true;
        },
        stopPropagation: () => {},
      };

      await globalThis.window._handler(fakeEvent);

      expect(defaultPrevented).toBe(true);
      expect(sentMessage).toEqual({ action: "toggleSidepanel" });
      expect(storageSaved?.pendingSidepanelText?.text).toBe("心智模型构建");
      cleanup();
      expect(globalThis.window._handler).toBeUndefined();
    });
  });

  describe("4. Background Commands Dispatcher & ShortcutManager", () => {
    test("registerCommandListeners registers commands listener", () => {
      let registeredListener = null;
      ShortcutManager.isListenerRegistered = false;

      globalThis.browser = {
        commands: {
          onCommand: {
            addListener: (fn) => {
              registeredListener = fn;
            },
          },
        },
      };

      ShortcutManager.registerCommandListeners();
      expect(registeredListener).toBeFunction();
    });

    test("executeToggleSidepanel opens a closed side panel", async () => {
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
        tabs: {
          query: async () => [{ id: 101, windowId: 202 }],
        },
      };

      const success = await ShortcutManager.executeToggleSidepanel({
        id: 101,
        windowId: 202,
      });

      expect(success).toBe(true);
      expect(openedParams).toEqual({ windowId: 202 });
    });

    test("executeTranslation sends getSelectedText and invokes ContextMenuHandler", async () => {
      let sentTabMessage = null;
      let handledClickInfo = null;
      let handledClickTab = null;

      globalThis.browser = {
        tabs: {
          query: async () => [{ id: 101, windowId: 202, url: "https://example.com" }],
          sendMessage: async (tabId, msg) => {
            sentTabMessage = { tabId, msg };
            return { selectedText: "赋能商业闭环" };
          },
        },
      };

      const originalHandler = ContextMenuHandler.handleContextMenuClick;
      ContextMenuHandler.handleContextMenuClick = async (info, tab) => {
        handledClickInfo = info;
        handledClickTab = tab;
      };

      try {
        await ShortcutManager.executeTranslation({
          id: 101,
          windowId: 202,
          url: "https://example.com",
        });

        expect(sentTabMessage).toEqual({
          tabId: 101,
          msg: { action: "getSelectedText" },
        });
        expect(handledClickInfo).toEqual({
          menuItemId: "translateSelection",
          selectionText: "赋能商业闭环",
        });
        expect(handledClickTab.id).toBe(101);
      } finally {
        ContextMenuHandler.handleContextMenuClick = originalHandler;
      }
    });

    test("executeTranslation gracefully handles restricted URLs (chrome://)", async () => {
      let sendMessageCalled = false;
      globalThis.browser = {
        tabs: {
          query: async () => [
            {
              id: 999,
              windowId: 100,
              url: "chrome://extensions/shortcuts",
            },
          ],
          sendMessage: async () => {
            sendMessageCalled = true;
          },
        },
      };

      await ShortcutManager.executeTranslation();
      expect(sendMessageCalled).toBe(false);
    });

    test("saveCurrentShortcut saves both translation and sidepanel shortcuts", async () => {
      let savedData = null;
      globalThis.browser = {
        commands: {
          getAll: async () => [
            { name: "translate-selection", shortcut: "Alt+D" },
            { name: "open-sidepanel", shortcut: "Alt+S" },
          ],
        },
        storage: {
          local: {
            set: async (data) => {
              savedData = data;
            },
          },
        },
      };

      await ShortcutManager.saveCurrentShortcut();
      expect(savedData).toEqual({
        saved_shortcut: "Alt+D",
        saved_sidepanel_shortcut: "Alt+S",
      });
    });
  });
});
