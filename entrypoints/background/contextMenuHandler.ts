import { MESSAGE_TYPES } from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { MessageUtils } from "./messageUtils";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { TranslationService } from "./translationService";
import { RequestManager } from "./requestManager";

const logger = createLogger("context-menu", "🖱️");

/**
 * 右键菜单处理器
 * 负责处理右键菜单点击事件
 */
export class ContextMenuHandler {
  /**
   * 处理右键菜单点击事件
   */
  static async handleContextMenuClick(info: any, tab: any): Promise<void> {
    logger.log("🖱️ [ContextMenuHandler] 右键菜单点击", {
      menuItemId: info.menuItemId,
      tabId: tab?.id,
      selectionText: info.selectionText?.substring(0, 50) + "...",
      timestamp: new Date().toISOString(),
    });

    if (info.menuItemId === "translateSelection" && tab?.id) {
      try {
        const selectedText = info.selectionText;
        if (selectedText) {
          logger.log("📝 [ContextMenuHandler] 准备翻译选中文本", {
            textLength: selectedText.length,
            tabId: tab.id,
          });

          // 获取当前设置，确保思维链状态正确
          const settings = await SettingsUtils.getSettings();
          logger.log("⚙️ [ContextMenuHandler] 获取设置", {
            thinkingEnabled: settings.thinkingEnabled,
            hasApiKey: !!settings.apiKey,
          });

          // 新操作开始前先停止当前标签页的旧请求，避免旧结果进入新弹窗
          RequestManager.cleanupRequest(tab.id);

          // 先显示弹框
          logger.log("🔄 [ContextMenuHandler] 发送显示弹窗消息");
          const popupShown = await MessageUtils.safeSendMessage(tab.id, {
            action: MESSAGE_TYPES.SHOW_TRANSLATION_POPUP,
            text: selectedText,
          });
          if (!popupShown) {
            logger.warn("页面无法接收翻译弹窗消息，终止本次翻译");
            return;
          }

          // 页面只负责显示弹窗，后台是选中文字翻译的唯一请求发起方
          logger.log("🚀 [ContextMenuHandler] 开始翻译", {
            textLength: selectedText.length,
            thinkingEnabled: settings.thinkingEnabled ?? false,
            tabId: tab.id,
          });
          await TranslationService.translateText({
            text: selectedText,
            images: [],
            thinkingEnabled: settings.thinkingEnabled ?? false,
            tabId: tab.id,
          });
        }
      } catch (error: any) {
        logger.error("❌ [ContextMenuHandler] 翻译失败:", error);
      }
    }
  }
}
