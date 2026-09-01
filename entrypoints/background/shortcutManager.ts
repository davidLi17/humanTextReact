import {
  isRestrictedUrl,
  openSidePanel,
} from "@/entrypoints/shared/sidepanelUtils";
import { MESSAGE_TYPES } from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { ContextMenuHandler } from "./contextMenuHandler";

const logger = createLogger("shortcuts", "⌨️");

/**
 * 辅助方法：获取当前活动标签页（兼容多种窗口焦点状态）
 */
async function getActiveTabOrLastFocused(): Promise<any | null> {
  const browserApi = (globalThis as any).browser || (globalThis as any).chrome;
  if (!browserApi?.tabs?.query) return null;

  try {
    // 1. 优先尝试 lastFocusedWindow（用户刚刚操作的窗口）
    const tabs = await browserApi.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (tabs && tabs.length > 0 && tabs[0]?.id) {
      return tabs[0];
    }
  } catch (err) {
    logger.warn("通过 lastFocusedWindow 查询标签页失败:", err);
  }

  try {
    // 2. 尝试 currentWindow
    const tabs = await browserApi.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs && tabs.length > 0 && tabs[0]?.id) {
      return tabs[0];
    }
  } catch (err) {
    logger.warn("通过 currentWindow 查询标签页失败:", err);
  }

  try {
    // 3. 兜底获取所有 active 状态中的第一个
    const tabs = await browserApi.tabs.query({ active: true });
    if (tabs && tabs.length > 0 && tabs[0]?.id) {
      return tabs[0];
    }
  } catch (err) {
    logger.warn("查询所有 active 标签页失败:", err);
  }

  return null;
}

/**
 * 快捷键管理器
 * 负责处理快捷键相关的功能
 */
export class ShortcutManager {
  private static isListenerRegistered = false;

  /**
   * 同步注册全局快捷键命令监听（Service Worker 唤醒时必须在顶级同步执行）
   */
  static registerCommandListeners(): void {
    if (this.isListenerRegistered) return;

    const handleCommand = (command: string, tab?: any) => {
      logger.info("⌨️ [ShortcutManager] 快捷键命令触发:", {
        command,
        tabId: tab?.id,
        windowId: tab?.windowId,
        timestamp: new Date().toISOString(),
      });

      if (command === "translate-selection") {
        void this.executeTranslation(tab);
      } else if (command === "open-sidepanel") {
        void this.executeOpenSidepanel(tab);
      }
    };

    const browserApi = (globalThis as any).browser;
    const chromeApi = (globalThis as any).chrome;
    const commandsApi = browserApi?.commands || chromeApi?.commands;

    if (commandsApi?.onCommand?.addListener) {
      commandsApi.onCommand.addListener(handleCommand);
      this.isListenerRegistered = true;
      logger.info("✅ [ShortcutManager] 快捷键监听器同步注册成功");
    } else {
      logger.warn("⚠️ [ShortcutManager] 未检测到 commands API");
    }
  }

  /**
   * 保存当前快捷键到存储
   */
  static async saveCurrentShortcut(): Promise<void> {
    try {
      const browserApi =
        (globalThis as any).browser || (globalThis as any).chrome;
      if (!browserApi?.commands?.getAll) return;

      const commands = await browserApi.commands.getAll();
      const translateCommand = commands?.find(
        (command: any) => command.name === "translate-selection"
      );
      const sidepanelCommand = commands?.find(
        (command: any) => command.name === "open-sidepanel"
      );

      const shortcut = translateCommand?.shortcut || "";
      const sidepanelShortcut = sidepanelCommand?.shortcut || "";

      // 保存到本地存储
      if (browserApi?.storage?.local) {
        await browserApi.storage.local.set({
          saved_shortcut: shortcut,
          saved_sidepanel_shortcut: sidepanelShortcut,
        });
        logger.log("快捷键信息已保存到本地存储:", {
          shortcut,
          sidepanelShortcut,
        });
      }
    } catch (error) {
      logger.error("保存快捷键信息失败:", error);
    }
  }

  /**
   * 快捷键打开侧边栏
   */
  static async executeOpenSidepanel(passedTab?: any): Promise<boolean> {
    try {
      logger.log("⌨️ [ShortcutManager] 快捷键打开侧边栏被触发");
      let tab = passedTab;
      if (!tab?.windowId && !tab?.id) {
        tab = await getActiveTabOrLastFocused();
      }

      logger.log("📋 [ShortcutManager] 打开侧边栏目标信息", {
        tabId: tab?.id,
        windowId: tab?.windowId,
      });

      const opened = await openSidePanel({
        windowId: tab?.windowId,
        tabId: tab?.id,
      });
      return opened;
    } catch (error) {
      logger.error("❌ [ShortcutManager] 打开侧边栏快捷键失败:", error);
      return false;
    }
  }

  /**
   * 快捷键翻译功能执行函数
   */
  static async executeTranslation(passedTab?: any): Promise<void> {
    try {
      logger.log("⌨️ [ShortcutManager] 快捷键翻译被触发", {
        timestamp: new Date().toISOString(),
      });

      let tab = passedTab;
      if (!tab?.id) {
        tab = await getActiveTabOrLastFocused();
      }

      logger.log("📋 [ShortcutManager] 获取当前标签页", {
        tabId: tab?.id,
        tabUrl: tab?.url?.substring(0, 50) + "...",
        hasTab: !!tab,
      });

      if (!tab?.id) {
        logger.warn("⚠️ [ShortcutManager] 未找到有效的活动标签页");
        return;
      }

      if (isRestrictedUrl(tab.url)) {
        logger.warn("⚠️ [ShortcutManager] 受限页面无法进行选中文本翻译", {
          url: tab.url,
        });
        return;
      }

      logger.log("🔍 [ShortcutManager] 获取当前页面选中的文本");
      // 先获取选中文本
      const browserApi =
        (globalThis as any).browser || (globalThis as any).chrome;
      let response: any;
      try {
        response = await browserApi.tabs.sendMessage(tab.id, {
          action: MESSAGE_TYPES.GET_SELECTED_TEXT,
        });
      } catch (sendErr) {
        logger.warn("⚠️ [ShortcutManager] 发送获取选中文本消息失败:", sendErr);
        return;
      }

      logger.log("📝 [ShortcutManager] 获取选中文本结果", {
        hasResponse: !!response,
        hasSelectedText: !!response?.selectedText,
        textLength: response?.selectedText?.length || 0,
        textPreview: response?.selectedText?.substring(0, 50) + "...",
      });

      if (response?.selectedText) {
        logger.log("调用contextMenuHandler处理翻译");
        // 使用标准的翻译流程
        await ContextMenuHandler.handleContextMenuClick(
          {
            menuItemId: "translateSelection",
            selectionText: response.selectedText,
          },
          tab
        );
      } else {
        logger.log("⚠️ [ShortcutManager] 没有选中文本或获取失败");
      }
    } catch (error) {
      logger.error("❌ [ShortcutManager] 执行快捷键翻译失败:", error);
    }
  }
}
