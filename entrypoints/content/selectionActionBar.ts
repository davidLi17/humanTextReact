import {
  MESSAGE_TYPES,
  THEME_MODES,
  type ThemeMode,
} from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { createRequestId } from "@/entrypoints/shared/requestProtocol";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  normalizeThemeMode,
  watchSystemTheme,
} from "@/entrypoints/shared/theme";
import type { PopupManager } from "./popupManager";
import { applyPopupTheme } from "./styles";

const logger = createLogger("selection-action-bar", "✨");

export interface RectLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface ViewportLike {
  width: number;
  height: number;
}

export interface BarDimensions {
  width: number;
  height: number;
}

export interface CalculatePositionOptions {
  selectionRect: RectLike;
  barDimensions?: BarDimensions;
  viewport?: ViewportLike;
  offset?: number;
  edgePadding?: number;
  scrollX?: number;
  scrollY?: number;
}

export interface PositionResult {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

export const DEFAULT_BAR_DIMENSIONS: BarDimensions = {
  width: 190,
  height: 34,
};

export const DEFAULT_OFFSET = 8;
export const DEFAULT_EDGE_PADDING = 8;

/**
 * 校验选中文本是否有效
 */
export function isValidSelectionText(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  return text.trim().length > 0;
}

/**
 * 判断目标元素是否属于可编辑区域（input / textarea / contenteditable）
 */
export function isEditableElement(target: any): boolean {
  if (!target) return false;

  let current: any =
    target.nodeType === 3 ? target.parentElement || target.parentNode : target;

  while (current) {
    const tagName = (current.tagName || "").toUpperCase();
    if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
      return true;
    }

    if (
      current.isContentEditable ||
      (typeof current.getAttribute === "function" &&
        (current.getAttribute("contenteditable") === "true" ||
          current.getAttribute("contenteditable") === ""))
    ) {
      return true;
    }

    current = current.parentElement || current.parentNode;
  }

  return false;
}

/**
 * 判断目标元素是否位于人话翻译器的浮窗或操作条内部
 */
export function isInsideTranslatorElement(target: any): boolean {
  if (!target) return false;

  let current: any =
    target.nodeType === 3 ? target.parentElement || target.parentNode : target;

  while (current) {
    const classList = current.classList;
    const hasClass = (className: string) => {
      if (classList && typeof classList.contains === "function") {
        return classList.contains(className);
      }
      const classNameStr = current.className || "";
      return (
        typeof classNameStr === "string" &&
        classNameStr.split(/\s+/).includes(className)
      );
    };

    if (
      hasClass("translator-popup") ||
      hasClass("translator-action-bar") ||
      (typeof current.hasAttribute === "function" &&
        current.hasAttribute("data-translator-element"))
    ) {
      return true;
    }

    current = current.parentElement || current.parentNode;
  }

  return false;
}

/**
 * 判断整个选区是否位于排除区域（输入框、编辑区或翻译器自身 DOM）内
 */
export function isSelectionInsideExcludedElement(selection: any): boolean {
  if (!selection || selection.rangeCount === 0) return true;
  if (selection.isCollapsed) return true;

  const range = selection.getRangeAt(0);
  if (!range) return true;

  const start = range.startContainer;
  const end = range.endContainer;
  const common = range.commonAncestorContainer;

  if (
    isEditableElement(start) ||
    isEditableElement(end) ||
    isEditableElement(common)
  ) {
    return true;
  }

  if (
    isInsideTranslatorElement(start) ||
    isInsideTranslatorElement(end) ||
    isInsideTranslatorElement(common)
  ) {
    return true;
  }

  return false;
}

/**
 * 纯函数计算快捷操作条的视口绝对定位坐标及方向
 */
export function calculateActionBarPosition(
  options: CalculatePositionOptions
): PositionResult {
  const {
    selectionRect,
    barDimensions = DEFAULT_BAR_DIMENSIONS,
    viewport = {
      width: typeof window !== "undefined" ? window.innerWidth : 1024,
      height: typeof window !== "undefined" ? window.innerHeight : 768,
    },
    offset = DEFAULT_OFFSET,
    edgePadding = DEFAULT_EDGE_PADDING,
    scrollX = 0,
    scrollY = 0,
  } = options;

  const barWidth = barDimensions.width;
  const barHeight = barDimensions.height;
  const vw = Math.max(1, viewport.width);
  const vh = Math.max(1, viewport.height);

  // 水平定位：默认居中于选区
  const centerLeft = selectionRect.left + (selectionRect.width - barWidth) / 2;
  const minLeft = edgePadding;
  const maxLeft = Math.max(edgePadding, vw - barWidth - edgePadding);
  const clampedLeft = Math.min(Math.max(centerLeft, minLeft), maxLeft);

  // 垂直定位：优先出现在选区上方，若上方空间不足则翻转到下方
  const topAbove = selectionRect.top - barHeight - offset;
  const topBelow = selectionRect.bottom + offset;

  let chosenTop: number;
  let placement: "top" | "bottom";

  if (topAbove >= edgePadding) {
    chosenTop = topAbove;
    placement = "top";
  } else if (topBelow + barHeight <= vh - edgePadding) {
    chosenTop = topBelow;
    placement = "bottom";
  } else {
    // 上下都无法完全容纳时的安全兜底
    if (topAbove > 0) {
      chosenTop = Math.max(edgePadding, topAbove);
      placement = "top";
    } else {
      chosenTop = Math.max(
        edgePadding,
        Math.min(topBelow, vh - barHeight - edgePadding)
      );
      placement = "bottom";
    }
  }

  return {
    left: Math.round(clampedLeft + scrollX),
    top: Math.round(chosenTop + scrollY),
    placement,
  };
}

