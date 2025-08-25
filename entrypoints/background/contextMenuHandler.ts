import { MESSAGE_TYPES } from "../shared/constants";
import { TranslationService } from "./translationService";
import { MessageUtils } from "./messageUtils";

/**
 * 右键菜单处理器
 * 负责处理右键菜单点击事件
 */
export class ContextMenuHandler {
  /**
   * 处理右键菜单点击事件
   */
  static async handleContextMenuClick(info: any, tab: any): Promise<void> {
    if (info.menuItemId === "translateSelection" && tab?.id) {
      try {
        const selectedText = info.selectionText;
        if (selectedText) {
          // 先显示弹框
          await MessageUtils.safeSendMessage(tab.id, {
            action: MESSAGE_TYPES.SHOW_TRANSLATION_POPUP,
            text: selectedText,
          });
          // 然后开始翻译
          await TranslationService.translateText(selectedText, tab.id);
        }
      } catch (error: any) {
        console.error("翻译失败:", error);
        await MessageUtils.safeSendMessage(tab.id, {
          action: MESSAGE_TYPES.UPDATE_TRANSLATION,
          error: error.message,
          done: true,
        });
      }
    }
  }
}
