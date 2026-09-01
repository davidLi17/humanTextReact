// 统一导出所有背景脚本模块
export {
  DEFAULT_SETTINGS,
  MAX_HISTORY_COUNT,
  MESSAGE_TYPES,
} from "@/entrypoints/shared/constants";
export { ApiService } from "./apiService";
export { ContextMenuHandler } from "./contextMenuHandler";
export { ContextMenuManager } from "./contextMenuManager";
export { HistoryManager } from "./historyManager";
export type { HistoryItem } from "./historyManager";
export { MessageHandler } from "./messageHandler";
export { MessageUtils } from "./messageUtils";
export { RequestManager } from "./requestManager";
// SettingsManager 已被替换为 SettingsUtils (shared/settingsUtils.ts)
export { ShortcutManager } from "./shortcutManager";
export { TranslationService } from "./translationService";

import {
  backgroundLogger,
  initializeLogger,
} from "@/entrypoints/shared/logger";
import { ContextMenuHandler } from "./contextMenuHandler";
import { ContextMenuManager } from "./contextMenuManager";
import { MessageHandler } from "./messageHandler";
import { RequestManager } from "./requestManager";
import { ShortcutManager } from "./shortcutManager";

export default defineBackground(() => {
  // 初始化日志系统
  void initializeLogger("background");

  backgroundLogger.info("人话翻译器 background script 启动", {
    id: browser.runtime.id,
  });

  // 1. 同步注册全局快捷键命令监听器（确保在 Service Worker 唤醒时不会漏掉任何事件）
  ShortcutManager.registerCommandListeners();

  // 2. 消息监听器
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    return MessageHandler.handleRuntimeMessage(request, sender, sendResponse);
  });

  // 3. 右键菜单点击处理
  browser.contextMenus.onClicked.addListener(
    ContextMenuHandler.handleContextMenuClick
  );

  // 4. 监听扩展安装/更新事件
  browser.runtime.onInstalled.addListener(() => {
    backgroundLogger.info("扩展安装完成，开始初始化");

    // 初始化快捷键信息到存储
    void ShortcutManager.saveCurrentShortcut();

    // 创建右键菜单
    ContextMenuManager.createContextMenu();

    backgroundLogger.success("扩展初始化完成");
  });

  // 5. 监听扩展启动事件，创建右键菜单并同步快捷键
  browser.runtime.onStartup.addListener(() => {
    backgroundLogger.info("扩展启动");
    // 同步快捷键信息
    void ShortcutManager.saveCurrentShortcut();
    // 创建右键菜单
    ContextMenuManager.createContextMenu();
  });

  // 6. 监听标签页关闭事件
  browser.tabs.onRemoved.addListener((tabId: number) => {
    backgroundLogger.info("标签页关闭，清理请求", { tabId });
    RequestManager.cleanupTab(tabId);
  });

  backgroundLogger.success("背景脚本所有监听器注册完成");
});