export interface SelectionActionBarCallbacks {
  onTranslatePopup?: (text: string) => void | Promise<void>;
  onOpenSidepanel?: (text: string) => void | Promise<void>;
}

/**
 * 选中文本快捷操作条管理类
 */
export class SelectionActionBar {
  private container: HTMLElement | null = null;
  private currentSelectedText = "";
  private isVisible = false;
  private themeMode: ThemeMode = THEME_MODES.SYSTEM;
  private settingsCleanup: (() => void) | null = null;
  private systemThemeCleanup: (() => void) | null = null;
  private initialized = false;
  private cleanupFns: Array<() => void> = [];

  constructor(
    private popupManager?: PopupManager,
    private customCallbacks?: SelectionActionBarCallbacks
  ) {}

  public init(
    targetDocument: Document = document,
    targetWindow: Window = window
  ): void {
    if (this.initialized) return;
    this.initialized = true;

    this.setupEventListeners(targetDocument, targetWindow);
    this.initTheme();
    logger.log("SelectionActionBar 初始化完成");
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public getSelectedText(): string {
    return this.currentSelectedText;
  }

  public getContainer(): HTMLElement | null {
    return this.container;
  }

  /**
   * 显示操作条
   */
  public show(
    text: string,
    rect: RectLike,
    targetWindow?: Window,
    targetDocument?: Document
  ): void {
    if (!isValidSelectionText(text)) {
      this.hide();
      return;
    }

    const doc =
      targetDocument || (typeof document !== "undefined" ? document : undefined);
    if (!doc) return;

    this.currentSelectedText = text;
    const bar = this.ensureContainer(doc);

    const win =
      targetWindow || (typeof window !== "undefined" ? window : undefined);
    const viewport: ViewportLike = {
      width: win?.innerWidth || 1024,
      height: win?.innerHeight || 768,
    };

    // 测量或估算尺寸
    const barWidth = bar.offsetWidth || DEFAULT_BAR_DIMENSIONS.width;
    const barHeight = bar.offsetHeight || DEFAULT_BAR_DIMENSIONS.height;

    const pos = calculateActionBarPosition({
      selectionRect: rect,
      barDimensions: { width: barWidth, height: barHeight },
      viewport,
    });

    bar.style.left = `${pos.left}px`;
    bar.style.top = `${pos.top}px`;
    bar.setAttribute("data-placement", pos.placement);
    bar.style.display = "inline-flex";

    applyPopupTheme(bar, this.themeMode);

    this.isVisible = true;
    logger.log("显示快捷操作条", { textLength: text.length, pos });
  }

  /**
   * 隐藏操作条
   */
  public hide(): void {
    if (!this.isVisible && (!this.container || this.container.style.display === "none")) {
      return;
    }

    if (this.container) {
      this.container.style.display = "none";
    }
    this.isVisible = false;
    this.currentSelectedText = "";
    logger.log("隐藏快捷操作条");
  }

  /**
   * 销毁并清理事件
   */
  public destroy(): void {
    this.hide();
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.settingsCleanup?.();
    this.settingsCleanup = null;
    this.systemThemeCleanup?.();
    this.systemThemeCleanup = null;

    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.initialized = false;
  }

  private ensureContainer(targetDocument: Document = document): HTMLElement {
    if (this.container && targetDocument.body.contains(this.container)) {
      return this.container;
    }

    if (this.container) {
      this.container.remove();
    }

    const bar = targetDocument.createElement("div");
    bar.className = "translator-action-bar";
    bar.setAttribute("data-translator-element", "true");
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "人话翻译快捷操作");
    bar.style.display = "none";

    bar.innerHTML = `
      <button
        type="button"
        class="translator-action-btn translator-action-btn-popup"
        title="在悬浮窗中人话翻译"
        aria-label="浮窗翻译"
      >
        <span class="translator-action-icon" aria-hidden="true">💬</span>
        <span class="translator-action-text">浮窗翻译</span>
      </button>
      <div class="translator-action-divider" aria-hidden="true"></div>
      <button
        type="button"
        class="translator-action-btn translator-action-btn-sidepanel"
        title="在侧边栏中继续人话追问"
        aria-label="侧边栏人话"
      >
        <span class="translator-action-icon" aria-hidden="true">📖</span>
        <span class="translator-action-text">侧边栏人话</span>
      </button>
    `;

    // 防止在操作条上点击时导致选区被浏览器清空
    bar.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    bar.addEventListener("mouseup", (e) => {
      e.stopPropagation();
    });

    // 绑定按钮点击逻辑
    const popupBtn = bar.querySelector(".translator-action-btn-popup");
    popupBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleTranslatePopupClick();
    });

    const sidepanelBtn = bar.querySelector(".translator-action-btn-sidepanel");
    sidepanelBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleOpenSidepanelClick();
    });

    targetDocument.body.appendChild(bar);
    this.container = bar;
    return bar;
  }

  private async handleTranslatePopupClick(): Promise<void> {
    const text = this.currentSelectedText;
    this.hide();

    if (!isValidSelectionText(text)) return;

    logger.log("触发浮窗翻译", { textLength: text.length });

    if (this.customCallbacks?.onTranslatePopup) {
      await this.customCallbacks.onTranslatePopup(text);
      return;
    }

    if (this.popupManager) {
      const requestId = createRequestId();
      this.popupManager.showPopup(text, requestId);

      try {
        const settings = await SettingsUtils.getSettings();
        await browser.runtime.sendMessage({
          action: MESSAGE_TYPES.TRANSLATE,
          requestId,
          text,
          thinkingEnabled: settings.thinkingEnabled ?? false,
        });
      } catch (error) {
        logger.error("触发浮窗翻译失败:", error);
      }
    }
  }

  private async handleOpenSidepanelClick(): Promise<void> {
    const text = this.currentSelectedText;
    this.hide();

    if (!isValidSelectionText(text)) return;

    logger.log("触发侧边栏人话", { textLength: text.length });

    if (this.customCallbacks?.onOpenSidepanel) {
      await this.customCallbacks.onOpenSidepanel(text);
      return;
    }

    try {
      if (typeof browser !== "undefined" && browser?.storage?.local) {
        await browser.storage.local.set({
          pendingSidepanelText: {
            text,
            timestamp: Date.now(),
          },
        });
      }

      if (typeof browser !== "undefined" && browser?.runtime?.sendMessage) {
        await browser.runtime.sendMessage({
          action: MESSAGE_TYPES.OPEN_SIDEPANEL,
        });
        void browser.runtime
          .sendMessage({
            action: "sendToSidepanel",
            text,
          })
          .catch(() => {});
      }
    } catch (error) {
      logger.error("触发侧边栏人话失败:", error);
    }
  }

  private setupEventListeners(
    doc: Document,
    win: Window
  ): void {
    const handleMouseUp = (e: MouseEvent) => {
      // 若在操作条自身内部松开，不做响应
      if (this.container && this.container.contains(e.target as Node)) {
        return;
      }

      // 等待浏览器的 selection 变更同步
      setTimeout(() => {
        const selection = win.getSelection();
        if (!selection || isSelectionInsideExcludedElement(selection)) {
          if (this.isVisible) {
            this.hide();
          }
          return;
        }

        const text = selection.toString().trim();
        if (!isValidSelectionText(text)) {
          if (this.isVisible) {
            this.hide();
          }
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          if (this.isVisible) {
            this.hide();
          }
          return;
        }

        this.show(text, rect, win, doc);
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // 点击外部空白区域隐藏
      if (this.container && !this.container.contains(e.target as Node)) {
        this.hide();
      }
    };

    const handleScroll = () => {
      if (this.isVisible) {
        this.hide();
      }
    };

    const handleResize = () => {
      if (this.isVisible) {
        this.hide();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    };

    const handleSelectionChange = () => {
      const selection = win.getSelection();
      if (!selection || !selection.toString().trim()) {
        if (this.isVisible) {
          this.hide();
        }
      }
    };

    win.addEventListener("mouseup", handleMouseUp);
    doc.addEventListener("mousedown", handleMouseDown);
    win.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    win.addEventListener("resize", handleResize, { passive: true });
    doc.addEventListener("keydown", handleKeyDown);
    doc.addEventListener("selectionchange", handleSelectionChange);

    this.cleanupFns.push(() => {
      win.removeEventListener("mouseup", handleMouseUp);
      doc.removeEventListener("mousedown", handleMouseDown);
      win.removeEventListener("scroll", handleScroll, { capture: true });
      win.removeEventListener("resize", handleResize);
      doc.removeEventListener("keydown", handleKeyDown);
      doc.removeEventListener("selectionchange", handleSelectionChange);
    });
  }

  private initTheme(): void {
    void SettingsUtils.getSettings().then((settings) => {
      this.setThemeMode(normalizeThemeMode(settings.theme));
    });

    this.settingsCleanup = SettingsUtils.onSettingsChanged((settings) => {
      this.setThemeMode(normalizeThemeMode(settings.theme));
    });
  }

  public setThemeMode(mode: ThemeMode): void {
    this.themeMode = normalizeThemeMode(mode);
    this.systemThemeCleanup?.();
    this.systemThemeCleanup = null;

    if (this.container) {
      applyPopupTheme(this.container, this.themeMode);
    }

    this.systemThemeCleanup = watchSystemTheme(
      this.themeMode,
      (resolvedTheme) => {
        if (!this.container) return;
        applyPopupTheme(
          this.container,
          this.themeMode,
          resolvedTheme === THEME_MODES.DARK
        );
      }
    );
  }
}
