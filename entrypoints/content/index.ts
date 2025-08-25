import { injectStyles } from "./styles";
import { PopupManager } from "./popupManager";
import { MessageHandler } from "./messageHandler";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("人话翻译器 content script 启动");

    // 注入样式
    injectStyles();

    // 初始化管理器
    const popupManager = new PopupManager();
    const messageHandler = new MessageHandler(popupManager);

    // 注册消息监听器
    browser.runtime.onMessage.addListener(messageHandler.handleMessage);

    console.log("Content script 初始化完成");
  },
});
