import { openSidePanel } from "@/entrypoints/shared/sidepanelUtils";
import { MESSAGE_TYPES } from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { MessageUtils } from "./messageUtils";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { TranslationService } from "./translationService";
import { RequestManager } from "./requestManager";
import {
  createRequestId,
  createSelectionTarget,
} from "@/entrypoints/shared/requestProtocol";
import {
  normalizeSelectionContext,
  type SelectionContext,
} from "@/entrypoints/shared/selectionContext";

const logger = createLogger("context-menu", "🖱️");

export async function getSelectionContextForFrame(
  info: any,
  tabId: number,
  selectedText: string
): Promise<SelectionContext | undefined> {
  const supplied = normalizeSelectionContext(info.selectionContext, selectedText);
  if (supplied) return supplied;
  if (info.selectionContextCaptured === true) return undefined;

  try {
    const browserApi =
      (globalThis as any).browser || (globalThis as any).chrome;
    const message = {
      action: MESSAGE_TYPES.GET_SELECTED_TEXT,
      expectedSelectedText: selectedText,
      includeSelectionContext: true,
    };
    const response =
      typeof info.frameId === "number"
        ? await browserApi.tabs.sendMessage(tabId, message, {
            frameId: info.frameId,
          })
        : await browserApi.tabs.sendMessage(tabId, message);
    if (response?.selectedText !== selectedText.trim()) return undefined;
    return normalizeSelectionContext(response.selectionContext, selectedText);
  } catch {
    return undefined;
  }
}

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

    if (info.menuItemId === "readPageInSidepanel" && tab?.windowId) {
      try {
        await openSidePanel({ windowId: tab.windowId });
        await browser.storage.local.set({
          pendingWebPageRead: {
            timestamp: Date.now(),
            tabId: tab.id,
          },
        });
        // 必须用常量：此前这里写的是字面量 "readCurrentWebPage"，而侧边栏比对的是
        // MESSAGE_TYPES.READ_WEB_PAGE（"readWebPage"），消息永远匹配不上，
        // 导致「侧边栏已打开时右键通读」没有任何反应。
        void MessageUtils.sendRuntimeMessage({
          action: MESSAGE_TYPES.READ_WEB_PAGE,
          tabId: tab.id,
        });
      } catch (error) {
        logger.error("❌ [ContextMenuHandler] 触发侧边栏通读网页失败:", error);
      }
      return;
    }

    if (
      (info.menuItemId === "openSidepanel" ||
        info.menuItemId === "openSidepanelTranslate") &&
      tab?.windowId
    ) {
      try {
        const openPromise = openSidePanel({ windowId: tab.windowId });
        const settings = await SettingsUtils.getSettings();
        const selectionContext =
          settings.contextualSelectionEnabled && info.selectionText && tab.id
            ? await getSelectionContextForFrame(info, tab.id, info.selectionText)
            : undefined;
        const envelopeId = createRequestId();
        await openPromise;
        if (info.selectionText) {
          await browser.storage.local.set({
            pendingSidepanelText: {
              text: info.selectionText,
              selectionContext,
              envelopeId,
              timestamp: Date.now(),
            },
          });
          // 也尝试直接通过 runtime 消息通知可能已经处于激活状态的 sidepanel
          void MessageUtils.sendRuntimeMessage({
            action: "sendToSidepanel",
            text: info.selectionText,
            selectionContext,
            envelopeId,
          });
        }
      } catch (error) {
        logger.error("❌ [ContextMenuHandler] 打开侧边栏失败:", error);
      }
      return;
    }

    if (info.menuItemId === "translateSelection" && tab?.id) {
      let requestId: string | undefined;
      try {
        const selectedText = info.selectionText;
        if (selectedText) {
          requestId = createRequestId();
          const target = createSelectionTarget(tab.id);
          RequestManager.createRequest(requestId, target);

          logger.log("📝 [ContextMenuHandler] 准备翻译选中文本", {
            requestId,
            textLength: selectedText.length,
            tabId: tab.id,
          });

          // 获取当前设置，确保思维链状态正确
          const settings = await SettingsUtils.getSettings();
          const selectionContext = settings.contextualSelectionEnabled
            ? await getSelectionContextForFrame(info, tab.id, selectedText)
            : undefined;
          logger.log("⚙️ [ContextMenuHandler] 获取设置", {
            thinkingEnabled: settings.thinkingEnabled,
            hasApiKey: !!settings.apiKey,
          });

          // 设置读取期间可能已经出现同目标的新请求，旧请求不能再覆盖新弹窗。
          if (!RequestManager.isActiveRequest(requestId)) {
            logger.log("请求已被同目标的新操作替换", { requestId });
            return;
          }

          // 先显示弹框
          logger.log("🔄 [ContextMenuHandler] 发送显示弹窗消息");
          const popupDelivery =
            await MessageUtils.safeSendMessageWithResponse<{
              requestId?: string;
            }>(tab.id, {
              action: MESSAGE_TYPES.SHOW_TRANSLATION_POPUP,
              requestId,
              text: selectedText,
              selectionContext,
              deferTranslation: false,
            });
          if (!popupDelivery.delivered) {
            logger.warn("页面无法接收翻译弹窗消息，终止本次翻译");
            RequestManager.cleanupRequest(requestId);
            return;
          }

          if (popupDelivery.response?.requestId !== requestId) {
            // 旧脚本可能会补发无 ID translate/cleanup，先让这些消息完成调度。
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // 旧 Content Script 可能已经领取并启动该请求。
          const requestContext = RequestManager.claimRequest(requestId);
          if (!requestContext) {
            logger.log("请求已被兼容链路领取或取消", { requestId });
            return;
          }

          // 页面只负责显示弹窗，后台是选中文字翻译的唯一请求发起方
          logger.log("🚀 [ContextMenuHandler] 开始翻译", {
            textLength: selectedText.length,
            thinkingEnabled: settings.thinkingEnabled ?? false,
            tabId: tab.id,
          });
          await TranslationService.translateText(
            {
              text: selectedText,
              images: [],
              thinkingEnabled: settings.thinkingEnabled ?? false,
              selectionContext,
            },
            requestContext
          );
        }
      } catch (error: any) {
        if (requestId) {
          RequestManager.cleanupRequest(requestId);
        }
        logger.error("❌ [ContextMenuHandler] 翻译失败:", error);
      }
    }
  }
}
