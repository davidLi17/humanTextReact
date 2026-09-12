// 导入必要的类型和模块
import {
  MESSAGE_TYPES,
  PopupState, // 消息类型常量
  THEME_MODES,
  ThemeMode,
  TranslationRequest, // 翻译请求类型
} from "@/entrypoints/shared/constants"; // 从共享常量文件中导入
import { createLogger } from "@/entrypoints/shared/logger";
import {
  createRequestId,
  shouldAcceptRequestUpdate,
} from "@/entrypoints/shared/requestProtocol";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  FontScaleController,
  applyFontScale,
  handleScopedFontScaleShortcut,
} from "@/entrypoints/shared/fontScale";
import {
  normalizeThemeMode,
  watchSystemTheme,
} from "@/entrypoints/shared/theme";
import { initializeCodeCopy, parseMarkdown } from "@/shared/utils/markdown"; // Markdown解析工具
import { PopupEventHandler } from "./popupEventHandler";
import { applyPopupTheme } from "./styles";
import {
  getSafeHttpUrl,
  getSafeSourceHostname,
  normalizeSelectionContext,
  type SelectionContext,
} from "@/entrypoints/shared/selectionContext";
import {
  PRISM_TABS,
  type PrismParsedResult,
  type PrismTabKey,
} from "@/entrypoints/shared/prismTypes";
import {
  getPrismContentByTab,
  getPrismCopyText,
  parsePrismTranslation,
} from "@/entrypoints/shared/prismParser";
import { createJargonDraft } from "@/entrypoints/shared/jargonDraft";

const logger = createLogger("content-popup", "🔽"); // 弹窗事件处理器

export function formatPopupTranslationError(error: string): string {
  return error.includes("API Key") ||
    error.includes("API 请求失败") ||
    error.includes("超时") ||
    error.includes("rate limit")
    ? "翻译失败：" + error
    : "翻译失败，请重试";
}

export function getReplacedPopupRequestId(
  hasPopup: boolean,
  requestFinished: boolean,
  requestId?: string
): string | undefined {
  return hasPopup && !requestFinished && requestId ? requestId : undefined;
}

