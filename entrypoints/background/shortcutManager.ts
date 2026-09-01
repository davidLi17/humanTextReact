import { openSidePanel } from "@/entrypoints/shared/sidepanelUtils";
import { createLogger } from "@/entrypoints/shared/logger";
import { ContextMenuHandler } from "./contextMenuHandler";

const logger = createLogger("shortcuts", "⌨️");

/**
 * 快捷键管理器
 * 负责处理快捷键相关的功能
 */
export class ShortcutManager {
  /**
   * 保存当前快捷键到存储
   */
  static async saveCurrentShortcut() {
    try {
      const commands = await browser.commands.getAll();
      const translateCommand = commands.find(
        (command: any) => command.name === "translate-selection"
      );
      const shortcut =
        translateCommand && translateCommand.shortcut
          ? translateCommand.shortcut
          : "";

      // 保存到本地存储
      browser.storage.local.set({ saved_shortcut: shortcut }, () => {
        logger.log("快捷键已保存:", shortcut);
      });
    } catch (error) {
      logger.error("保存快捷键信息失败:", error);
    }
  }

  /**
   * 快捷键打开侧边栏
   */
  static async executeOpenSidepanel() {
    try {
      logger.log("⌨️ [ShortcutManager] 快捷键打开侧边栏被触发");
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];
      if (tab?.windowId) {
        await openSidePanel({ windowId: tab.windowId });
      }
    } catch (error) {
      logger.error("❌ [ShortcutManager] 打开侧边栏快捷键失败:", error);
    }
  }

  /**
   * 快捷键翻译功能执行函数
   */
  static async executeTranslation() {
    try {
      logger.log("⌨️ [ShortcutManager] 快捷键翻译被触发", {
        timestamp: new Date().toISOString(),
      });

      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      logger.log("📋 [ShortcutManager] 获取当前标签页", {
        tabId: tab?.id,
        tabUrl: tab?.url?.substring(0, 50) + "...",
        hasTab: !!tab,
      });

      if (tab?.id) {
        logger.log("🔍 [ShortcutManager] 获取当前页面选中的文本");
        // 先获取选中文本
        const response = await browser.tabs.sendMessage(tab.id, {
          action: "getSelectedText",
        });

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
      }
    } catch (error) {
      logger.error("❌ [ShortcutManager] 执行快捷键翻译失败:", error);
    }
  }
}
