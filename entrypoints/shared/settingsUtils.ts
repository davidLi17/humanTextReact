import { defaults } from "lodash-es";
import { DEFAULT_SETTINGS, LogLevel, ThemeMode } from "./constants";
import { createLogger } from "./logger";
import { normalizeFontScalePercent } from "./fontScale";

const logger = createLogger("shared-settings-utils", "⚙️");
const FONT_SCALE_STORAGE_KEY = "fontScalePercent";

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
  showSelectionToolbar: boolean;
  contextualSelectionEnabled: boolean;
  logLevel: LogLevel;
  theme: ThemeMode;
  fontScalePercent: number;
}

function normalizeSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    fontScalePercent: normalizeFontScalePercent(settings.fontScalePercent),
  };
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
   * 清理设置缓存。
   * 当前实现每次都直接读取 storage，保留该方法用于兼容调用方。
   */
  static clearCache(): void {}

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

      try {
        const { settings: syncSettings } =
          await browserAPI.storage.sync.get("settings");

        if (syncSettings && Object.keys(syncSettings).length > 0) {
          const mergedSettings = defaults(
            {},
            syncSettings,
            DEFAULT_SETTINGS
          ) as UserSettings;

          logger.log("✅ [SettingsUtils] 同步设置获取成功", {
            hasApiKey: !!mergedSettings.apiKey,
            thinkingEnabled: mergedSettings.thinkingEnabled,
          });

          return this.withStoredFontScale(browserAPI, mergedSettings);
        }
      } catch (error) {
        logger.warn("同步设置读取失败，尝试本地设置", error);
      }

      try {
        const { settings: localSettings } =
          await browserAPI.storage.local.get("settings");

        if (localSettings && Object.keys(localSettings).length > 0) {
          logger.log("✅ [SettingsUtils] 本地设置获取成功");
          return this.withStoredFontScale(
            browserAPI,
            defaults({}, localSettings, DEFAULT_SETTINGS) as UserSettings
          );
        }
      } catch (error) {
        logger.warn("本地设置读取失败，尝试旧格式", error);
      }

      logger.log("🔄 [SettingsUtils] 新格式无数据，尝试旧格式");
      return this.getSettingsLegacyFormat(browserAPI);
    } catch (error) {
      logger.error("❌ [SettingsUtils] 获取设置失败:", error);
      // 返回默认设置
      return normalizeSettings({ ...DEFAULT_SETTINGS });
    }
  }

  /**
   * 使用旧格式（键值对直接存储）获取设置（向后兼容）
   */
  private static async getSettingsLegacyFormat(
    browserAPI: any
  ): Promise<UserSettings> {
    const keys = Object.keys(DEFAULT_SETTINGS);

    try {
      const syncSettings = await browserAPI.storage.sync.get(keys);

      if (Object.keys(syncSettings).length > 0) {
        logger.success("从云端获取旧格式设置成功", syncSettings);
        return this.withStoredFontScale(
          browserAPI,
          defaults({}, syncSettings, DEFAULT_SETTINGS) as UserSettings
        );
      }
    } catch (error) {
      logger.warn("云端旧格式设置读取失败", error);
    }

    try {
      logger.warn("云端没有旧格式设置，尝试从本地获取");
      const localSettings = await browserAPI.storage.local.get(keys);

      if (Object.keys(localSettings).length > 0) {
        logger.success("从本地获取旧格式设置成功", localSettings);
        return this.withStoredFontScale(
          browserAPI,
          defaults({}, localSettings, DEFAULT_SETTINGS) as UserSettings
        );
      }

      logger.info("使用默认设置", DEFAULT_SETTINGS);
      return normalizeSettings({ ...DEFAULT_SETTINGS });
    } catch (error) {
      logger.error("本地旧格式设置读取失败:", error);
      return normalizeSettings({ ...DEFAULT_SETTINGS });
    }
  }

  /** 字号以本机 local 独立键为准，避免 sync 写失败后重开读回旧值。 */
  private static async withStoredFontScale(
    browserAPI: any,
    settings: UserSettings
  ): Promise<UserSettings> {
    let storedValue: unknown;
    try {
      storedValue = (
        await browserAPI.storage.local.get(FONT_SCALE_STORAGE_KEY)
      )?.[FONT_SCALE_STORAGE_KEY];
    } catch (error) {
      logger.warn("读取本地字体大小失败，尝试同步存储", error);
    }
    if (storedValue === undefined) {
      try {
        storedValue = (
          await browserAPI.storage.sync.get(FONT_SCALE_STORAGE_KEY)
        )?.[FONT_SCALE_STORAGE_KEY];
      } catch (error) {
        logger.warn("读取同步字体大小失败，使用设置默认值", error);
      }
    }
    return normalizeSettings({
      ...settings,
      fontScalePercent:
        storedValue === undefined
          ? settings.fontScalePercent
          : normalizeFontScalePercent(storedValue),
    });
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
    return this.isApiKeyConfigured(settings.apiKey);
  }

  /** 判断 Key 是否为可请求服务的真实配置，不输出或记录 Key 内容。 */
  static isApiKeyConfigured(apiKey?: string): boolean {
    const normalized = apiKey?.trim();
    return Boolean(normalized && normalized !== DEFAULT_SETTINGS.apiKey);
  }

  /**
   * 获取思维链设置
   */
  static async getThinkingEnabled(): Promise<boolean> {
    return this.getSetting("thinkingEnabled");
  }

  /**
   * 获取选词快捷操作条设置
   */
  static async getShowSelectionToolbar(): Promise<boolean> {
    const setting = await this.getSetting("showSelectionToolbar");
    return setting ?? DEFAULT_SETTINGS.showSelectionToolbar;
  }

  /**
   * 写入完整设置到 storage.sync 的 'settings' 对象，同时备份到 storage.local
   */
  static async setSettings(newSettings: Partial<UserSettings>): Promise<void> {
    try {
      const browserAPI = this.getBrowserAPI();
      let existing = {};

      try {
        const result = await browserAPI.storage.sync.get("settings");
        existing = result.settings || {};
      } catch (error) {
        logger.warn("读取同步设置失败，使用本地设置合并", error);
      }

      if (Object.keys(existing).length === 0) {
        try {
          const result = await browserAPI.storage.local.get("settings");
          existing = result.settings || {};
        } catch (error) {
          logger.warn("读取本地设置失败，使用默认设置合并", error);
        }
      }

      const merged = defaults(
        {},
        newSettings,
        existing,
        DEFAULT_SETTINGS
      ) as UserSettings;
      merged.fontScalePercent = normalizeFontScalePercent(
        merged.fontScalePercent
      );

      const [syncResult, localResult] = await Promise.allSettled([
        browserAPI.storage.sync.set({ settings: merged }),
        browserAPI.storage.local.set({ settings: merged }),
      ]);

      if (
        syncResult.status === "rejected" &&
        localResult.status === "rejected"
      ) {
        throw localResult.reason || syncResult.reason;
      }
      if (syncResult.status === "rejected") {
        logger.warn("同步设置保存失败，已保存在本地", syncResult.reason);
      }
      if (localResult.status === "rejected") {
        logger.warn("本地设置保存失败，已保存在同步存储", localResult.reason);
      }

      if (
        Object.prototype.hasOwnProperty.call(
          newSettings,
          "fontScalePercent"
        )
      ) {
        await this.setFontScalePercent(newSettings.fontScalePercent);
      }

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
    if (key === "fontScalePercent") {
      return this.setFontScalePercent(value);
    }
    return this.setSettings({ [key]: value } as Partial<UserSettings>);
  }

  /**
   * 字号写入独立键，不重写整包设置；local 是当前设备的读取主源，
   * 成功后再同步到 sync。sync 失败不会让本机重开回退，也不会覆盖其他字段。
   */
  static async setFontScalePercent(value: unknown): Promise<void> {
    const browserAPI = this.getBrowserAPI();
    const normalized = normalizeFontScalePercent(value);
    await browserAPI.storage.local.set({
      [FONT_SCALE_STORAGE_KEY]: normalized,
    });
    try {
      await browserAPI.storage.sync.set({
        [FONT_SCALE_STORAGE_KEY]: normalized,
      });
    } catch (error) {
      logger.warn("字体大小已保存在本机，但同步存储写入失败", error);
    }
  }

  /**
   * 监听设置变化
   */
  static onSettingsChanged(
    callback: (settings: UserSettings) => void
  ): () => void {
    const browserAPI = this.getBrowserAPI();
    const onChanged = browserAPI.storage?.onChanged;
    if (!onChanged?.addListener || !onChanged?.removeListener) {
      return () => {};
    }
    let active = true;

    const listener = (changes: any) => {
      if (changes.settings || changes[FONT_SCALE_STORAGE_KEY]) {
        logger.log("🔄 [SettingsUtils] 检测到设置变化");
        // 整包 settings 事件中可能仍带旧字号；始终合并独立权威字号键。
        void this.getSettings().then((settings) => {
          if (active) callback(settings);
        });
      }
    };

    onChanged.addListener(listener);

    // 返回取消监听的函数
    return () => {
      active = false;
      onChanged.removeListener(listener);
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
 * 快捷方法：获取选词快捷操作条设置
 */
export const getShowSelectionToolbar = (): Promise<boolean> => {
  return SettingsUtils.getShowSelectionToolbar();
};

/**
 * 快捷方法：获取完整设置
 */
export const getUserSettings = (): Promise<UserSettings> => {
  return SettingsUtils.getSettings();
};