// 弹窗管理类，负责创建、显示、更新和删除翻译弹窗
export class PopupManager {
  // 存储上一次弹窗的状态（位置和大小）
  private lastPopupState: PopupState = {
    left: null, // 弹窗左侧位置
    top: null, // 弹窗顶部位置
    width: null, // 弹窗宽度
  };
  // 当前显示的弹窗元素
  private currentPopup: HTMLElement | null = null;
  // 当前弹窗对应的翻译请求
  private currentRequestId: string | undefined;
  // 旧后台不会发送 requestId，仅在该模式下接收无 ID 更新
  private allowLegacyMessages = false;
  // 完成后保留 requestId 供关闭操作精确清理，但不再接收迟到更新
  private requestFinished = false;
  // 弹窗事件处理器实例
  private eventHandler: PopupEventHandler | null = null;
  // 标记用户是否手动滚动过弹窗内容
  private userHasScrolled = false;
  // 当前全局主题偏好
  private themeMode: ThemeMode = THEME_MODES.SYSTEM;
  // 当前弹窗对应的划词原文，用于失败后重试
  private lastSelectionText = "";
  private lastSelectionContext: SelectionContext | undefined;
  private immutableSelectionContext: SelectionContext | undefined;
  private immutableFallbackSourceUrl: string | undefined;
  private deferredStartInProgress = false;
  private jargonSaveInProgress = false;
  // 三棱镜状态
  private currentPrismTab: PrismTabKey = "vernacular";
  private lastRawContent = "";
  private lastPrismResult: PrismParsedResult | null = null;
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private copyCorporateFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  // 系统主题和菜单事件的清理函数
  private systemThemeCleanup: (() => void) | null = null;
  private themeMenuCleanup: (() => void) | null = null;
  private settingsCleanup: (() => void) | null = null;
  private destroyed = false;
  private fontScaleNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly fontScaleController: FontScaleController;
  private readonly handleFontScaleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.(".translator-jargon-editor input, .translator-jargon-editor textarea")) {
      return;
    }
    handleScopedFontScaleShortcut(
      event,
      this.currentPopup,
      (action) => this.fontScaleController.perform(action)
    );
  };

  constructor() {
    this.fontScaleController = new FontScaleController({
      apply: (value) => {
        if (this.currentPopup) applyFontScale(this.currentPopup, value);
      },
      persist: (value) =>
        SettingsUtils.setFontScalePercent(value),
      onPersistError: (error) => {
        logger.error("保存浮窗字体大小失败:", error);
        this.showFontScaleSaveError();
      },
    });
    void SettingsUtils.getSettings().then((settings) => {
      if (this.destroyed) return;
      this.setThemeMode(normalizeThemeMode(settings.theme));
      this.fontScaleController.hydrate(settings.fontScalePercent);
    });

    this.settingsCleanup = SettingsUtils.onSettingsChanged((settings) => {
      if (this.destroyed) return;
      this.setThemeMode(normalizeThemeMode(settings.theme));
      this.fontScaleController.syncExternal(settings.fontScalePercent);
    });
    document.addEventListener("keydown", this.handleFontScaleKeyDown, true);
  }

  // 显示弹窗方法，接收用户选中的文本
  public showPopup(
    selection: string,
    requestId: string,
    allowLegacyMessages = false,
    selectionContext?: SelectionContext,
    deferTranslation = false,
    customPosition?: { left: number; top: number }
  ): HTMLElement {
    logger.log("显示弹窗", {
      requestId,
      textLength: selection?.length || 0,
      textPreview: selection?.substring(0, 50) + "...",
      hasCurrentPopup: !!this.currentPopup,
      timestamp: new Date().toISOString(),
    });

    const replacedRequestId = getReplacedPopupRequestId(
      Boolean(this.currentPopup),
      this.requestFinished,
      this.currentRequestId
    );
    if (replacedRequestId) {
      void browser.runtime
        .sendMessage({
          action: MESSAGE_TYPES.CLEANUP,
          requestId: replacedRequestId,
        })
        .catch((error) => logger.error("替换浮窗时清理旧请求失败:", error));
    }

    // 清理可能存在的旧弹窗
    this.removeCurrentPopup();

    // 创建新的弹窗元素
    const normalizedContext = normalizeSelectionContext(
      selectionContext,
      selection
    );
    const fallbackSourceUrl = getSafeHttpUrl(
      typeof window !== "undefined" ? window.location.href : undefined
    );
    const immutableSelectionContext = normalizedContext
      ? {
          selectedText: normalizedContext.selectedText,
          paragraph: normalizedContext.paragraph,
          ...(normalizedContext.source
            ? { source: { ...normalizedContext.source } }
            : {}),
        }
      : undefined;
    const popup = this.createPopupElement(
      selection,
      immutableSelectionContext,
      deferTranslation
    );
    this.currentPopup = popup;
    this.currentRequestId = requestId;
    this.allowLegacyMessages = allowLegacyMessages;
    this.requestFinished = false;
    this.lastSelectionText = selection;
    this.lastSelectionContext = immutableSelectionContext;
    this.immutableSelectionContext = immutableSelectionContext;
    this.immutableFallbackSourceUrl = fallbackSourceUrl;
    this.deferredStartInProgress = false;

    // 将弹窗添加到页面中
    document.body.appendChild(popup);
    // 初始化复制功能
    initializeCodeCopy();
    // 设置弹窗位置
    this.positionPopup(popup, customPosition);
    // 设置事件处理器
    this.setupEventHandlers(popup);
    // 设置滚动检测
    this.setupScrollDetection(popup);

    logger.log("✅ [PopupManager] 弹窗创建完成", {
      popupElement: popup.className,
      parentElement: popup.parentElement?.tagName,
    });

    return popup;
  }

  // 更新翻译内容方法，接收翻译请求
  public updateTranslation(request: TranslationRequest): boolean {
    logger.log("🔄 [PopupManager] 更新翻译", {
      hasPopup: !!this.currentPopup,
      requestId: request.requestId,
      currentRequestId: this.currentRequestId,
      hasContent: !!request.content,
      contentLength: request.content?.length || 0,
      hasReasoning: !!request.reasoningContent,
      reasoningLength: request.reasoningContent?.length || 0,
      done: request.done,
      error: request.error,
    });

    // 检查弹窗是否存在
    if (!this.currentPopup) {
      logger.log("❌ [PopupManager] 翻译弹窗不存在，可能已关闭");
      return false;
    }

    if (this.requestFinished) {
      logger.log("忽略已结束请求的迟到更新", {
        incomingRequestId: request.requestId,
        currentRequestId: this.currentRequestId,
      });
      return false;
    }

    if (
      !shouldAcceptRequestUpdate(
        request.requestId,
        this.currentRequestId,
        this.allowLegacyMessages
      )
    ) {
      logger.log("忽略非当前请求的页面弹窗更新", {
        incomingRequestId: request.requestId,
        currentRequestId: this.currentRequestId,
      });
      return false;
    }

    // 获取弹窗内的各个元素
    const elements = this.getPopupElements();
    // 检查必要元素是否存在
    if (
      !elements.translatedTextEl ||
      !elements.reasoningTextEl ||
      !elements.loadingEl
    ) {
      logger.log("❌ [PopupManager] 弹窗元素不完整", {
        hasTranslatedEl: !!elements.translatedTextEl,
        hasReasoningEl: !!elements.reasoningTextEl,
        hasLoadingEl: !!elements.loadingEl,
      });
      return false;
    }

    // 处理翻译错误或更新翻译结果
    if (request.error) {
      logger.log("❌ [PopupManager] 处理翻译错误");
      if (request.content || request.reasoningContent) {
        this.handleTranslationUpdate(
          { ...request, done: false },
          elements
        );
      }
      this.handleTranslationError(request.error);
    } else {
      logger.log("✅ [PopupManager] 处理翻译更新");
      this.handleTranslationUpdate(request, elements);
    }

    if (request.done || request.error) {
      this.requestFinished = true;
    }

    return true;
  }

  // 移除当前弹窗方法
  public removeCurrentPopup() {
    if (this.currentPopup) {
      // 保存当前弹窗状态
      this.savePopupState(this.currentPopup);
      // 清理事件处理器
      if (this.eventHandler) {
        this.eventHandler.destroy();
        this.eventHandler = null;
      }
      // 从DOM中移除弹窗
      this.currentPopup.remove();
      this.currentPopup = null;
    }
    this.themeMenuCleanup?.();
    this.themeMenuCleanup = null;
    this.currentRequestId = undefined;
    this.allowLegacyMessages = false;
    this.requestFinished = false;
    this.lastSelectionText = "";
    this.lastSelectionContext = undefined;
    this.immutableSelectionContext = undefined;
    this.immutableFallbackSourceUrl = undefined;
    this.deferredStartInProgress = false;
    this.jargonSaveInProgress = false;
    this.currentPrismTab = "vernacular";
    this.lastRawContent = "";
    this.lastPrismResult = null;
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
      this.copyFeedbackTimer = null;
    }
    if (this.copyCorporateFeedbackTimer) {
      clearTimeout(this.copyCorporateFeedbackTimer);
      this.copyCorporateFeedbackTimer = null;
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.removeCurrentPopup();
    this.settingsCleanup?.();
    this.settingsCleanup = null;
    this.systemThemeCleanup?.();
    this.systemThemeCleanup = null;
    if (this.fontScaleNoticeTimer) {
      clearTimeout(this.fontScaleNoticeTimer);
      this.fontScaleNoticeTimer = null;
    }
    document.removeEventListener("keydown", this.handleFontScaleKeyDown, true);
  }

  private showFontScaleSaveError(): void {
    const popup = this.currentPopup;
    if (!popup) return;
    let notice = popup.querySelector(
      ".translator-font-scale-toast"
    ) as HTMLElement | null;
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "translator-font-scale-toast";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      popup.appendChild(notice);
    }
    notice.textContent = "字体大小保存失败，重开后可能恢复旧值";
    if (this.fontScaleNoticeTimer) clearTimeout(this.fontScaleNoticeTimer);
    this.fontScaleNoticeTimer = setTimeout(() => notice?.remove(), 3000);
  }

  // 创建弹窗元素方法，接收用户选中的文本
  private createPopupElement(
    selection: string,
    selectionContext?: SelectionContext,
    deferTranslation = false
  ): HTMLElement {
    // 创建div元素作为弹窗容器
    const popup = document.createElement("div");
    popup.className = "translator-popup"; // 设置CSS类名
    popup.tabIndex = -1;
    // 设置弹窗HTML结构
    popup.innerHTML = `
      <div class="translator-header">
        <div class="translator-title">人话翻译器</div>
        <div class="translator-header-actions" data-no-drag="true">
          <button
            type="button"
            class="translator-sidepanel-btn"
            title="在侧边栏中继续追问对话"
            aria-label="在侧边栏中追问"
          >
            💬 追问
          </button>
          <button
            type="button"
            class="translator-vault-btn"
            title="存入黑话生词本"
            aria-label="存入生词本"
            disabled
          >
            ⭐ 收藏
          </button>
          <div class="translator-theme-selector">
            <button
              type="button"
              class="translator-theme-trigger"
              aria-label="切换外观"
              aria-haspopup="menu"
              aria-expanded="false"
              title="切换外观"
            >
              <span class="translator-theme-trigger-icon" aria-hidden="true">◐</span>
            </button>
            <div class="translator-theme-menu" role="menu" aria-label="外观模式" hidden>
              <button type="button" role="menuitemradio" data-theme-option="system">
                <span aria-hidden="true">◐</span>
                <span>跟随系统</span>
                <span class="translator-theme-check"></span>
              </button>
              <button type="button" role="menuitemradio" data-theme-option="light">
                <span aria-hidden="true">☀</span>
                <span>浅色</span>
                <span class="translator-theme-check"></span>
              </button>
              <button type="button" role="menuitemradio" data-theme-option="dark">
                <span aria-hidden="true">☾</span>
                <span>深色</span>
                <span class="translator-theme-check"></span>
              </button>
            </div>
          </div>
          <button type="button" class="translator-close-btn" aria-label="关闭">✕</button>
        </div>
      </div>
      <div class="translator-content">
        <div class="translator-section">
          <div class="translator-label">原文</div>
          <div class="translator-text"></div>
          <button class="translator-copy-original-btn">复制</button>
        </div>
        <div class="translator-context-preview" style="display: none;">
          <div class="translator-context-preview-title">将结合当前段落解释</div>
          <div class="translator-context-source"></div>
          <div class="translator-context-paragraph"></div>
          <div class="translator-context-actions">
            <button type="button" class="translator-context-btn">结合本段解释</button>
            <button type="button" class="translator-text-only-btn">仅解释选中文字</button>
          </div>
        </div>
        <div class="translator-section translator-section-reasoning" style="display: none;">
          <div class="translator-label">思维链</div>
          <div class="translator-reasoning-text"></div>
        </div>
        <div class="translator-section">
          <div class="translator-label">译文</div>
          <div class="translator-prism-tabs" style="display: none;">
            <button type="button" class="translator-prism-tab active" data-tab="vernacular" title="通俗易懂、撕碎形式主义、生活化打比方">🍼 直白人话</button>
            <button type="button" class="translator-prism-tab" data-tab="corporate" title="高情商职场神器，大白话秒变周报述职范本">👔 向上汇报</button>
            <button type="button" class="translator-prism-tab" data-tab="truth" title="幽默解构潜台词，看穿职场内耗与伪装">🔪 犀利真相</button>
            <button type="button" class="translator-prism-tab" data-tab="raw" title="查看三合一完整 Markdown 输出">📋 全文</button>
          </div>
          <div class="translator-translated-text"></div>
          <div
            class="translator-result-meta"
            style="display: none; margin-top: 10px; align-items: center; justify-content: space-between; gap: 10px;"
          >
            <span
              class="translator-vault-source"
              style="padding: 3px 8px; border-radius: 999px; background: rgba(52, 199, 89, 0.12); color: #248a3d; font-size: calc(12px * var(--ht-font-scale, 1)); font-weight: 600;"
            >
              来自生词本
            </span>
            <button
              type="button"
              class="translator-regenerate-btn"
              title="跳过生词本并重新生成"
              style="padding: 4px 10px; border: 1px solid rgba(52, 199, 89, 0.3); border-radius: 6px; background: transparent; color: #248a3d; font-size: calc(12px * var(--ht-font-scale, 1)); cursor: pointer;"
            >
              重新生成
            </button>
          </div>
          <div class="translator-loading">
            <span class="translator-loading-text">正在翻译...</span>
            <button
              type="button"
              class="translator-stop-btn"
              title="停止生成本次翻译"
              style="margin-left: 10px; padding: 2px 10px; font-size: calc(12px * var(--ht-font-scale, 1)); line-height: 1.5; font-weight: 500; border: 1px solid; border-radius: 6px; background: transparent; color: inherit; opacity: 0.85; cursor: pointer;"
            >
              停止
            </button>
            <button
              type="button"
              class="translator-retry-btn"
              title="使用原文重新翻译"
              style="display: none; margin-left: 10px; padding: 2px 10px; font-size: calc(12px * var(--ht-font-scale, 1)); line-height: 1.5; font-weight: 500; border: 1px solid rgba(52, 199, 89, 0.3); border-radius: 6px; background: rgba(52, 199, 89, 0.1); color: #34c759; cursor: pointer;"
            >
              重试
            </button>
          </div>
        </div>
      </div>
      <div class="translator-footer-actions">
        <button type="button" class="translator-copy-btn">复制译文</button>
        <button type="button" class="translator-copy-corporate-btn" style="display: none;" title="一键复制高情商向上汇报版，可直接粘贴进周报">👔 复制周报版</button>
      </div>
    `;
    const originalText = popup.querySelector(".translator-text");
    if (originalText) originalText.textContent = selection;

    if (selectionContext) {
      const preview = popup.querySelector(
        ".translator-context-preview"
      ) as HTMLElement | null;
      const paragraph = popup.querySelector(".translator-context-paragraph");
      const source = popup.querySelector(".translator-context-source");
      if (paragraph) paragraph.textContent = selectionContext.paragraph;
      if (source) {
        const safeUrl = getSafeHttpUrl(selectionContext.source?.url);
        const sourceTitle = selectionContext.source?.title?.trim();
        if (sourceTitle) {
          const title = document.createElement("span");
          title.textContent = sourceTitle;
          source.appendChild(title);
        }
        if (safeUrl) {
          const link = document.createElement("a");
          link.href = safeUrl;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = getSafeSourceHostname(safeUrl) || "查看来源";
          source.appendChild(link);
        }
      }
      if (preview) preview.style.display = deferTranslation ? "" : "none";
    }
    if (deferTranslation) {
      const loading = popup.querySelector(".translator-loading") as HTMLElement;
      if (loading) loading.style.display = "none";
    }
    applyPopupTheme(popup, this.themeMode);
    applyFontScale(popup, this.fontScaleController.getValue());
    this.updateThemeControls(popup);
    popup.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.("button, a, input, textarea, select")) {
        popup.focus({ preventScroll: true });
      }
    });

    return popup;
  }

  // 定位弹窗方法
  private positionPopup(
    popup: HTMLElement,
    customPosition?: { left: number; top: number }
  ) {
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认位置和大小
    let left = viewportWidth - 420; // 默认右侧位置
    let top = 20; // 默认顶部位置
    let width = 400; // 默认宽度

    if (customPosition) {
      width =
        this.lastPopupState.width !== null
          ? Math.min(Math.max(300, this.lastPopupState.width), 1200)
          : 400;
      left = Math.min(
        Math.max(10, customPosition.left),
        viewportWidth - width - 20
      );
      top = Math.min(
        Math.max(10, customPosition.top + 15),
        viewportHeight - 200
      );
    } else if (
      this.lastPopupState.left !== null &&
      this.lastPopupState.top !== null
    ) {
      left = Math.min(
        Math.max(0, this.lastPopupState.left), // 确保不超出屏幕左侧
        viewportWidth - 300 // 确保不超出屏幕右侧
      );
      top = Math.min(
        Math.max(0, this.lastPopupState.top), // 确保不超出屏幕顶部
        viewportHeight - 100 // 确保不超出屏幕底部
      );
      if (this.lastPopupState.width !== null) {
        width = Math.min(Math.max(300, this.lastPopupState.width), 1200); // 限制宽度范围
      }
    }

    // 应用计算后的位置和大小
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.width = `${width}px`;
  }

  // 设置事件处理器方法
  private setupEventHandlers(popup: HTMLElement) {
    // 初始化事件处理器
    this.eventHandler = new PopupEventHandler(popup, (state) => {
      this.lastPopupState = state; // 保存弹窗状态
      logger.log("保存弹窗状态:", state);
    });
    this.setupThemeControls(popup);

    // 关闭按钮点击事件
    popup
      .querySelector(".translator-close-btn")
      ?.addEventListener("click", () => {
        // 发送清理消息给后台
        browser.runtime.sendMessage({
          action: MESSAGE_TYPES.CLEANUP,
          requestId: this.allowLegacyMessages
            ? undefined
            : this.currentRequestId,
        });
        // 移除当前弹窗
        this.removeCurrentPopup();
      });

    // 停止生成按钮：中断当前流式翻译
    popup
      .querySelector(".translator-stop-btn")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        this.stopCurrentTranslation();
      });

    // 重试按钮：失败后用上次的划词内容重新发起翻译
    popup
      .querySelector(".translator-retry-btn")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        void this.retryTranslation(false);
      });

    // 生词本命中后的明确重新生成：跳过本地复用并调用模型。
    popup
      .querySelector(".translator-regenerate-btn")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        void this.retryTranslation(true);
      });

    popup
      .querySelector(".translator-context-btn")
      ?.addEventListener("click", () => void this.startDeferredTranslation(true));
    popup
      .querySelector(".translator-text-only-btn")
      ?.addEventListener("click", () => void this.startDeferredTranslation(false));

    // 侧边栏追问按钮点击事件
    popup
      .querySelector(".translator-sidepanel-btn")
      ?.addEventListener("click", async () => {
        const sourcePopup = this.currentPopup;
        const sourceRequestId = this.currentRequestId;
        const originalText =
          popup.querySelector(".translator-text")?.textContent;
        if (originalText) {
          try {
            const selectionContext = this.lastSelectionContext;
            const envelopeId = sourceRequestId || createRequestId();
            const pendingValue = {
              text: originalText,
              selectionContext,
              envelopeId,
              timestamp: Date.now(),
            };
            await browser.storage.local.set({
              pendingSidepanelText: pendingValue,
            });
            if (
              this.currentPopup !== sourcePopup ||
              this.currentRequestId !== sourceRequestId
            ) {
              const stored = (await browser.storage.local.get(
                "pendingSidepanelText"
              )) as {
                pendingSidepanelText?: { timestamp?: number };
              };
              if (
                stored.pendingSidepanelText?.timestamp ===
                pendingValue.timestamp
              ) {
                await browser.storage.local.remove("pendingSidepanelText");
              }
              return;
            }
            await browser.runtime.sendMessage({
              action: MESSAGE_TYPES.CLEANUP,
              requestId: sourceRequestId,
            });
            await browser.runtime.sendMessage({
              action: MESSAGE_TYPES.OPEN_SIDEPANEL,
            });
            await browser.runtime.sendMessage({
              action: "sendToSidepanel",
              text: originalText,
              selectionContext,
              envelopeId,
            });
            this.removeCurrentPopup();
          } catch (error) {
            logger.error("打开侧边栏失败:", error);
          }
        }
      });

    // 收藏到生词本按钮点击事件：先打开可编辑草稿，保存动作由表单显式触发。
    popup
      .querySelector(".translator-vault-btn")
      ?.addEventListener("click", () => {
        if (
          this.jargonSaveInProgress ||
          !this.requestFinished ||
          !this.lastRawContent.trim()
        ) {
          return;
        }
        const draft = createJargonDraft({
          rawTerm: this.lastSelectionText,
          rawExplanation: this.lastRawContent,
          selectionContext: this.immutableSelectionContext,
          sourceUrl: this.immutableFallbackSourceUrl,
        });
        this.openJargonSaveEditor(popup, draft);
      });

    // 监听三棱镜 Tab 点击
    const prismTabsEl = popup.querySelector(".translator-prism-tabs");
    prismTabsEl?.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement)?.closest(".translator-prism-tab");
      if (!target) return;
      const tabKey = target.getAttribute("data-tab") as PrismTabKey | null;
      if (tabKey && tabKey !== this.currentPrismTab) {
        this.currentPrismTab = tabKey;
        this.renderTranslatedContent(this.getPopupElements());
      }
    });

    // 复制周报版按钮点击
    const copyCorporateBtn = popup.querySelector(
      ".translator-copy-corporate-btn"
    ) as HTMLButtonElement | null;
    copyCorporateBtn?.addEventListener("click", async () => {
      if (!this.lastPrismResult) return;
      const corporateText = getPrismCopyText(this.lastPrismResult, "corporate");
      if (!corporateText) return;
      try {
        await navigator.clipboard.writeText(corporateText);
        copyCorporateBtn.textContent = "✅ 已复制周报版！";
        if (this.copyCorporateFeedbackTimer) clearTimeout(this.copyCorporateFeedbackTimer);
        this.copyCorporateFeedbackTimer = setTimeout(() => {
          copyCorporateBtn.textContent = "👔 复制周报版";
          this.copyCorporateFeedbackTimer = null;
        }, 1500);
      } catch (error) {
        logger.error("复制周报版失败:", error);
      }
    });

    // 复制译文按钮
    const copyBtn = popup.querySelector(
      ".translator-copy-btn"
    ) as HTMLButtonElement | null;
    copyBtn?.addEventListener("click", async () => {
      const textToCopy = this.lastPrismResult?.isPrism
        ? getPrismCopyText(this.lastPrismResult, this.currentPrismTab)
        : (popup.querySelector(".translator-translated-text")?.textContent || this.lastRawContent);

      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          logger.log("译文已复制");
          copyBtn.textContent = "✅ 已复制！";
          if (this.copyFeedbackTimer) clearTimeout(this.copyFeedbackTimer);
          this.copyFeedbackTimer = setTimeout(() => {
            const meta = PRISM_TABS[this.currentPrismTab];
            copyBtn.textContent = this.lastPrismResult?.isPrism
              ? `复制${meta?.shortLabel || "当前版"}`
              : "复制译文";
            this.copyFeedbackTimer = null;
          }, 1500);
        } catch (error) {
          logger.error("复制译文失败:", error);
        }
      }
    });
  }

  private setVaultAvailability(available: boolean): void {
    const button = this.currentPopup?.querySelector(
      ".translator-vault-btn"
    ) as HTMLButtonElement | null;
    if (!button) return;
    button.disabled = !available || this.jargonSaveInProgress;
  }

  private openJargonSaveEditor(
    popup: HTMLElement,
    draft: ReturnType<typeof createJargonDraft>
  ): void {
    if (popup !== this.currentPopup || popup.querySelector(".translator-jargon-editor")) {
      return;
    }

    const editor = document.createElement("form");
    editor.className = "translator-jargon-editor";
    editor.setAttribute("data-testid", "translator-jargon-editor");
    editor.innerHTML = `
      <div class="translator-jargon-editor-title">保存到生词本</div>
      <div class="translator-jargon-explanation-source" data-testid="translator-jargon-explanation-source"></div>
      <label class="translator-jargon-field">
        <span>术语</span>
        <input name="term" aria-label="术语" required />
      </label>
      <label class="translator-jargon-field">
        <span>人话释义</span>
        <textarea name="explanation" aria-label="人话释义" rows="5" required></textarea>
      </label>
      <label class="translator-jargon-field">
        <span>原句或提问</span>
        <textarea name="sourceContext" aria-label="原句或提问" rows="3"></textarea>
      </label>
      <label class="translator-jargon-field">
        <span>来源链接</span>
        <input name="sourceUrl" aria-label="来源链接" type="text" inputmode="url" />
      </label>
      <div class="translator-jargon-editor-error" role="alert" aria-live="polite"></div>
      <div class="translator-jargon-editor-actions">
        <button type="button" class="translator-jargon-cancel-btn" title="取消收藏编辑">取消</button>
        <button type="submit" class="translator-jargon-save-btn" title="保存到生词本">保存到生词本</button>
      </div>
    `;

    const termInput = editor.querySelector("[name=term]") as HTMLInputElement;
    const explanationInput = editor.querySelector(
      "[name=explanation]"
    ) as HTMLTextAreaElement;
    const sourceContextInput = editor.querySelector(
      "[name=sourceContext]"
    ) as HTMLTextAreaElement;
    const sourceUrlInput = editor.querySelector(
      "[name=sourceUrl]"
    ) as HTMLInputElement;
    const errorEl = editor.querySelector(
      ".translator-jargon-editor-error"
    ) as HTMLElement;
    const explanationSourceEl = editor.querySelector(
      ".translator-jargon-explanation-source"
    ) as HTMLElement;
    const saveButton = editor.querySelector(
      ".translator-jargon-save-btn"
    ) as HTMLButtonElement;
    const cancelButton = editor.querySelector(
      ".translator-jargon-cancel-btn"
    ) as HTMLButtonElement;
    termInput.value = draft.item.term;
    explanationInput.value = draft.item.explanation;
    sourceContextInput.value = draft.item.sourceContext || "";
    sourceUrlInput.value = draft.item.sourceUrl || "";
    explanationSourceEl.textContent =
      draft.explanationSource === "vernacular"
        ? "已选用直白人话，可按自己的理解调整。"
        : "当前解释来自完整原译文，可按自己的理解调整。";

    const content = popup.querySelector(".translator-content") as HTMLElement | null;
    const footer = popup.querySelector(
      ".translator-footer-actions"
    ) as HTMLElement | null;
    const vaultButton = popup.querySelector(
      ".translator-vault-btn"
    ) as HTMLButtonElement | null;
    const sourcePopup = popup;
    const sourceRequestId = this.currentRequestId;
    const snapshotItem = { ...draft.item };
    popup.insertBefore(editor, content || null);
    if (content) content.style.display = "none";
    if (footer) footer.style.display = "none";
    vaultButton?.setAttribute("aria-expanded", "true");

    const closeEditor = () => {
      editor.remove();
      if (content) content.style.display = "";
      if (footer) footer.style.display = "";
      if (vaultButton) {
        vaultButton.removeAttribute("aria-expanded");
        this.setVaultAvailability(
          this.requestFinished && Boolean(this.lastRawContent.trim())
        );
      }
    };
    cancelButton.addEventListener("click", closeEditor);
    editor.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this.jargonSaveInProgress) return;

      const term = termInput.value.trim();
      const explanation = explanationInput.value.trim();
      const sourceUrl = sourceUrlInput.value.trim();
      if (!term || !explanation) {
        errorEl.textContent = "术语和人话释义不能为空";
        return;
      }
      if (sourceUrl && !getSafeHttpUrl(sourceUrl)) {
        errorEl.textContent = "来源链接只支持 http(s) 地址";
        return;
      }

      this.jargonSaveInProgress = true;
      saveButton.disabled = true;
      cancelButton.disabled = true;
      termInput.disabled = true;
      explanationInput.disabled = true;
      sourceContextInput.disabled = true;
      sourceUrlInput.disabled = true;
      errorEl.textContent = "保存中...";
      const item = {
        ...snapshotItem,
        term,
        explanation,
        sourceContext: sourceContextInput.value.trim(),
        sourceUrl,
      };
      void browser.runtime
        .sendMessage({ action: MESSAGE_TYPES.SAVE_JARGON_ITEM, item })
        .then((response: { success?: boolean; error?: string } | undefined) => {
          if (response?.success !== true) {
            throw new Error(response?.error || "保存生词本失败");
          }
          if (
            this.currentPopup !== sourcePopup ||
            this.currentRequestId !== sourceRequestId ||
            !sourcePopup.querySelector(".translator-jargon-editor")
          ) {
            return;
          }
          closeEditor();
          if (vaultButton) {
            vaultButton.textContent = "已收藏 ✓";
            vaultButton.disabled = true;
          }
        })
        .catch((error: unknown) => {
          logger.error("存入生词本失败:", error);
          if (
            this.currentPopup !== sourcePopup ||
            this.currentRequestId !== sourceRequestId
          ) {
            return;
          }
          errorEl.textContent =
            error instanceof Error ? error.message : "保存生词本失败，请重试";
          saveButton.disabled = false;
          cancelButton.disabled = false;
          termInput.disabled = false;
          explanationInput.disabled = false;
          sourceContextInput.disabled = false;
          sourceUrlInput.disabled = false;
        })
        .finally(() => {
          if (this.currentPopup === sourcePopup && this.currentRequestId === sourceRequestId) {
            this.jargonSaveInProgress = false;
          }
        });
    });
  }

  private setThemeMode(mode: ThemeMode) {
    if (this.destroyed) return;
    this.themeMode = normalizeThemeMode(mode);
    this.systemThemeCleanup?.();
    this.systemThemeCleanup = null;

    if (this.currentPopup) {
      applyPopupTheme(this.currentPopup, this.themeMode);
      this.updateThemeControls(this.currentPopup);
    }

    this.systemThemeCleanup = watchSystemTheme(
      this.themeMode,
      (resolvedTheme) => {
        if (!this.currentPopup) return;
        applyPopupTheme(
          this.currentPopup,
          this.themeMode,
          resolvedTheme === THEME_MODES.DARK
        );
      }
    );
  }

  private updateThemeControls(popup: HTMLElement) {
    const labels: Record<ThemeMode, string> = {
      system: "跟随系统",
      light: "浅色",
      dark: "深色",
    };
    const icons: Record<ThemeMode, string> = {
      system: "◐",
      light: "☀",
      dark: "☾",
    };
    const trigger = popup.querySelector(
      ".translator-theme-trigger"
    ) as HTMLButtonElement | null;
    const triggerIcon = popup.querySelector(
      ".translator-theme-trigger-icon"
    ) as HTMLElement | null;

    if (trigger) {
      trigger.title = `外观：${labels[this.themeMode]}`;
      trigger.setAttribute(
        "aria-label",
        `切换外观，当前为${labels[this.themeMode]}`
      );
    }
    if (triggerIcon) triggerIcon.textContent = icons[this.themeMode];

    popup
      .querySelectorAll<HTMLButtonElement>("[data-theme-option]")
      .forEach((button) => {
        const optionMode = normalizeThemeMode(button.dataset.themeOption);
        const active = optionMode === this.themeMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-checked", String(active));
        const check = button.querySelector(".translator-theme-check");
        if (check) check.textContent = active ? "✓" : "";
      });
  }

  private setupThemeControls(popup: HTMLElement) {
    const trigger = popup.querySelector(
      ".translator-theme-trigger"
    ) as HTMLButtonElement | null;
    const menu = popup.querySelector(
      ".translator-theme-menu"
    ) as HTMLElement | null;
    if (!trigger || !menu) return;

    const closeMenu = () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };
    const toggleMenu = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
    };
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!popup.querySelector(".translator-theme-selector")?.contains(
        event.target as Node
      )) {
        closeMenu();
      }
    };
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    trigger.addEventListener("click", toggleMenu);
    const optionListeners = Array.from(
      popup.querySelectorAll<HTMLButtonElement>("[data-theme-option]")
    ).map((button) => {
      const listener = async (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextMode = normalizeThemeMode(button.dataset.themeOption);
        const previousMode = this.themeMode;
        this.setThemeMode(nextMode);
        closeMenu();

        try {
          await SettingsUtils.setSetting("theme", nextMode);
        } catch (error) {
          this.setThemeMode(previousMode);
          logger.error("保存主题设置失败:", error);
        }
      };
      button.addEventListener("click", listener);
      return { button, listener };
    });

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    this.themeMenuCleanup = () => {
      trigger.removeEventListener("click", toggleMenu);
      optionListeners.forEach(({ button, listener }) =>
        button.removeEventListener("click", listener)
      );
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }

  // 设置滚动检测方法
  private setupScrollDetection(popup: HTMLElement) {
    // 获取内容区域元素
    const contentEl = popup.querySelector(".translator-content") as HTMLElement;
    this.userHasScrolled = false; // 重置滚动状态

    // 监听滚动事件
    contentEl.addEventListener("scroll", () => {
      // 判断是否滚动到底部
      const isAtBottom =
        contentEl.scrollHeight - contentEl.scrollTop <=
        contentEl.clientHeight + 1;
      // 更新滚动状态
      this.userHasScrolled = !isAtBottom;
    });

    // 将滚动状态绑定到弹窗元素上
    (popup as any).userHasScrolled = () => this.userHasScrolled;
  }

  // 获取弹窗内各个元素的方法
  private getPopupElements() {
    if (!this.currentPopup) return {};

    return {
      translatedTextEl: this.currentPopup.querySelector(
        ".translator-translated-text"
      ) as HTMLElement, // 译文显示区域
      reasoningSectionEl: this.currentPopup.querySelector(
        ".translator-section-reasoning"
      ) as HTMLElement, // 思维链区域
      reasoningTextEl: this.currentPopup.querySelector(
        ".translator-reasoning-text"
      ) as HTMLElement, // 思维链文本
      loadingEl: this.currentPopup.querySelector(
        ".translator-loading"
      ) as HTMLElement, // 加载/状态提示行
      loadingTextEl: this.currentPopup.querySelector(
        ".translator-loading-text"
      ) as HTMLElement, // 状态提示文案
      stopBtnEl: this.currentPopup.querySelector(
        ".translator-stop-btn"
      ) as HTMLButtonElement, // 停止生成按钮
      retryBtnEl: this.currentPopup.querySelector(
        ".translator-retry-btn"
      ) as HTMLButtonElement, // 失败重试按钮
      resultMetaEl: this.currentPopup.querySelector(
        ".translator-result-meta"
      ) as HTMLElement,
      contentEl: this.currentPopup.querySelector(
        ".translator-content"
      ) as HTMLElement, // 内容容器
    };
  }

  // 统一更新状态行的文案与按钮可见性
  private updateStatusRow(
    elements: ReturnType<PopupManager["getPopupElements"]>,
    text: string,
    options: { showStop?: boolean; showRetry?: boolean }
  ) {
    if (!elements.loadingEl || !elements.loadingTextEl) return;

    elements.loadingTextEl.textContent = text;
    if (elements.stopBtnEl) {
      elements.stopBtnEl.style.display = options.showStop ? "" : "none";
    }
    if (elements.retryBtnEl) {
      elements.retryBtnEl.style.display = options.showRetry ? "" : "none";
    }
  }

  // 停止当前流式翻译：通知后台中止请求，并在本地立即回退状态
  private stopCurrentTranslation() {
    if (!this.currentPopup || this.requestFinished) return;

    // 与关闭按钮、Popup 的取消逻辑使用同一清理协议；
    // 后台对中止（AbortError）静默处理，不会向弹窗推送错误
    browser.runtime
      .sendMessage({
        action: MESSAGE_TYPES.CLEANUP,
        requestId: this.allowLegacyMessages
          ? undefined
          : this.currentRequestId,
      })
      .catch((error) => logger.error("停止翻译时发送清理消息失败:", error));

    // 立即结束本地请求状态，忽略后台可能仍在途的迟到更新
    this.requestFinished = true;

    const elements = this.getPopupElements();
    const hasPartialText = Boolean(elements.translatedTextEl?.textContent?.trim());
    // 中止不视为失败，不展示重试入口（与 Popup 的取消文案保持一致）
    this.updateStatusRow(
      elements,
      hasPartialText ? "已停止继续生成" : "已取消翻译",
      { showStop: false, showRetry: false }
    );
  }

  // 失败后使用上次的划词内容重新发起完整翻译流程
  private async retryTranslation(bypassJargonVault = false) {
    if (!this.currentPopup || !this.requestFinished) return; // 翻译进行中不允许重试

    const text = this.lastSelectionText?.trim();
    if (!text) return;
    const popup = this.currentPopup;
    const selectionContext = this.lastSelectionContext;

    const requestId = createRequestId();
    this.currentRequestId = requestId;
    this.requestFinished = false;
    this.userHasScrolled = false;

    // 清空上一次的结果，回到加载中状态
    const elements = this.getPopupElements();
    if (elements.translatedTextEl) elements.translatedTextEl.innerHTML = "";
    if (elements.reasoningTextEl) elements.reasoningTextEl.innerHTML = "";
    if (elements.reasoningSectionEl) {
      elements.reasoningSectionEl.style.display = "none";
    }
    if (elements.loadingEl) elements.loadingEl.style.display = "";
    if (elements.resultMetaEl) elements.resultMetaEl.style.display = "none";
    this.updateStatusRow(elements, "正在翻译...", {
      showStop: true,
      showRetry: false,
    });

    try {
      const settings = await SettingsUtils.getSettings();

      // 读取设置期间弹窗被关闭时，取消刚创建的请求
      if (
        this.currentPopup !== popup ||
        this.currentRequestId !== requestId
      ) {
        browser.runtime
          .sendMessage({ action: MESSAGE_TYPES.CLEANUP, requestId })
          .catch(() => {});
        return;
      }

      const response = await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId,
        text,
        selectionContext,
        thinkingEnabled: settings.thinkingEnabled ?? false,
        bypassJargonVault,
      });

      // 后台前置校验失败（如缺少 API Key）时同步展示错误
      if (
        response &&
        response.success === false &&
        this.currentRequestId === requestId
      ) {
        this.requestFinished = true;
        this.handleTranslationError(response.error || "翻译失败，请重试");
      }
    } catch (error: any) {
      logger.error("重试翻译失败:", error);
      if (
        this.currentPopup === popup &&
        this.currentRequestId === requestId
      ) {
        this.requestFinished = true;
        this.handleTranslationError(
          error?.message || "翻译失败，请重试"
        );
      }
    }
  }

  private async startDeferredTranslation(useContext: boolean) {
    if (
      !this.currentPopup ||
      this.requestFinished ||
      this.deferredStartInProgress
    ) return;
    this.deferredStartInProgress = true;
    const popup = this.currentPopup;
    const text = this.lastSelectionText.trim();
    const requestId = this.currentRequestId;
    const selectionContext = this.lastSelectionContext;
    if (!text || !requestId) return;

    const contextActions = popup.querySelector(
      ".translator-context-actions"
    ) as HTMLElement | null;
    if (contextActions) contextActions.style.display = "none";
    const contextTitle = popup.querySelector(
      ".translator-context-preview-title"
    );
    if (contextTitle) {
      contextTitle.textContent = useContext
        ? "已结合当前段落解释"
        : "本次仅解释选中文字（段落未发送）";
    }
    const elements = this.getPopupElements();
    if (elements.loadingEl) elements.loadingEl.style.display = "";
    this.updateStatusRow(elements, "正在翻译...", {
      showStop: true,
      showRetry: false,
    });
    if (!useContext) this.lastSelectionContext = undefined;

    try {
      const settings = await SettingsUtils.getSettings();
      if (
        this.currentPopup !== popup ||
        this.currentRequestId !== requestId ||
        this.requestFinished
      ) {
        return;
      }
      await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId,
        text,
        selectionContext: useContext ? selectionContext : undefined,
        thinkingEnabled: settings.thinkingEnabled ?? false,
      });
    } catch (error: any) {
      if (
        this.currentPopup !== popup ||
        this.currentRequestId !== requestId
      ) {
        return;
      }
      logger.error("发送划词解释请求失败:", error);
      this.requestFinished = true;
      this.handleTranslationError(error?.message || "翻译失败，请重试");
    }
  }

  // 处理翻译错误的方法
  private handleTranslationError(error: string) {
    logger.log("翻译发生错误:", error);
    // 根据错误类型显示不同的错误信息
    const message = formatPopupTranslationError(error);

    const elements = this.getPopupElements();
    if (!elements.loadingEl) return;

    elements.loadingEl.style.display = "";
    this.updateStatusRow(elements, message, {
      showStop: false,
      showRetry: true,
    });
  }

  private renderTranslatedContent(elements: any) {
    if (!elements?.translatedTextEl) return;
    const prismTabsEl = this.currentPopup?.querySelector(
      ".translator-prism-tabs"
    ) as HTMLElement | null;
    const copyCorporateBtn = this.currentPopup?.querySelector(
      ".translator-copy-corporate-btn"
    ) as HTMLElement | null;
    const copyBtn = this.currentPopup?.querySelector(
      ".translator-copy-btn"
    ) as HTMLElement | null;

    if (this.lastPrismResult?.isPrism) {
      if (prismTabsEl) {
        prismTabsEl.style.display = "flex";
        prismTabsEl
          .querySelectorAll(".translator-prism-tab")
          .forEach((tabEl) => {
            const tabKey = tabEl.getAttribute("data-tab");
            if (tabKey === this.currentPrismTab) {
              tabEl.classList.add("active");
            } else {
              tabEl.classList.remove("active");
            }
          });
      }
      if (copyCorporateBtn) {
        copyCorporateBtn.style.display = "inline-flex";
      }
      if (copyBtn && !this.copyFeedbackTimer) {
        const meta = PRISM_TABS[this.currentPrismTab];
        copyBtn.textContent = `复制${meta?.shortLabel || "当前版"}`;
      }

      const activeContent = getPrismContentByTab(
        this.lastPrismResult,
        this.currentPrismTab
      );
      elements.translatedTextEl.innerHTML = parseMarkdown(activeContent);
    } else {
      if (prismTabsEl) prismTabsEl.style.display = "none";
      if (copyCorporateBtn) copyCorporateBtn.style.display = "none";
      if (copyBtn && !this.copyFeedbackTimer) copyBtn.textContent = "复制译文";
      elements.translatedTextEl.innerHTML = parseMarkdown(this.lastRawContent);
    }
  }

  // 处理翻译更新的方法
  private handleTranslationUpdate(request: TranslationRequest, elements: any) {
    logger.log("更新翻译结果", {
      hasContent: !!request.content,
      hasReasoning: request.hasReasoning,
      reasoningContentLength: request.reasoningContent?.length || 0,
      done: request.done,
    });

    // 更新译文内容
    if (request.content) {
      this.lastRawContent = request.content;
      this.lastPrismResult = parsePrismTranslation(request.content);
      this.renderTranslatedContent(elements);
    }

    if (elements.resultMetaEl) {
      elements.resultMetaEl.style.display =
        request.resultSource === "jargon-vault" ? "flex" : "none";
    }

    // 处理思维链内容
    if (elements.reasoningSectionEl && elements.reasoningTextEl) {
      logger.log("处理思维链内容:", {
        hasReasoning: request.hasReasoning,
        reasoningContent: request.reasoningContent,
      });

      // 根据是否有思维链内容显示/隐藏区域
      if (request.hasReasoning && request.reasoningContent) {
        elements.reasoningSectionEl.style.display = "block";
        elements.reasoningTextEl.innerHTML = parseMarkdown(
          request.reasoningContent
        );
        logger.log("思维链已显示");
      } else if (!request.hasReasoning) {
        elements.reasoningSectionEl.style.display = "none";
      }
    }

    // 翻译完成时隐藏加载提示
    if (request.done) {
      logger.log("翻译完成");
      elements.loadingEl.style.display = "none";
    }

    this.setVaultAvailability(
      Boolean(request.done && this.lastRawContent.trim())
    );

    // 如果用户没有手动滚动，则自动滚动到底部
    if (!this.userHasScrolled && elements.contentEl) {
      elements.contentEl.scrollTop = elements.contentEl.scrollHeight;
    }
  }

  // 保存弹窗状态的方法
  private savePopupState(popup: HTMLElement) {
    // 从样式属性中获取位置和大小
    const left = parseInt(popup.style.left);
    const top = parseInt(popup.style.top);
    const width = parseInt(popup.style.width);

    // 如果都是有效数字则保存状态
    if (!isNaN(left) && !isNaN(top) && !isNaN(width)) {
      this.lastPopupState = { left, top, width };
    }
  }
}
