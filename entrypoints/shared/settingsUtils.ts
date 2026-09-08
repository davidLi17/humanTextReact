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

interface StoredSettings extends Partial<UserSettings> {
  updatedAt?: number;
}

function normalizeSettings(
  settings: Partial<UserSettings> & { updatedAt?: number }
): UserSettings {
  return {
    baseUrl: settings.baseUrl ?? DEFAULT_SETTINGS.baseUrl,
    model: settings.model ?? DEFAULT_SETTINGS.model,
    temperature: settings.temperature ?? DEFAULT_SETTINGS.temperature,
    promptTemplate: settings.promptTemplate ?? DEFAULT_SETTINGS.promptTemplate,
    apiKey: settings.apiKey ?? DEFAULT_SETTINGS.apiKey,
    thinkingEnabled:
      settings.thinkingEnabled ?? DEFAULT_SETTINGS.thinkingEnabled,
    showSelectionToolbar:
      settings.showSelectionToolbar ?? DEFAULT_SETTINGS.showSelectionToolbar,
    contextualSelectionEnabled:
      settings.contextualSelectionEnabled ??
      DEFAULT_SETTINGS.contextualSelectionEnabled,
    logLevel: settings.logLevel ?? DEFAULT_SETTINGS.logLevel,
    theme: settings.theme ?? DEFAULT_SETTINGS.theme,
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
   *
   * 权威源策略：
   * - 敏感密钥 apiKey 严格且仅保存在 storage.local，绝不进入 storage.sync；
   * - 读取时对比时间戳 updatedAt：
   *   - 若 sync 设置存在且拥有更新的时间戳（来自多设备云端同步），采用 sync 偏好设置，但 apiKey 仍以本机 local 为准；
   *   - 若 local 拥有更新或相等的时间戳，或无时间戳时，以本机 local 为第一权威源；
   *   - 当 sync 写入失败但 local 成功时，local 具有最新时间戳且权威优先，绝不回滚读取 sync 旧值。
   */
  static async getSettings(): Promise<UserSettings> {
    try {
      logger.log("🔄 [SettingsUtils] 从 Chrome Storage 获取设置");
      const browserAPI = this.getBrowserAPI();

      const [syncResult, localResult] = await Promise.allSettled([
        browserAPI.storage.sync.get("settings"),
        browserAPI.storage.local.get("settings"),
      ]);

      let syncSettings: (StoredSettings & Record<string, any>) | null = null;
      let localSettings: (StoredSettings & Record<string, any>) | null = null;

      if (syncResult.status === "fulfilled") {
        const val = syncResult.value?.settings;
        if (val && Object.keys(val).length > 0) {
          syncSettings = { ...val };
        }
      } else {
        logger.warn("同步设置读取失败", syncResult.reason);
      }

      if (localResult.status === "fulfilled") {
        const val = localResult.value?.settings;
        if (val && Object.keys(val).length > 0) {
          localSettings = { ...val };
        }
      } else {
        logger.warn("本地设置读取失败", localResult.reason);
      }

      // 如果 localSettings 缺少 apiKey，尝试从 local 顶层 apiKey 读取
      if (!localSettings?.apiKey) {
        try {
          const localTopKey = await browserAPI.storage.local.get("apiKey");
          if (localTopKey?.apiKey) {
            localSettings = { ...localSettings, apiKey: localTopKey.apiKey };
          }
        } catch {}
      }

      const hasLocal = !!localSettings && Object.keys(localSettings).length > 0;
      const hasSync = !!syncSettings && Object.keys(syncSettings).length > 0;

      if (hasLocal || hasSync) {
        let resolved: StoredSettings;

        if (hasLocal && hasSync) {
          const localUpdated = Number(localSettings?.updatedAt) || 0;
          const syncUpdated = Number(syncSettings?.updatedAt) || 0;

          if (syncUpdated > localUpdated) {
            // 云端同步更新较新（来自其他设备同步）：应用云端偏好设置，但敏感 apiKey 始终以本地为准
            resolved = defaults(
              {},
              localSettings?.apiKey ? { apiKey: localSettings.apiKey } : {},
              syncSettings,
              localSettings,
              DEFAULT_SETTINGS
            );
          } else {
            // 本地时间戳更新或相等，或无时间戳时：以本地设置为主权威源
            resolved = defaults(
              {},
              localSettings,
              syncSettings,
              DEFAULT_SETTINGS
            );
          }
        } else if (hasLocal) {
          resolved = defaults({}, localSettings, DEFAULT_SETTINGS);
        } else {
          resolved = defaults({}, syncSettings, DEFAULT_SETTINGS);
        }

        // 兼容旧版本迁移：若本地无有效 apiKey，而云端曾遗留有效 apiKey，暂存使用并避免丢失
        if (
          !this.isApiKeyConfigured(resolved.apiKey) &&
          this.isApiKeyConfigured(syncSettings?.apiKey)
        ) {
          resolved.apiKey = syncSettings!.apiKey;
        }

        const normalized = normalizeSettings(resolved as UserSettings);
        return this.withStoredFontScale(browserAPI, normalized);
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

    let syncSettings: Record<string, any> = {};
    let localSettings: Record<string, any> = {};

    try {
      syncSettings = await browserAPI.storage.sync.get(keys);
    } catch (error) {
      logger.warn("云端旧格式设置读取失败", error);
    }

    try {
      localSettings = await browserAPI.storage.local.get(keys);
    } catch (error) {
      logger.warn("本地旧格式设置读取失败", error);
    }

    const hasSync = syncSettings && Object.keys(syncSettings).length > 0;
    const hasLocal = localSettings && Object.keys(localSettings).length > 0;

    if (hasLocal || hasSync) {
      // 本地优先合并，同步存储补充，再合入默认配置
      const merged = defaults(
        {},
        localSettings,
        syncSettings,
        DEFAULT_SETTINGS
      ) as UserSettings;
      return this.withStoredFontScale(browserAPI, normalizeSettings(merged));
    }

    logger.info("使用默认设置", DEFAULT_SETTINGS);
    return normalizeSettings({ ...DEFAULT_SETTINGS });
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
   * 写入设置：
   * - storage.local：强行且仅在此处保存包含敏感 apiKey 的完整配置（加注时间戳，作为本机权威源）；
   * - storage.sync：严格剔除 apiKey，并调用 storage.sync.remove('apiKey') 清理可能遗留的敏感字段；
   * - 异常隔离：当 sync 失败但 local 成功时仍视为保存成功，下次读取时 local 权威优先，绝不回滚旧值。
   */
  static async setSettings(newSettings: Partial<UserSettings>): Promise<void> {
    try {
      const browserAPI = this.getBrowserAPI();
      let existing: StoredSettings = {};

      // 优先从本地读取现有设置以保留本地权威配置及敏感 apiKey
      const [localSettingsResult, syncSettingsResult] =
        await Promise.allSettled([
          browserAPI.storage.local.get("settings"),
          browserAPI.storage.sync.get("settings"),
        ]);

      if (
        localSettingsResult.status === "fulfilled" &&
        localSettingsResult.value?.settings &&
        Object.keys(localSettingsResult.value.settings).length > 0
      ) {
        existing = { ...localSettingsResult.value.settings };
      }

      if (!existing.apiKey) {
        try {
          const localKey = await browserAPI.storage.local.get("apiKey");
          if (localKey?.apiKey) {
            existing.apiKey = localKey.apiKey;
          }
        } catch {}
      }

      if (Object.keys(existing).length === 0 || !existing.apiKey) {
        if (
          syncSettingsResult.status === "fulfilled" &&
          syncSettingsResult.value?.settings
        ) {
          existing = defaults({}, existing, syncSettingsResult.value.settings);
        }
      }

      const now = Date.now();
      const merged = defaults(
        {},
        newSettings,
        existing,
        DEFAULT_SETTINGS
      ) as UserSettings & { updatedAt?: number };

      merged.fontScalePercent = normalizeFontScalePercent(
        merged.fontScalePercent
      );
      merged.updatedAt = now;

      // 1. 本地存储：完整配置，包含敏感 apiKey 与当前时间戳，作为本机第一权威
      const localSettings = { ...merged };

      // 2. 同步存储：严格剔除 apiKey，绝不同步密钥至云端
      const syncSettings: Record<string, any> = { ...merged };
      delete syncSettings.apiKey;

      const [syncResult, localResult] = await Promise.allSettled([
        (async () => {
          await browserAPI.storage.sync.set({ settings: syncSettings });
          // 清理 storage.sync 中可能遗留的旧 apiKey 顶层字段
          if (typeof browserAPI.storage?.sync?.remove === "function") {
            try {
              await browserAPI.storage.sync.remove("apiKey");
            } catch (removeError) {
              logger.warn("清理同步存储遗留 apiKey 失败", removeError);
            }
          }
        })(),
        browserAPI.storage.local.set({ settings: localSettings }),
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
      if (
        changes.settings ||
        changes[FONT_SCALE_STORAGE_KEY] ||
        changes.apiKey
      ) {
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
