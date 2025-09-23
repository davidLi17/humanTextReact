import { contentLogger, initializeLogger } from "@/entrypoints/shared/logger";
import { MessageHandler } from "./messageHandler";
import { PopupManager } from "./popupManager";
import { injectStyles } from "./styles";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // 初始化日志系统
    initializeLogger();
    contentLogger.info("人话翻译器 content script 启动");

    // 注入样式
    injectStyles();

    // 初始化管理器
    const popupManager = new PopupManager();
    const messageHandler = new MessageHandler(popupManager);

    // 注册消息监听器
    browser.runtime.onMessage.addListener(messageHandler.handleMessage);

    contentLogger.success("Content script 初始化完成");
  },
});
