import { afterEach, describe, expect, test } from "bun:test";
import { SettingsUtils } from "../entrypoints/shared/settingsUtils.ts";

afterEach(() => {
  delete globalThis.browser;
});

describe("SettingsUtils storage fallback", () => {
  test("reads the new settings format from local storage when sync fails", async () => {
    globalThis.browser = {
      storage: {
        sync: {
          get: async () => {
            throw new Error("sync unavailable");
          },
        },
        local: {
          get: async () => ({
            settings: {
              theme: "dark",
              model: "local-model",
            },
          }),
        },
      },
    };

    const settings = await SettingsUtils.getSettings();

    expect(settings.theme).toBe("dark");
    expect(settings.model).toBe("local-model");
  });

  test("keeps the theme locally when sync writes fail", async () => {
    let savedSettings;
    globalThis.browser = {
      storage: {
        sync: {
          get: async () => {
            throw new Error("sync unavailable");
          },
          set: async () => {
            throw new Error("sync unavailable");
          },
        },
        local: {
          get: async () => ({
            settings: {
              model: "local-model",
            },
          }),
          set: async ({ settings }) => {
            savedSettings = settings;
          },
        },
      },
    };

    await SettingsUtils.setSetting("theme", "dark");

    expect(savedSettings.theme).toBe("dark");
    expect(savedSettings.model).toBe("local-model");
  });
});
