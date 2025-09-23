import { DEFAULT_SETTINGS } from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";

const logger = createLogger("content-settings-utils", "⚙️");

/**
 * 用户设置接口
 */
interface UserSettings {
  baseUrl: string;
  model: string;
  temperature: number;
  promptTemplate: string;
  apiKey: string;
  thinkingEnabled: boolean;
  logLevel: string;
}

/**
 * 设置缓存
 */
interface SettingsCache {
  settings: UserSettings | null;
  timestamp: number;
  ttl: number; // 缓存时间（毫秒）
}

/**
 * 设置工具类
 * 提供用户设置的获取和缓存功能
 */
export class SettingsUtils {
  private static cache: SettingsCache = {
    settings: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5分钟缓存
  };

  /**
   * 获取用户设置
   * 优先从缓存获取，缓存失效后从 Chrome Storage 获取
   */
  static async getSettings(): Promise<UserSettings> {
    // 检查缓存是否有效
    if (this.cache.settings && (Date.now() - this.cache.timestamp) < this.cache.ttl) {
      logger.log("📦 [SettingsUtils] 使用缓存的设置");
      return this.cache.settings;
    }

    try {
      logger.log("🔄 [SettingsUtils] 从 Chrome Storage 获取设置");
      const result = await browser.storage.sync.get('settings');
      const settings = result.settings || {};

      // 合并默认设置
      const mergedSettings: UserSettings = {
        baseUrl: settings.baseUrl || DEFAULT_SETTINGS.baseUrl,
        model: settings.model || DEFAULT_SETTINGS.model,
        temperature: settings.temperature ?? DEFAULT_SETTINGS.temperature,
        promptTemplate: settings.promptTemplate || DEFAULT_SETTINGS.promptTemplate,
        apiKey: settings.apiKey || DEFAULT_SETTINGS.apiKey,
        thinkingEnabled: settings.thinkingEnabled ?? DEFAULT_SETTINGS.thinkingEnabled,
        logLevel: settings.logLevel || DEFAULT_SETTINGS.logLevel,
      };

      // 更新缓存
      this.cache = {
        settings: mergedSettings,
        timestamp: Date.now(),
        ttl: this.cache.ttl,
      };

      logger.log("✅ [SettingsUtils] 设置获取成功", {
        hasApiKey: !!mergedSettings.apiKey,
        thinkingEnabled: mergedSettings.thinkingEnabled,
        fromCache: false,
      });

      return mergedSettings;
    } catch (error) {
      logger.error("❌ [SettingsUtils] 获取设置失败:", error);
      // 返回默认设置
      return {
        baseUrl: DEFAULT_SETTINGS.baseUrl,
        model: DEFAULT_SETTINGS.model,
        temperature: DEFAULT_SETTINGS.temperature,
        promptTemplate: DEFAULT_SETTINGS.promptTemplate,
        apiKey: DEFAULT_SETTINGS.apiKey,
        thinkingEnabled: DEFAULT_SETTINGS.thinkingEnabled,
        logLevel: DEFAULT_SETTINGS.logLevel,
      };
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
    return this.getSetting('thinkingEnabled');
  }

  /**
   * 清除缓存
   */
  static clearCache(): void {
    logger.log("🧹 [SettingsUtils] 清除设置缓存");
    this.cache.settings = null;
    this.cache.timestamp = 0;
  }

  /**
   * 监听设置变化
   */
  static onSettingsChanged(callback: (settings: UserSettings) => void): () => void {
    const listener = (changes: any) => {
      if (changes.settings) {
        logger.log("🔄 [SettingsUtils] 检测到设置变化");
        this.clearCache();
        this.getSettings().then(callback);
      }
    };

    browser.storage.onChanged.addListener(listener);

    // 返回取消监听的函数
    return () => {
      browser.storage.onChanged.removeListener(listener);
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