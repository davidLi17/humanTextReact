import { MESSAGE_TYPES } from "@/entrypoints/shared/constants";
import { TranslationService } from "./translationService";
import { HistoryManager } from "./historyManager";
import { RequestManager } from "./requestManager";
import { ApiService } from "./apiService";
import { ContextMenuManager } from "./contextMenuManager";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { isNil } from "lodash-es";

/**
 * 消息处理器类型定义
 */
type MessageHandlerFn = (
  request: any,
  sender: Browser.runtime.MessageSender
) => Promise<any> | any;

/**
 * 消息处理器
 * 负责处理来自各个组件的消息
 */
export class MessageHandler {
  /**
   * 消息处理器映射表（策略模式）
   */
  private static handlers: Record<string, MessageHandlerFn> = {
    // 快捷键更改
    shortcutChanged: async () => {
      ContextMenuManager.createContextMenu();
      return { success: true };
    },
    // 获取历史记录
    [MESSAGE_TYPES.GET_HISTORY]: async () => {
      const history = await HistoryManager.getTranslationHistory();
      return { success: true, history };
    },
    // 翻译
    [MESSAGE_TYPES.TRANSLATE]: async (request, sender) => {
      console.log(
        "🔍LHG:background/messageHandler[MESSAGE_TYPES.TRANSLATE] request:::",
        request
      );
      console.log(
        "🔍LHG:background/messageHandler[MESSAGE_TYPES.TRANSLATE] sender:::",
        sender
      );
      const tabId = sender.tab?.id;

      // 如果请求中没有传递 thinkingEnabled，则从设置中获取
      let thinkingEnabled = request.thinkingEnabled;
      if (isNil(thinkingEnabled)) {
        const settings = await SettingsUtils.getSettings();
        thinkingEnabled = settings.thinkingEnabled;
      }

      // 构建翻译参数，支持新的多模态格式
      const translationParams = {
        text: request.text,
        images: request.images || [],
        thinkingEnabled,
        temperature: request.temperature,
        promptTemplate: request.promptTemplate,
        apiKey: request.apiKey,
        tabId,
      };

      const result = await TranslationService.translateText(translationParams);
      return { success: true, result };
    },
    // 显示翻译弹窗（主要用于右键菜单）
    [MESSAGE_TYPES.SHOW_TRANSLATION_POPUP]: async () => {
      return { success: true };
    },
    // 清理请求
    [MESSAGE_TYPES.CLEANUP]: async (request, sender) => {
      const tabId = request.tabId ?? sender.tab?.id;
      RequestManager.cleanupRequest(tabId);
      return { success: true };
    },
    // 删除历史记录项
    [MESSAGE_TYPES.DELETE_HISTORY_ITEM]: async (request) => {
      const success = await HistoryManager.deleteHistoryItem(request.original);
      return { success };
    },
    // 清空历史记录
    [MESSAGE_TYPES.CLEAR_HISTORY]: async () => {
      const success = await HistoryManager.clearHistory();
      return { success };
    },
    // 导入历史记录
    [MESSAGE_TYPES.IMPORT_HISTORY]: async (request) => {
      const success = await HistoryManager.importHistory(request.history);
      return { success };
    },
    // 测试 API 连接
    testApiConnection: async (request) => {
      await ApiService.testApiConnection(
        request.apiKey,
        request.baseUrl,
        request.model
      );
      return { success: true };
    },
  };

  /**
   * 处理运行时消息（统一调度器）
   */
  static handleRuntimeMessage(
    request: any,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    const handler = this.handlers[request.action];
    // 未找到处理器
    if (!handler) {
      return false;
    }
    // 执行处理器（统一 async/await + try/catch）
    (async () => {
      try {
        const result = await handler(request, sender);
        sendResponse(result);
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 表示异步响应
  }
}

