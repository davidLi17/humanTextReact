import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  SettingsUtils,
  getThinkingEnabled,
  getShowSelectionToolbar,
  getUserSettings,
} from "../entrypoints/shared/settingsUtils.ts";
import { DEFAULT_SETTINGS } from "../entrypoints/shared/constants/index.ts";

afterEach(() => {
  delete globalThis.browser;
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

    test("clearCache executes without error", () => {
      expect(() => SettingsUtils.clearCache()).not.toThrow();
    });
  });

  describe("setSettings and setSetting", () => {
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

      let receivedSettings = null;
      const unsubscribe = SettingsUtils.onSettingsChanged((settings) => {
        receivedSettings = settings;
      });

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

      expect(receivedSettings).not.toBeNull();
      expect(receivedSettings.apiKey).toBe("sk-changed-key");
      expect(receivedSettings.theme).toBe("dark");
      expect(receivedSettings.model).toBe(DEFAULT_SETTINGS.model);

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

      let receivedSettings = null;
      SettingsUtils.onSettingsChanged((settings) => {
        receivedSettings = settings;
      });

      // Trigger change with null newValue
      await registeredListener({
        settings: {
          newValue: null,
        },
      });

      // Allow promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(receivedSettings).not.toBeNull();
      expect(receivedSettings.model).toBe("refetched-model");
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
      SettingsUtils.onSettingsChanged(() => {
        callbackCalled = true;
      });

      registeredListener({
        otherKey: { newValue: "someValue" },
      });

      expect(callbackCalled).toBe(false);
    });
  });
});
