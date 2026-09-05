import {
  openSidePanel,
  toggleSidePanel,
} from "@/entrypoints/shared/sidepanelUtils";
import { MESSAGE_TYPES } from "@/entrypoints/shared/constants";
import { TranslationService } from "./translationService";
import { HistoryManager } from "./historyManager";
import { JargonVault } from "@/entrypoints/shared/jargonVault";
import { RequestManager } from "./requestManager";
import { ApiService } from "./apiService";
import { ContextMenuManager } from "./contextMenuManager";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  appendDiagnosticRecords,
  clearDiagnosticRecords,
  getDiagnosticRecords,
  normalizeDiagnosticRecord,
  summarizeDiagnosticRecords,
} from "@/entrypoints/shared/logger/diagnostics";
import {
  POPUP_TRANSLATION_TARGET,
  SIDEPANEL_TRANSLATION_TARGET,
  createRequestId,
  createSelectionTarget,
  createSidepanelTarget,
  type TranslationTarget,
} from "@/entrypoints/shared/requestProtocol";
import { isNil } from "lodash-es";

function getRequestTarget(
  request: any,
  sender: Browser.runtime.MessageSender
): TranslationTarget {
  if (request.targetKind === "sidepanel" || request.source === "sidepanel") {
    return createSidepanelTarget(request.sessionId);
  }
  const tabId = sender.tab?.id ?? request.tabId;
  return typeof tabId === "number"
    ? createSelectionTarget(tabId)
    : POPUP_TRANSLATION_TARGET;
}

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
      const target = getRequestTarget(request, sender);
      let requestId =
        typeof request.requestId === "string" && request.requestId
          ? request.requestId
          : undefined;

      // 旧 Content Script 会在展示弹窗后再发一次无 ID 的 translate。
      if (!requestId && target.kind === "tab") {
        requestId = RequestManager.getActiveRequestId(target);
      }

      requestId ||= createRequestId();
      const pendingContext = RequestManager.createRequest(requestId, target);
      const requestContext = RequestManager.claimRequest(requestId);
      if (!requestContext) {
        return {
          success: true,
          requestId: pendingContext.requestId,
          deduplicated: true,
        };
      }

      try {
        // 如果请求中没有传递 thinkingEnabled，则从设置中获取
        let thinkingEnabled = request.thinkingEnabled;
        if (isNil(thinkingEnabled)) {
          const settings = await SettingsUtils.getSettings();
          thinkingEnabled = settings.thinkingEnabled;
        }

        // 构建翻译参数，支持新的多模态格式与多轮消息格式
        const translationParams = {
          text: request.text,
          messages: request.messages,
          images: request.images || [],
          thinkingEnabled,
          temperature: request.temperature,
          promptTemplate: request.promptTemplate,
          apiKey: request.apiKey,
        };

        const result = await TranslationService.translateText(
          translationParams,
          requestContext
        );
        return { success: true, requestId, result };
      } finally {
        // TranslationService 会正常完成自身；这里覆盖设置读取等前置失败。
        RequestManager.completeRequest(requestId);
      }
    },
    // 显示翻译弹窗（主要用于右键菜单）
    [MESSAGE_TYPES.SHOW_TRANSLATION_POPUP]: async () => {
      return { success: true };
    },
    // 打开侧边栏
    [MESSAGE_TYPES.OPEN_SIDEPANEL]: async (request, sender) => {
      try {
        const tabId = sender.tab?.id ?? request.tabId;
        const windowId = sender.tab?.windowId ?? request.windowId;
        const opened = await openSidePanel({ windowId, tabId });
        return { success: opened };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    // 快捷键切换侧边栏；普通按钮和右键菜单继续使用 OPEN_SIDEPANEL
    [MESSAGE_TYPES.TOGGLE_SIDEPANEL]: async (request, sender) => {
      try {
        const tabId = sender.tab?.id ?? request.tabId;
        const windowId = sender.tab?.windowId ?? request.windowId;
        const toggled = await toggleSidePanel({ windowId, tabId });
        return { success: toggled };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    // 清理请求
    [MESSAGE_TYPES.CLEANUP]: async (request, sender) => {
      if (
        typeof request.requestId === "string" &&
        RequestManager.cleanupRequest(request.requestId)
      ) {
        return { success: true, requestId: request.requestId };
      }

      // 兼容没有 requestId 的旧 Popup 和旧 Content Script。
      if (!request.requestId) {
        RequestManager.cleanupTarget(getRequestTarget(request, sender));
      }
      return { success: true, requestId: request.requestId };
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
    [MESSAGE_TYPES.APPEND_DIAGNOSTIC_LOGS]: async (request) => {
      const records = Array.isArray(request.records)
        ? request.records
            .slice(0, 50)
            .map(normalizeDiagnosticRecord)
            .filter(Boolean)
        : [];
      await appendDiagnosticRecords(records);
      return { success: true, accepted: records.length };
    },
    [MESSAGE_TYPES.GET_DIAGNOSTIC_LOGS]: async () => {
      const records = await getDiagnosticRecords();
      const summary = summarizeDiagnosticRecords(records);
      return { success: true, records, summary };
    },
    [MESSAGE_TYPES.CLEAR_DIAGNOSTIC_LOGS]: async () => {
      await clearDiagnosticRecords();
      return { success: true };
    },
    // 保存/添加黑话生词条目
    [MESSAGE_TYPES.SAVE_JARGON_ITEM]: async (request) => {
      const item = await JargonVault.addJargon(request.item);
      return { success: true, item };
    },
    // 获取生词列表
    [MESSAGE_TYPES.GET_JARGON_LIST]: async (request) => {
      const list = await JargonVault.getJargonList(
        request.query,
        request.category,
        request.starredOnly
      );
      return { success: true, list };
    },
    // 更新生词条目
    [MESSAGE_TYPES.UPDATE_JARGON_ITEM]: async (request) => {
      const item = await JargonVault.updateJargon(request.id, request.updates);
      return { success: true, item };
    },
    // 删除生词条目
    [MESSAGE_TYPES.DELETE_JARGON_ITEM]: async (request) => {
      const success = await JargonVault.deleteJargon(request.id);
      return { success };
    },
    // 切换生词星标状态
    [MESSAGE_TYPES.TOGGLE_JARGON_STAR]: async (request) => {
      const item = await JargonVault.toggleStar(request.id);
      return { success: true, item };
    },
    // 导出生词本
    [MESSAGE_TYPES.EXPORT_JARGON]: async (request) => {
      const format = request.format === "json" ? "json" : "markdown";
      const data =
        format === "json"
          ? await JargonVault.exportJargonAsJson()
          : await JargonVault.exportJargonAsMarkdown();
      return { success: true, format, data };
    },
    // 导入生词本
    [MESSAGE_TYPES.IMPORT_JARGON]: async (request) => {
      const result = await JargonVault.importJargonFromJson(
        request.jsonStr || request.data
      );
      return result;
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

