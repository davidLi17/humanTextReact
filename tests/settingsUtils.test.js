import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  SettingsUtils,
  getThinkingEnabled,
  getShowSelectionToolbar,
  getUserSettings,
} from "../entrypoints/shared/settingsUtils.ts";
import { DEFAULT_SETTINGS } from "../entrypoints/shared/constants/index.ts";
import { preserveGlobals } from "./helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("browser");

afterEach(() => {
  restoreGlobals();
});

describe("SettingsUtils", () => {
  describe("getSettings and fallback hierarchy", () => {
    test("reads from sync storage and merges with DEFAULT_SETTINGS when sync settings exist", async () => {
      globalThis.browser = {
        storage: {
          sync: {
            get: async (key) => {
              if (key === "settings") {
                return {
                  settings: {
                    apiKey: "sk-sync-123",
                    model: "kimi-k2-custom",
                    thinkingEnabled: true,
                  },
                };
              }
              return {};
            },
          },
          local: {
            get: async () => ({}),
          },
        },
      };

      const settings = await SettingsUtils.getSettings();
      expect(settings.apiKey).toBe("sk-sync-123");
      expect(settings.model).toBe("kimi-k2-custom");
      expect(settings.thinkingEnabled).toBe(true);
      expect(settings.baseUrl).toBe(DEFAULT_SETTINGS.baseUrl);
      expect(settings.temperature).toBe(DEFAULT_SETTINGS.temperature);
      expect(settings.showSelectionToolbar).toBe(DEFAULT_SETTINGS.showSelectionToolbar);
      expect(settings.contextualSelectionEnabled).toBe(false);
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(settings.logLevel).toBe(DEFAULT_SETTINGS.logLevel);
    });

    test("falls back to local storage 'settings' when sync storage throws or is empty", async () => {
      globalThis.browser = {
        storage: {
          sync: {
            get: async () => {
              throw new Error("QuotaExceededError");
            },
          },
          local: {
            get: async (key) => {
              if (key === "settings") {
                return {
                  settings: {
                    apiKey: "sk-local-456",
                    temperature: 0.2,
                    showSelectionToolbar: false,
                  },
                };
              }
              return {};
            },
          },
        },
      };

      const settings = await SettingsUtils.getSettings();
      expect(settings.apiKey).toBe("sk-local-456");
      expect(settings.temperature).toBe(0.2);
      expect(settings.showSelectionToolbar).toBe(false);
      expect(settings.model).toBe(DEFAULT_SETTINGS.model);
    });

    test("falls back to legacy format in sync storage when new format is missing", async () => {
      globalThis.browser = {
        storage: {
          sync: {
            get: async (key) => {
              if (key === "settings") return {};
              // Legacy format: keys directly requested
              if (Array.isArray(key)) {
                return {
                  apiKey: "sk-legacy-sync",
                  model: "legacy-model",
                };
              }
              return {};
            },
          },
          local: {
            get: async () => ({}),
          },
        },
      };

      const settings = await SettingsUtils.getSettings();
      expect(settings.apiKey).toBe("sk-legacy-sync");
      expect(settings.model).toBe("legacy-model");
      expect(settings.temperature).toBe(DEFAULT_SETTINGS.temperature);
    });

    test("falls back to legacy format in local storage when sync legacy fails or is empty", async () => {
      globalThis.browser = {
        storage: {
          sync: {
            get: async () => ({}),
          },
          local: {
            get: async (key) => {
              if (key === "settings") return {};
              if (Array.isArray(key)) {
                return {
                  apiKey: "sk-legacy-local",
                  theme: "dark",
                };
              }
              return {};
            },
          },
        },
      };

      const settings = await SettingsUtils.getSettings();
      expect(settings.apiKey).toBe("sk-legacy-local");
      expect(settings.theme).toBe("dark");
      expect(settings.model).toBe(DEFAULT_SETTINGS.model);
    });

    test("returns full DEFAULT_SETTINGS when all storage operations throw or are empty", async () => {
      globalThis.browser = {
        storage: {
          sync: {
            get: async () => {
              throw new Error("Sync failure");
            },
          },
          local: {
            get: async () => {
              throw new Error("Local failure");
            },
          },
        },
      };

      const settings = await SettingsUtils.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("getSetting and getter helpers", () => {
    beforeEach(() => {
      globalThis.browser = {
        storage: {
          sync: {
            get: async (key) => {
              if (key === "settings") {
                return {
                  settings: {
                    apiKey: "sk-valid-key",
                    thinkingEnabled: true,
                    showSelectionToolbar: false,
                    theme: "dark",
                  },
                };
              }
              return {};
            },
          },
          local: {
            get: async () => ({}),
          },
        },
      };
    });

    test("getSetting returns specific field value", async () => {
      expect(await SettingsUtils.getSetting("apiKey")).toBe("sk-valid-key");
      expect(await SettingsUtils.getSetting("theme")).toBe("dark");
      expect(await SettingsUtils.getSetting("model")).toBe(DEFAULT_SETTINGS.model);
    });

    test("hasApiKey returns true for valid non-default key and false for default/empty", async () => {
      expect(await SettingsUtils.hasApiKey()).toBe(true);

      // Default key
      globalThis.browser.storage.sync.get = async () => ({
        settings: { apiKey: "your_api_key" },
      });
      expect(await SettingsUtils.hasApiKey()).toBe(false);

      // Empty key
      globalThis.browser.storage.sync.get = async () => ({
        settings: { apiKey: "" },
      });
      expect(await SettingsUtils.hasApiKey()).toBe(false);

      expect(SettingsUtils.isApiKeyConfigured("   ")).toBe(false);
      expect(SettingsUtils.isApiKeyConfigured("  your_api_key  ")).toBe(false);
      expect(SettingsUtils.isApiKeyConfigured("  sk-real-key  ")).toBe(true);
    });

    test("getThinkingEnabled and getShowSelectionToolbar return correct flags", async () => {
      expect(await SettingsUtils.getThinkingEnabled()).toBe(true);
      expect(await SettingsUtils.getShowSelectionToolbar()).toBe(false);
      expect(await getThinkingEnabled()).toBe(true);
      expect(await getShowSelectionToolbar()).toBe(false);
    });

    test("getUserSettings returns the complete UserSettings object", async () => {
      const settings = await getUserSettings();
      expect(settings.apiKey).toBe("sk-valid-key");
      expect(settings.theme).toBe("dark");
    });

  });

  describe("setSettings and setSetting", () => {
    test("字号独立保存不重写其他设置，sync 失败后本机重开仍读取 local 新值", async () => {
      const syncSettings = {
        apiKey: "sk-kept",
        theme: "light",
        fontScalePercent: 100,
      };
      const localStore = {
        settings: { ...syncSettings },
      };
      let settingsObjectWriteCount = 0;

      globalThis.browser = {
        storage: {
          sync: {
            get: async (key) =>
              key === "settings" ? { settings: syncSettings } : {},
            set: async () => {
              throw new Error("sync unavailable");
            },
          },
          local: {
            get: async (key) => {
              if (key === "settings") return { settings: localStore.settings };
              if (key === "fontScalePercent") {
                return { fontScalePercent: localStore.fontScalePercent };
              }
              return {};
            },
            set: async (payload) => {
              if (payload.settings) settingsObjectWriteCount += 1;
              Object.assign(localStore, payload);
            },
          },
        },
      };

      await SettingsUtils.setFontScalePercent(130);
      const reopened = await SettingsUtils.getSettings();
      expect(reopened.fontScalePercent).toBe(130);
      expect(reopened.apiKey).toBe("sk-kept");
      expect(reopened.theme).toBe("light");
      expect(settingsObjectWriteCount).toBe(0);
    });

    test("本机字号写入失败会明确拒绝，不假装已经保存", async () => {
      let syncWriteCalled = false;
      globalThis.browser = {
        storage: {
          local: {
            set: async () => {
              throw new Error("local font write failed");
            },
          },
          sync: {
            set: async () => {
              syncWriteCalled = true;
            },
          },
        },
      };

      await expect(SettingsUtils.setFontScalePercent(120)).rejects.toThrow(
        "local font write failed"
      );
      expect(syncWriteCalled).toBe(false);
    });

    test("writes merged settings to both sync and local storage", async () => {
      let syncPayload = null;
      let localPayload = null;

      globalThis.browser = {
        storage: {
          sync: {
            get: async () => ({
              settings: { model: "prev-model" },
            }),
            set: async (payload) => {
              syncPayload = payload;
            },
          },
          local: {
            get: async () => ({
              settings: { model: "prev-model" },
            }),
            set: async (payload) => {
              localPayload = payload;
            },
          },
        },
      };

      await SettingsUtils.setSettings({
        apiKey: "sk-new-key",
        temperature: 0.9,
      });

      expect(syncPayload).not.toBeNull();
      expect(localPayload).not.toBeNull();
      expect(syncPayload.settings.apiKey).toBe("sk-new-key");
      expect(syncPayload.settings.temperature).toBe(0.9);
      expect(syncPayload.settings.model).toBe("prev-model");
      expect(localPayload.settings.apiKey).toBe("sk-new-key");
    });

    test("setSetting modifies a single key", async () => {
      let savedSettings = null;

      globalThis.browser = {
        storage: {
          sync: {
            get: async () => ({ settings: {} }),
            set: async ({ settings }) => {
              savedSettings = settings;
            },
          },
          local: {
            get: async () => ({ settings: {} }),
            set: async () => {},
          },
        },
      };

      await SettingsUtils.setSetting("theme", "light");
      expect(savedSettings.theme).toBe("light");
      expect(savedSettings.model).toBe(DEFAULT_SETTINGS.model);
    });

    test("succeeds when sync storage set fails but local storage succeeds", async () => {
      let localSaved = null;

      globalThis.browser = {
        storage: {
          sync: {
            get: async () => {
              throw new Error("sync read err");
            },
            set: async () => {
              throw new Error("sync write err");
            },
          },
          local: {
            get: async () => ({ settings: { model: "local-orig" } }),
            set: async ({ settings }) => {
              localSaved = settings;
            },
          },
        },
      };

      await SettingsUtils.setSettings({ theme: "dark" });
      expect(localSaved.theme).toBe("dark");
      expect(localSaved.model).toBe("local-orig");
    });

    test("succeeds when local storage set fails but sync storage succeeds", async () => {
      let syncSaved = null;

      globalThis.browser = {
        storage: {
          sync: {
            get: async () => ({ settings: {} }),
            set: async ({ settings }) => {
              syncSaved = settings;
            },
          },
          local: {
            get: async () => ({ settings: {} }),
            set: async () => {
              throw new Error("local write err");
            },
          },
        },
      };

      await SettingsUtils.setSettings({ thinkingEnabled: true });
      expect(syncSaved.thinkingEnabled).toBe(true);
    });

    test("throws error when both sync and local storage sets fail", async () => {
      globalThis.browser = {
        storage: {
          sync: {
            get: async () => ({ settings: {} }),
            set: async () => {
              throw new Error("sync write critical error");
            },
          },
          local: {
            get: async () => ({ settings: {} }),
            set: async () => {
              throw new Error("local write critical error");
            },
          },
        },
      };

      expect(
        SettingsUtils.setSettings({ apiKey: "sk-fail" })
      ).rejects.toThrow();
    });
  });

  describe("onSettingsChanged", () => {
    test("subscribes and receives updated settings on storage change", async () => {
      let registeredListener = null;
      let removedListener = null;

      globalThis.browser = {
        storage: {
          sync: {
            get: async () => ({
              settings: {
                apiKey: "sk-changed-key",
                theme: "dark",
              },
            }),
          },
          local: {
            get: async () => ({}),
          },
          onChanged: {
            addListener: (listener) => {
              registeredListener = listener;
            },
            removeListener: (listener) => {
              removedListener = listener;
            },
          },
        },
      };

      let resolveSettings;
      const receivedSettings = new Promise((resolve) => {
        resolveSettings = resolve;
      });
      const unsubscribe = SettingsUtils.onSettingsChanged(resolveSettings);

      expect(registeredListener).not.toBeNull();

      // Trigger change with newValue
      registeredListener({
        settings: {
          newValue: {
            apiKey: "sk-changed-key",
            theme: "dark",
          },
        },
      });

      const settings = await receivedSettings;
      expect(settings.apiKey).toBe("sk-changed-key");
      expect(settings.theme).toBe("dark");
      expect(settings.model).toBe(DEFAULT_SETTINGS.model);

      unsubscribe();
      expect(removedListener).toBe(registeredListener);
    });

    test("re-fetches settings when changes.settings does not have newValue", async () => {
      let registeredListener = null;

      globalThis.browser = {
        storage: {
          sync: {
            get: async () => ({
              settings: { model: "refetched-model" },
            }),
          },
          local: {
            get: async () => ({ settings: {} }),
          },
          onChanged: {
            addListener: (listener) => {
              registeredListener = listener;
            },
            removeListener: () => {},
          },
        },
      };

      let resolveSettings;
      const receivedSettings = new Promise((resolve) => {
        resolveSettings = resolve;
      });
      const unsubscribe = SettingsUtils.onSettingsChanged(resolveSettings);

      // Trigger change with null newValue
      registeredListener({
        settings: {
          newValue: null,
        },
      });

      const settings = await receivedSettings;
      expect(settings.model).toBe("refetched-model");
      unsubscribe();
    });

    test("异步设置读取开始后取消订阅，读取完成也不会迟到回调", async () => {
      let registeredListener = null;
      let resolveSyncRead;
      let markLocalRead;
      const localReadCompleted = new Promise((resolve) => {
        markLocalRead = resolve;
      });
      globalThis.browser = {
        storage: {
          sync: {
            get: () =>
              new Promise((resolve) => {
                resolveSyncRead = resolve;
              }),
          },
          local: {
            get: async () => {
              markLocalRead();
              return {};
            },
          },
          onChanged: {
            addListener: (listener) => {
              registeredListener = listener;
            },
            removeListener: () => {},
          },
        },
      };

      let callbackCount = 0;
      const unsubscribe = SettingsUtils.onSettingsChanged(() => {
        callbackCount += 1;
      });
      registeredListener({ settings: { newValue: { theme: "dark" } } });
      unsubscribe();
      resolveSyncRead({ settings: { theme: "dark" } });
      await localReadCompleted;
      await Promise.resolve();
      expect(callbackCount).toBe(0);
    });

    test("先调字号再改主题时，整包 settings 事件不会把权威字号回灌为旧值", async () => {
      let registeredListener = null;
      globalThis.browser = {
        storage: {
          sync: {
            get: async (key) =>
              key === "settings"
                ? { settings: { theme: "dark", fontScalePercent: 100 } }
                : {},
          },
          local: {
            get: async (key) =>
              key === "fontScalePercent" ? { fontScalePercent: 130 } : {},
          },
          onChanged: {
            addListener: (listener) => {
              registeredListener = listener;
            },
            removeListener: () => {},
          },
        },
      };

      let resolveSettings;
      const received = new Promise((resolve) => {
        resolveSettings = resolve;
      });
      const unsubscribe = SettingsUtils.onSettingsChanged(resolveSettings);
      registeredListener({
        settings: {
          newValue: { theme: "dark", fontScalePercent: 100 },
        },
      });

      const settings = await received;
      expect(settings.theme).toBe("dark");
      expect(settings.fontScalePercent).toBe(130);
      unsubscribe();
    });

    test("ignores changes that do not involve settings key", () => {
      let registeredListener = null;

      globalThis.browser = {
        storage: {
          onChanged: {
            addListener: (listener) => {
              registeredListener = listener;
            },
            removeListener: () => {},
          },
        },
      };

      let callbackCalled = false;
      const unsubscribe = SettingsUtils.onSettingsChanged(() => {
        callbackCalled = true;
      });

      registeredListener({
        otherKey: { newValue: "someValue" },
      });

      expect(callbackCalled).toBe(false);
      unsubscribe();
    });
  });
});
