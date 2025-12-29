import { defaults } from "lodash-es";
import { DEFAULT_SETTINGS, LogLevel, ThemeMode } from "./constants";
import { createLogger } from "./logger";

const logger = createLogger("shared-settings-utils", "⚙️");

/**
 * 用户设置接口
 */
export interface UserSettings {
  baseUrl: string;
  model: string;
  temperature: number;
  promptTemplate: string;
  apiKey: string;
  thinkingEnabled: boolean;
  logLevel: LogLevel;
  theme: ThemeMode;
}

/**
 * 设置工具类
 * 提供用户设置的获取功能
 */
export class SettingsUtils {
  /**
   * 获取 Browser API（兼容不同运行环境）
   */
  private static getBrowserAPI() {
    return (globalThis as any).browser || browser;
  }

  /**
   * 获取用户设置
   * 支持两种存储格式：
   * 1. 新格式：'settings' 对象下的所有设置
   * 2. 旧格式：直接存储的键值对（向后兼容）
   */
  static async getSettings(): Promise<UserSettings> {
    try {
      logger.log("🔄 [SettingsUtils] 从 Chrome Storage 获取设置");
      const browserAPI = this.getBrowserAPI();

      // 首先尝试新格式（'settings' 对象）
      const { settings: newFormatSettings } = await browserAPI.storage.sync.get(
        "settings"
      );

      if (newFormatSettings && Object.keys(newFormatSettings).length > 0) {
        // 使用 lodash.defaults 合并设置（右侧优先级低）
        const mergedSettings = defaults(
          {},
          newFormatSettings,
          DEFAULT_SETTINGS
        ) as UserSettings;

        logger.log("✅ [SettingsUtils] 新格式设置获取成功", {
          hasApiKey: !!mergedSettings.apiKey,
          thinkingEnabled: mergedSettings.thinkingEnabled,
        });

        return mergedSettings;
      } else {
        // 回退到旧格式（直接存储的键值对）
        logger.log("🔄 [SettingsUtils] 新格式无数据，尝试旧格式");
        return this.getSettingsLegacyFormat(browserAPI);
      }
    } catch (error) {
      logger.error("❌ [SettingsUtils] 获取设置失败:", error);
      // 返回默认设置
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * 使用旧格式（键值对直接存储）获取设置（向后兼容）
   */
  private static async getSettingsLegacyFormat(
    browserAPI: any
  ): Promise<UserSettings> {
    try {
      const keys = Object.keys(DEFAULT_SETTINGS);

      // 尝试从云端获取设置（旧格式）
      const syncSettings = await browserAPI.storage.sync.get(keys);

      if (Object.keys(syncSettings).length > 0) {
        logger.success("从云端获取旧格式设置成功", syncSettings);
        return defaults({}, syncSettings, DEFAULT_SETTINGS) as UserSettings;
      }

      // 如果云端没有设置，尝试从本地获取（旧格式）
      logger.warn("云端没有旧格式设置，尝试从本地获取");
      const localSettings = await browserAPI.storage.local.get(keys);

      if (Object.keys(localSettings).length > 0) {
        logger.success("从本地获取旧格式设置成功", localSettings);
        return defaults({}, localSettings, DEFAULT_SETTINGS) as UserSettings;
      }

      // 如果本地也没有，返回默认设置
      logger.info("使用默认设置", DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    } catch (error) {
      logger.error("获取旧格式设置失败:", error);
      logger.warn("所有设置获取失败，使用默认设置", DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * 获取特定的设置项
   */
  static async getSetting<K extends keyof UserSettings>(
    key: K
  ): Promise<UserSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * 检查是否有 API Key
   */
  static async hasApiKey(): Promise<boolean> {
    const settings = await this.getSettings();
    return !!settings.apiKey && settings.apiKey !== "your_api_key";
  }

  /**
   * 获取思维链设置
   */
  static async getThinkingEnabled(): Promise<boolean> {
    return this.getSetting("thinkingEnabled");
  }

  /**
   * 写入完整设置到 storage.sync 的 'settings' 对象，同时备份到 storage.local
   */
  static async setSettings(newSettings: Partial<UserSettings>): Promise<void> {
    try {
      const browserAPI = this.getBrowserAPI();
      // 读取现有 settings
      const { settings: existing = {} } = await browserAPI.storage.sync.get(
        "settings"
      );
      const merged = defaults(
        {},
        newSettings,
        existing,
        DEFAULT_SETTINGS
      ) as UserSettings;

      await Promise.all([
        browserAPI.storage.sync.set({ settings: merged }),
        browserAPI.storage.local.set({ settings: merged }),
      ]);

      logger.success("✅ [SettingsUtils] 设置已更新", {
        keys: Object.keys(newSettings),
      });
    } catch (error) {
      logger.error("❌ [SettingsUtils] 更新设置失败:", error);
      throw error;
    }
  }

  /**
   * 写入单个设置键
   */
  static async setSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): Promise<void> {
    return this.setSettings({ [key]: value } as Partial<UserSettings>);
  }

  /**
   * 监听设置变化
   */
  static onSettingsChanged(
    callback: (settings: UserSettings) => void
  ): () => void {
    const browserAPI = this.getBrowserAPI();

    const listener = (changes: any) => {
      if (changes.settings) {
        logger.log("🔄 [SettingsUtils] 检测到设置变化");
        this.getSettings().then(callback);
      }
    };

    browserAPI.storage.onChanged.addListener(listener);

    // 返回取消监听的函数
    return () => {
      browserAPI.storage.onChanged.removeListener(listener);
    };
  }
}

/**
 * 快捷方法：获取思维链设置
 */
export const getThinkingEnabled = (): Promise<boolean> => {
  return SettingsUtils.getThinkingEnabled();
};

/**
 * 快捷方法：获取完整设置
 */
export const getUserSettings = (): Promise<UserSettings> => {
  return SettingsUtils.getSettings();
};
