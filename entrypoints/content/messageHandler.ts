import {
  MESSAGE_TYPES,
  TranslationRequest,
} from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { PopupManager } from "./popupManager";
import { SettingsUtils } from "./settingsUtils";

const logger = createLogger("content-message", "📨");

export class MessageHandler {
  constructor(private popupManager: PopupManager) {}

  public handleMessage = (
    request: TranslationRequest,
    sender: any,
    sendResponse: (response?: any) => void
  ): boolean => {
    logger.log("收到消息", {
      action: request.action,
      hasText: !!request.text,
      hasContent: !!request.content,
      hasReasoning: !!request.reasoningContent,
      done: request.done,
      timestamp: new Date().toISOString(),
    });

    try {
      switch (request.action) {
        case MESSAGE_TYPES.SHOW_TRANSLATION_POPUP:
          logger.info("处理显示弹窗消息");
          this.handleShowTranslationPopup(request, sendResponse);
          return true;

        case MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION:
          logger.info("处理content翻译更新");
          return this.handleUpdateTranslation(request, sendResponse);

        case MESSAGE_TYPES.GET_SELECTED_TEXT:
          logger.info("处理获取选中文本");
          return this.handleGetSelectedText(sendResponse);

        default:
          logger.warn("未知操作:", request.action);
          sendResponse({ success: false, error: "未知操作" });
          return true;
      }
    } catch (error: any) {
      logger.error("处理消息错误:", error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  };

  private handleShowTranslationPopup = async (
    request: TranslationRequest,
    sendResponse: (response?: any) => void
  ): Promise<boolean> => {
    logger.info("开始处理显示弹窗", {
      hasText: !!request.text,
      textLength: request.text?.length || 0,
      textPreview: request.text?.substring(0, 50) + "...",
    });

    if (!request.text) {
      logger.log("❌ [Content MessageHandler] 缺少文本参数");
      sendResponse({ success: false, error: "缺少文本参数" });
      return true;
    }

    // 获取用户设置，确保传递 thinkingEnabled 等参数
    const userSettings = await SettingsUtils.getSettings();
    logger.log("⚙️ [Content MessageHandler] 获取用户设置", {
      thinkingEnabled: userSettings.thinkingEnabled,
      hasApiKey: !!userSettings.apiKey,
    });

    const oldPopup = document.querySelector(".translator-popup");
    if (oldPopup) {
      logger.log("🔄 [Content MessageHandler] 发现旧的翻译弹窗，先移除");
      browser.runtime.sendMessage({ action: MESSAGE_TYPES.CLEANUP }, () => {
        oldPopup.remove();
        logger.log("✅ [Content MessageHandler] 显示新弹窗");
        this.popupManager.showPopup(request.text!);
        browser.runtime.sendMessage({
          action: MESSAGE_TYPES.TRANSLATE,
          text: request.text,
          thinkingEnabled: userSettings.thinkingEnabled,
          temperature: userSettings.temperature,
          promptTemplate: userSettings.promptTemplate,
          apiKey: userSettings.apiKey,
        });
      });
    } else {
      logger.log("✅ [Content MessageHandler] 显示弹窗");
      this.popupManager.showPopup(request.text);
      browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        text: request.text,
        thinkingEnabled: userSettings.thinkingEnabled,
        temperature: userSettings.temperature,
        promptTemplate: userSettings.promptTemplate,
        apiKey: userSettings.apiKey,
      });
    }

    sendResponse({ success: true });
    return true;
  }

  private handleUpdateTranslation(
    request: TranslationRequest,
    sendResponse: (response?: any) => void
  ): boolean {
    logger.log("🔄 [Content MessageHandler] 处理翻译更新", {
      hasContent: !!request.content,
      contentLength: request.content?.length || 0,
      hasReasoning: !!request.reasoningContent,
      reasoningLength: request.reasoningContent?.length || 0,
      done: request.done,
      error: request.error,
    });

    const success = this.popupManager.updateTranslation(request);
    logger.log("📊 [Content MessageHandler] 更新结果:", { success });
    sendResponse({ success });
    return true;
  }

  private handleGetSelectedText(
    sendResponse: (response?: any) => void
  ): boolean {
    logger.log("📝 [Content MessageHandler] 收到获取选中文本的消息");
    const selectedText = window.getSelection()?.toString().trim();
    logger.log("📋 [Content MessageHandler] 选中的文本", {
      hasText: !!selectedText,
      textLength: selectedText?.length || 0,
      textPreview: selectedText?.substring(0, 50) + "...",
    });

    // 只返回选中的文本，不直接显示弹窗
    sendResponse({
      success: true,
      selectedText: selectedText || null,
    });
    return true;
  }
}
