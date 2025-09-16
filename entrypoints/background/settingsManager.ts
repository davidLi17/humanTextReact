import { DEFAULT_SETTINGS } from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";

const logger = createLogger("settings-manager", "⚙️");

/**
 * 设置管理器
 * 负责处理扩展设置的获取和保存
 */
export class SettingsManager {
  /**
   * 获取设置，优先从云端获取，失败时从本地获取
   */
  static async getSettings() {
    try {
      // 尝试从云端获取设置
      const syncSettings = await browser.storage.sync.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
        "thinkingEnabled",
        "logLevel",
      ]);

      // 如果成功获取到云端设置，同时保存到本地作为备份
      if (Object.keys(syncSettings).length > 0) {
        await browser.storage.local.set(syncSettings);
        logger.success("从云端获取设置成功", syncSettings);
        return { ...DEFAULT_SETTINGS, ...syncSettings };
      }

      // 如果云端没有设置，尝试从本地获取
      logger.warn("云端没有设置，尝试从本地获取");
      const localSettings = await browser.storage.local.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
        "thinkingEnabled",
        "logLevel",
      ]);

      if (Object.keys(localSettings).length > 0) {
        logger.success("从本地获取设置成功", localSettings);
        return { ...DEFAULT_SETTINGS, ...localSettings };
      }

      // 如果本地也没有，返回默认设置
      logger.info("使用默认设置", DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    } catch (error) {
      logger.error("获取云端设置失败，尝试从本地获取:", error);

      try {
        const localSettings = await browser.storage.local.get([
          "apiKey",
          "baseUrl",
          "model",
          "temperature",
          "promptTemplate",
          "thinkingEnabled",
          "logLevel",
        ]);
        logger.success("备用本地设置获取成功", localSettings);
        return { ...DEFAULT_SETTINGS, ...localSettings };
      } catch (localError) {
        logger.error("获取本地设置也失败:", localError);
      }

      // 如果都失败了，返回默认设置
      logger.warn("所有设置获取失败，使用默认设置", DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
  }
}
