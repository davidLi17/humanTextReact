import { MESSAGE_TYPES, TranslationRequest } from "../shared/constants";
import { PopupManager } from "./popupManager";

export class MessageHandler {
  constructor(private popupManager: PopupManager) {}

  public handleMessage = (
    request: TranslationRequest,
    sender: any,
    sendResponse: (response?: any) => void
  ): boolean => {
    console.log("Content script收到消息:", request.action);

    try {
      switch (request.action) {
        case MESSAGE_TYPES.SHOW_TRANSLATION_POPUP:
          return this.handleShowTranslationPopup(request, sendResponse);

        case MESSAGE_TYPES.UPDATE_TRANSLATION:
          return this.handleUpdateTranslation(request, sendResponse);

        case MESSAGE_TYPES.GET_SELECTED_TEXT:
          return this.handleGetSelectedText(sendResponse);

        default:
          sendResponse({ success: false, error: "未知操作" });
          return true;
      }
    } catch (error: any) {
      console.error("处理消息错误:", error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  };

  private handleShowTranslationPopup(
    request: TranslationRequest,
    sendResponse: (response?: any) => void
  ): boolean {
    if (!request.text) {
      sendResponse({ success: false, error: "缺少文本参数" });
      return true;
    }

    const oldPopup = document.querySelector(".translator-popup");
    if (oldPopup) {
      console.log("发现旧的翻译弹窗，先移除");
      browser.runtime.sendMessage({ action: MESSAGE_TYPES.CLEANUP }, () => {
        oldPopup.remove();
        console.log("显示新弹窗");
        this.popupManager.showPopup(request.text!);
        browser.runtime.sendMessage({
          action: MESSAGE_TYPES.TRANSLATE,
          text: request.text,
        });
      });
    } else {
      console.log("显示弹窗");
      this.popupManager.showPopup(request.text);
      browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        text: request.text,
      });
    }

    sendResponse({ success: true });
    return true;
  }

  private handleUpdateTranslation(
    request: TranslationRequest,
    sendResponse: (response?: any) => void
  ): boolean {
    const success = this.popupManager.updateTranslation(request);
    sendResponse({ success });
    return true;
  }

  private handleGetSelectedText(
    sendResponse: (response?: any) => void
  ): boolean {
    console.log("收到获取选中文本的消息");
    const selectedText = window.getSelection()?.toString().trim();
    console.log("选中的文本:", selectedText);

    if (selectedText) {
      console.log("直接显示弹框并开始翻译");
      // 直接显示弹框
      this.popupManager.showPopup(selectedText);
      // 向background发送翻译请求
      browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        text: selectedText,
      });
    } else {
      console.log("没有选中文本");
    }

    sendResponse({ success: true });
    return true;
  }
}
