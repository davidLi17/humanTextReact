import {
  MESSAGE_TYPES,
  TranslationRequest,
} from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { createRequestId } from "@/entrypoints/shared/requestProtocol";
import { PopupManager } from "./popupManager";
import { extractPageData } from "./pageExtractor";

const logger = createLogger("content-message", "📨");

export class MessageHandler {
  constructor(private popupManager: PopupManager) {}

  public handleMessage = (
    request: TranslationRequest,
    sender: any,
    sendResponse: (response?: any) => void
  ): boolean => {
    if (request.action === MESSAGE_TYPES.APPEND_DIAGNOSTIC_LOGS) {
      return false;
    }

    logger.log("收到消息", {
      action: request.action,
      hasText: !!request.text,
      requestId: request.requestId,
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

        case MESSAGE_TYPES.EXTRACT_PAGE_CONTENT:
          logger.info("处理提取网页正文请求");
          return this.handleExtractPageContent(sendResponse);

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

  private handleExtractPageContent(
    sendResponse: (response?: any) => void
  ): boolean {
    try {
      const pageData = extractPageData(document, window);
      logger.log("📄 [Content MessageHandler] 提取网页正文成功", {
        title: pageData.title,
        url: pageData.url,
        wordCount: pageData.wordCount,
        contentLength: pageData.content.length,
      });
      sendResponse({
        success: true,
        data: pageData,
      });
    } catch (err: any) {
      logger.error("❌ [Content MessageHandler] 提取正文失败:", err);
      sendResponse({
        success: false,
        error: err?.message || "提取网页内容失败",
      });
    }
    return true;
  }

  private handleShowTranslationPopup = (
    request: TranslationRequest,
    sendResponse: (response?: any) => void
  ): boolean => {
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

    logger.log("✅ [Content MessageHandler] 显示弹窗");
    const displayRequestId = request.requestId || createRequestId();
    this.popupManager.showPopup(
      request.text,
      displayRequestId,
      !request.requestId
    );

    sendResponse({ success: true, requestId: request.requestId });
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
