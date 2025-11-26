/**
 * 设置 Store
 *
 * 管理应用配置：
 * - API 设置
 * - 模型选择
 * - 提示词模板
 */
import { create } from "zustand";
import { DEFAULT_SETTINGS } from "../constants";

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  promptTemplate: string;
}

export interface SettingsState {
  // 状态
  settings: Settings;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  shortcut: string;

  // API 测试状态
  testStatus: "idle" | "testing" | "success" | "error";
  testMessage: string;

  // Actions
  setSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  setShortcut: (shortcut: string) => void;
  setTestStatus: (status: "idle" | "testing" | "success" | "error") => void;
  setTestMessage: (message: string) => void;

  // 加载设置（从 storage）
  loadSettings: () => Promise<void>;
  // 保存设置（到 storage）
  saveSettings: () => Promise<boolean>;
}

const defaultSettings: Settings = {
  apiKey: DEFAULT_SETTINGS.apiKey,
  baseUrl: DEFAULT_SETTINGS.baseUrl,
  model: DEFAULT_SETTINGS.model,
  temperature: DEFAULT_SETTINGS.temperature,
  promptTemplate: DEFAULT_SETTINGS.promptTemplate,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...defaultSettings },
  isLoading: false,
  isSaving: false,
  saveStatus: "idle",
  shortcut: "",
  testStatus: "idle",
  testMessage: "",

  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  resetSettings: () => set({ settings: { ...defaultSettings } }),

  setLoading: (loading) => set({ isLoading: loading }),

  setSaving: (saving) => set({ isSaving: saving }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  setShortcut: (shortcut) => set({ shortcut }),

  setTestStatus: (status) => set({ testStatus: status }),

  setTestMessage: (message) => set({ testMessage: message }),

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      // 优先从云端获取
      let result = await browser.storage.sync.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
      ]);

      // 如果云端没有，从本地获取
      if (Object.keys(result).length === 0) {
        result = await browser.storage.local.get([
          "apiKey",
          "baseUrl",
          "model",
          "temperature",
          "promptTemplate",
        ]);
      }

      if (Object.keys(result).length > 0) {
        set((state) => ({
          settings: { ...state.settings, ...result },
        }));
      }

      // 加载快捷键
      try {
        const commands = await browser.commands.getAll();
        const translateCommand = commands.find(
          (cmd: any) => cmd.name === "translate-selection"
        );
        if (translateCommand?.shortcut) {
          set({ shortcut: translateCommand.shortcut });
        }
      } catch (error) {
        console.error("加载快捷键失败:", error);
      }
    } catch (error) {
      console.error("加载设置失败:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveSettings: async () => {
    const { settings } = get();
    set({ isSaving: true, saveStatus: "saving" });

    try {
      // 同时保存到云端和本地
      await Promise.all([
        browser.storage.sync.set(settings),
        browser.storage.local.set(settings),
      ]);

      set({ saveStatus: "saved" });

      // 2 秒后重置状态
      setTimeout(() => {
        set({ saveStatus: "idle" });
      }, 2000);

      return true;
    } catch (error) {
      console.error("保存设置失败:", error);
      set({ saveStatus: "error" });

      setTimeout(() => {
        set({ saveStatus: "idle" });
      }, 2000);

      return false;
    } finally {
      set({ isSaving: false });
    }
  },
}));

export const SETTINGS_STORE_NAME = "settings";

export default useSettingsStore;
