import { contentLogger, initializeLogger } from "@/entrypoints/shared/logger";
import { MessageHandler } from "./messageHandler";
import { PopupManager } from "./popupManager";
import { SelectionActionBar } from "./selectionActionBar";
import { initContentShortcuts } from "./shortcutListener";
import { injectStyles } from "./styles";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // 初始化日志系统
    void initializeLogger("content");
    contentLogger.info("人话翻译器 content script 启动");

    // 注入样式
    injectStyles();

    // 初始化管理器
    const popupManager = new PopupManager();
    const selectionActionBar = new SelectionActionBar(popupManager);
    selectionActionBar.init();

    const messageHandler = new MessageHandler(popupManager);

    // 注册消息监听器
    browser.runtime.onMessage.addListener(messageHandler.handleMessage);

    // 注册网页内快捷键双通道监听器（彻底解决快捷键失灵）
    initContentShortcuts(popupManager);

    contentLogger.success("Content script 初始化完成");
  },
});
