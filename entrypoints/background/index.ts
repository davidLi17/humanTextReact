// 统一导出所有背景脚本模块
export {
  MESSAGE_TYPES,
  DEFAULT_SETTINGS,
  MAX_HISTORY_COUNT,
} from "../shared/constants";
export { SettingsManager } from "./settingsManager";
export { ShortcutManager } from "./shortcutManager";
export { ContextMenuManager } from "./contextMenuManager";
export { RequestManager } from "./requestManager";
export { HistoryManager } from "./historyManager";
export type { HistoryItem } from "./historyManager";
export { ApiService } from "./apiService";
export { MessageUtils } from "./messageUtils";
export { TranslationService } from "./translationService";
export { MessageHandler } from "./messageHandler";
export { ContextMenuHandler } from "./contextMenuHandler";

import { ShortcutManager } from "./shortcutManager";
import { ContextMenuManager } from "./contextMenuManager";
import { MessageHandler } from "./messageHandler";
import { ContextMenuHandler } from "./contextMenuHandler";
import { RequestManager } from "./requestManager";

export default defineBackground(() => {
  console.log("人话翻译器 background script 启动", { id: browser.runtime.id });

  // 创建右键菜单
  browser.runtime.onInstalled.addListener(() => {
    // 初始化快捷键信息到存储
    ShortcutManager.saveCurrentShortcut();

    // 创建右键菜单
    ContextMenuManager.createContextMenu();
  });

  // 监听扩展启动事件，创建右键菜单
  browser.runtime.onStartup.addListener(() => {
    // 创建右键菜单
    ContextMenuManager.createContextMenu();
  });

  // 右键菜单点击处理
  browser.contextMenus.onClicked.addListener(
    ContextMenuHandler.handleContextMenuClick
  );

  // 消息监听器
  browser.runtime.onMessage.addListener(MessageHandler.handleRuntimeMessage);

  // 监听标签页关闭事件
  browser.tabs.onRemoved.addListener((tabId: number) => {
    RequestManager.cleanupRequest(tabId);
  });

  // 监听快捷键命令
  if (browser.commands?.onCommand) {
    browser.commands.onCommand.addListener((command: string) => {
      if (command === "translate-selection") {
        ShortcutManager.executeTranslation();
      }
    });
  }
});
