import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
} from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { createRequestId } from "@/entrypoints/shared/requestProtocol";
import type { PopupManager } from "./popupManager";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { extractSelectionContext } from "./selectionContextExtractor";

const logger = createLogger("content-shortcuts", "⌨️");

/**
 * 判定键盘事件是否匹配 Alt/Option+D（翻译选中文本）
 * 通过物理键位 code 兼容 macOS Option+D 产生的特殊字符 '∂' 和不同键盘布局
 */
export function isTranslateShortcut(e: KeyboardEvent): boolean {
  if (!e.altKey || e.ctrlKey || e.metaKey) return false;
  return (
    e.code === "KeyD" ||
    e.key?.toLowerCase() === "d" ||
    e.key === "∂"
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

function isJargonEditorInputTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  const input = element?.closest?.("input, textarea");
  return Boolean(input?.closest?.(".translator-jargon-editor"));
}

/**
 * 在 Content Script 注入层初始化快捷键监听（双通道保活机制）
 */
export function initContentShortcuts(popupManager: PopupManager): () => void {
  let lastTranslateTriggerTime = 0;
  let lastSidepanelTriggerTime = 0;
  const THROTTLE_MS = 350;
  let contextualSelectionEnabled: boolean =
    DEFAULT_SETTINGS.contextualSelectionEnabled;
  void SettingsUtils.getSettings().then((settings) => {
    contextualSelectionEnabled = settings.contextualSelectionEnabled === true;
  });
  const unsubscribeSettings = SettingsUtils.onSettingsChanged((settings) => {
    contextualSelectionEnabled = settings.contextualSelectionEnabled === true;
  });

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (isJargonEditorInputTarget(e.target)) return;

    const now = Date.now();

    // 1. 匹配 Alt/Option+D：翻译选中文本
    if (isTranslateShortcut(e)) {
      if (now - lastTranslateTriggerTime < THROTTLE_MS) {
        e.preventDefault();
        return;
      }
      lastTranslateTriggerTime = now;

      const selectedText = getSelectedTextFromPage();
      logger.info("⌨️ [Content Shortcut] 捕获 Alt/Option+D 划词翻译快捷键", {
        hasSelectedText: !!selectedText,
        textLength: selectedText.length,
      });

      if (selectedText) {
        e.preventDefault();
        e.stopPropagation();

        const requestId = createRequestId();
        const selectionContext = contextualSelectionEnabled
          ? extractSelectionContext(document, window, selectedText)
          : undefined;
        const settings = await SettingsUtils.getSettings();
        const useContext = Boolean(
          settings.contextualSelectionEnabled && selectionContext
        );
        popupManager.showPopup(
          selectedText,
          requestId,
          false,
          useContext ? selectionContext : undefined,
          false
        );

        // 向后台发起翻译请求
        const browserApi =
          (globalThis as any).browser || (globalThis as any).chrome;
        try {
          await browserApi.runtime.sendMessage({
            action: MESSAGE_TYPES.TRANSLATE,
            text: selectedText,
            requestId,
            selectionContext: useContext ? selectionContext : undefined,
            thinkingEnabled: settings.thinkingEnabled ?? false,
            prismMode: settings.prismModeEnabled ?? false,
          });
        } catch (err) {
          logger.error("❌ [Content Shortcut] 发送翻译请求失败:", err);
        }
      }
      return;
    }

    // 2. 匹配 Alt/Option+S：切换侧边栏
    if (isOpenSidepanelShortcut(e)) {
      if (now - lastSidepanelTriggerTime < THROTTLE_MS) {
        e.preventDefault();
        return;
      }
      lastSidepanelTriggerTime = now;

      logger.info("⌨️ [Content Shortcut] 捕获 Alt/Option+S 侧边栏快捷键");
      e.preventDefault();
      e.stopPropagation();

      const selectedText = getSelectedTextFromPage();
      const selectionContext = selectedText && contextualSelectionEnabled
        ? extractSelectionContext(document, window, selectedText)
        : undefined;
      const browserApi =
        (globalThis as any).browser || (globalThis as any).chrome;

      try {
        if (selectedText && browserApi?.storage?.local) {
          const settings = await SettingsUtils.getSettings();
          const envelopeId = createRequestId();
          await browserApi.storage.local.set({
            pendingSidepanelText: {
              text: selectedText,
              selectionContext: settings.contextualSelectionEnabled
                ? selectionContext
                : undefined,
              envelopeId,
              timestamp: Date.now(),
            },
          });
        }

        await browserApi.runtime.sendMessage({
          action: MESSAGE_TYPES.TOGGLE_SIDEPANEL,
        });
      } catch (err) {
        logger.error("❌ [Content Shortcut] 请求打开侧边栏失败:", err);
      }
    }
  };

  // 使用 capture 模式以确保优先捕获按键事件
  window.addEventListener("keydown", handleKeyDown, true);
  logger.info("✅ [Content Shortcut] 网页快捷键双通道监听已就绪 (Alt/Option+D, Alt/Option+S)");

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    unsubscribeSettings();
  };
}
