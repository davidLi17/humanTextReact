import { DEFAULT_SETTINGS } from "./constants";
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
   * 支持两种存储格式：
   * 1. 新格式：'settings' 对象下的所有设置
   * 2. 旧格式：直接存储的键值对（向后兼容）
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
      // 兼容不同的 browser API 访问方式
      const browserAPI = (globalThis as any).browser || browser;

      // 首先尝试新格式（'settings' 对象）
      const newFormatResult = await browserAPI.storage.sync.get('settings');
      const newFormatSettings = newFormatResult.settings || {};

      if (Object.keys(newFormatSettings).length > 0) {
        // 使用新格式
        const mergedSettings: UserSettings = {
          baseUrl: newFormatSettings.baseUrl || DEFAULT_SETTINGS.baseUrl,
          model: newFormatSettings.model || DEFAULT_SETTINGS.model,
          temperature: newFormatSettings.temperature ?? DEFAULT_SETTINGS.temperature,
          promptTemplate: newFormatSettings.promptTemplate || DEFAULT_SETTINGS.promptTemplate,
          apiKey: newFormatSettings.apiKey || DEFAULT_SETTINGS.apiKey,
          thinkingEnabled: newFormatSettings.thinkingEnabled ?? DEFAULT_SETTINGS.thinkingEnabled,
          logLevel: newFormatSettings.logLevel || DEFAULT_SETTINGS.logLevel,
        };

        // 更新缓存
        this.cache = {
          settings: mergedSettings,
          timestamp: Date.now(),
          ttl: this.cache.ttl,
        };

        logger.log("✅ [SettingsUtils] 新格式设置获取成功", {
          hasApiKey: !!mergedSettings.apiKey,
          thinkingEnabled: mergedSettings.thinkingEnabled,
          fromCache: false,
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
   * 使用旧格式（键值对直接存储）获取设置（向后兼容）
   */
  private static async getSettingsLegacyFormat(browserAPI: any): Promise<UserSettings> {
    try {
      // 尝试从云端获取设置（旧格式）
      const syncSettings = await browserAPI.storage.sync.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
        "thinkingEnabled",
        "logLevel",
      ]);

      if (Object.keys(syncSettings).length > 0) {
        // 如果成功获取到云端设置，同时保存到本地作为备份（类似 SettingsManager 的逻辑）
        await browserAPI.storage.local.set(syncSettings);
        logger.success("从云端获取旧格式设置成功", syncSettings);

        const mergedSettings: UserSettings = {
          ...DEFAULT_SETTINGS,
          ...syncSettings,
        };

        // 更新缓存
        this.cache = {
          settings: mergedSettings,
          timestamp: Date.now(),
          ttl: this.cache.ttl,
        };

        return mergedSettings;
      }

      // 如果云端没有设置，尝试从本地获取（旧格式）
      logger.warn("云端没有旧格式设置，尝试从本地获取");
      const localSettings = await browserAPI.storage.local.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
        "thinkingEnabled",
        "logLevel",
      ]);

      if (Object.keys(localSettings).length > 0) {
        logger.success("从本地获取旧格式设置成功", localSettings);

        const mergedSettings: UserSettings = {
          ...DEFAULT_SETTINGS,
          ...localSettings,
        };

        // 更新缓存
        this.cache = {
          settings: mergedSettings,
          timestamp: Date.now(),
          ttl: this.cache.ttl,
        };

        return mergedSettings;
      }

      // 如果本地也没有，返回默认设置
      logger.info("使用默认设置", DEFAULT_SETTINGS);
      const defaultSettings: UserSettings = { ...DEFAULT_SETTINGS };

      // 更新缓存
      this.cache = {
        settings: defaultSettings,
        timestamp: Date.now(),
        ttl: this.cache.ttl,
      };

      return defaultSettings;
    } catch (error) {
      logger.error("获取旧格式设置失败:", error);

      // 如果都失败了，返回默认设置
      logger.warn("所有设置获取失败，使用默认设置", DEFAULT_SETTINGS);
      const defaultSettings: UserSettings = { ...DEFAULT_SETTINGS };

      // 更新缓存
      this.cache = {
        settings: defaultSettings,
        timestamp: Date.now(),
        ttl: this.cache.ttl,
      };

      return defaultSettings;
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

    // 兼容不同的 browser API 访问方式
    const browserAPI = (globalThis as any).browser || browser;
    browserAPI.storage.onChanged.addListener(listener);

    // 返回取消监听的函数
    return () => {
      const browserAPI = (globalThis as any).browser || browser;
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