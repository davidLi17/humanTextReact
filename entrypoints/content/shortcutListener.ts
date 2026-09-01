import { MESSAGE_TYPES } from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { createRequestId } from "@/entrypoints/shared/requestProtocol";
import type { PopupManager } from "./popupManager";

const logger = createLogger("content-shortcuts", "⌨️");

/**
 * 判定键盘事件是否匹配 Alt+H（翻译选中文本）
 * 兼容 macOS Option+H 产生的特殊字符 '˙' 以及各系统键盘布局
 */
export function isTranslateShortcut(e: KeyboardEvent): boolean {
  if (!e.altKey || e.ctrlKey || e.metaKey) return false;
  return (
    e.code === "KeyH" ||
    e.key?.toLowerCase() === "h" ||
    e.key === "˙"
  );
}

/**
 * 判定键盘事件是否匹配 Alt+S（打开侧边栏）
 * 兼容 macOS Option+S 产生的德文字符 'ß' 以及各系统键盘布局
 */
export function isOpenSidepanelShortcut(e: KeyboardEvent): boolean {
  if (!e.altKey || e.ctrlKey || e.metaKey) return false;
  return (
    e.code === "KeyS" ||
    e.key?.toLowerCase() === "s" ||
    e.key === "ß"
  );
}

/**
 * 获取当前页面中用户选中的文本（支持普通 DOM 划词和输入框/文本框内的选中文本）
 */
export function getSelectedTextFromPage(): string {
  // 1. 标准 DOM 划词
  const domSelection = window.getSelection()?.toString().trim();
  if (domSelection) return domSelection;

  // 2. Input / Textarea 内部选中
  const activeEl = document.activeElement as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (
    activeEl &&
    (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") &&
    typeof activeEl.selectionStart === "number" &&
    typeof activeEl.selectionEnd === "number" &&
    activeEl.selectionEnd > activeEl.selectionStart
  ) {
    const inputSelection = activeEl.value
      .substring(activeEl.selectionStart, activeEl.selectionEnd)
      .trim();
    if (inputSelection) return inputSelection;
  }

  return "";
}

/**
 * 在 Content Script 注入层初始化快捷键监听（双通道保活机制）
 */
export function initContentShortcuts(popupManager: PopupManager): () => void {
  let lastTranslateTriggerTime = 0;
  let lastSidepanelTriggerTime = 0;
  const THROTTLE_MS = 350;

  const handleKeyDown = async (e: KeyboardEvent) => {
    const now = Date.now();

    // 1. 匹配 Alt+H：翻译选中文本
    if (isTranslateShortcut(e)) {
      if (now - lastTranslateTriggerTime < THROTTLE_MS) {
        e.preventDefault();
        return;
      }
      lastTranslateTriggerTime = now;

      const selectedText = getSelectedTextFromPage();
      logger.info("⌨️ [Content Shortcut] 捕获 Alt+H 划词翻译快捷键", {
        hasSelectedText: !!selectedText,
        textLength: selectedText.length,
      });

      if (selectedText) {
        e.preventDefault();
        e.stopPropagation();

        const requestId = createRequestId();
        // 立即在当前页面展现翻译弹窗
        popupManager.showPopup(selectedText, requestId);

        // 向后台发起翻译请求
        const browserApi =
          (globalThis as any).browser || (globalThis as any).chrome;
        try {
          await browserApi.runtime.sendMessage({
            action: MESSAGE_TYPES.TRANSLATE,
            text: selectedText,
            requestId,
          });
        } catch (err) {
          logger.error("❌ [Content Shortcut] 发送翻译请求失败:", err);
        }
      }
      return;
    }

    // 2. 匹配 Alt+S：打开侧边栏
    if (isOpenSidepanelShortcut(e)) {
      if (now - lastSidepanelTriggerTime < THROTTLE_MS) {
        e.preventDefault();
        return;
      }
      lastSidepanelTriggerTime = now;

      logger.info("⌨️ [Content Shortcut] 捕获 Alt+S 打开侧边栏快捷键");
      e.preventDefault();
      e.stopPropagation();

      const selectedText = getSelectedTextFromPage();
      const browserApi =
        (globalThis as any).browser || (globalThis as any).chrome;

      try {
        if (selectedText && browserApi?.storage?.local) {
          await browserApi.storage.local.set({
            pendingSidepanelText: {
              text: selectedText,
              timestamp: Date.now(),
            },
          });
        }

        await browserApi.runtime.sendMessage({
          action: MESSAGE_TYPES.OPEN_SIDEPANEL,
        });
      } catch (err) {
        logger.error("❌ [Content Shortcut] 请求打开侧边栏失败:", err);
      }
    }
  };

  // 使用 capture 模式以确保优先捕获按键事件
  window.addEventListener("keydown", handleKeyDown, true);
  logger.info("✅ [Content Shortcut] 网页快捷键双通道监听已就绪 (Alt+H, Alt+S)");

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
  };
}
