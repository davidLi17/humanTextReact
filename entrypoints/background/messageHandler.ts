import { MESSAGE_TYPES } from "../shared/constants";
import { TranslationService } from "./translationService";
import { HistoryManager } from "./historyManager";
import { RequestManager } from "./requestManager";
import { ApiService } from "./apiService";
import { ContextMenuManager } from "./contextMenuManager";

/**
 * 消息处理器
 * 负责处理来自各个组件的消息
 */
export class MessageHandler {
  /**
   * 处理运行时消息
   */
  static handleRuntimeMessage(
    request: any,
    sender: any,
    sendResponse: (response?: any) => void
  ): boolean {
    // 处理options页面发来的快捷键更改消息
    if (request.action === "shortcutChanged") {
      ContextMenuManager.createContextMenu();
      sendResponse({ success: true });
      return false;
    }

    if (request.action === MESSAGE_TYPES.GET_HISTORY) {
      HistoryManager.getTranslationHistory()
        .then((history) => {
          sendResponse({ success: true, history });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.TRANSLATE) {
      const tabId = sender.tab?.id;
      TranslationService.translateText(request.text, tabId)
        .then((result) => {
          sendResponse({ success: true, result });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.SHOW_TRANSLATION_POPUP) {
      // 这个消息类型现在主要用于右键菜单
      sendResponse({ success: true });
      return false;
    }

    if (request.action === MESSAGE_TYPES.CLEANUP) {
      const tabId = sender.tab?.id;
      if (tabId) {
        RequestManager.cleanupRequest(tabId);
      }
      sendResponse({ success: true });
      return false;
    }

    if (request.action === MESSAGE_TYPES.DELETE_HISTORY_ITEM) {
      HistoryManager.deleteHistoryItem(request.original)
        .then((success) => {
          sendResponse({ success });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.CLEAR_HISTORY) {
      HistoryManager.clearHistory()
        .then((success) => {
          sendResponse({ success });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.IMPORT_HISTORY) {
      HistoryManager.importHistory(request.history)
        .then((success) => {
          sendResponse({ success });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === "testApiConnection") {
      ApiService.testApiConnection(
        request.apiKey,
        request.baseUrl,
        request.model
      )
        .then((success) => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    return false;
  }
}
