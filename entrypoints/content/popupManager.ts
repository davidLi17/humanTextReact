// 导入必要的类型和模块
import {
  MESSAGE_TYPES,
  PopupState, // 消息类型常量
  THEME_MODES,
  ThemeMode,
  TranslationRequest, // 翻译请求类型
} from "@/entrypoints/shared/constants"; // 从共享常量文件中导入
import { createLogger } from "@/entrypoints/shared/logger";
import { shouldAcceptRequestUpdate } from "@/entrypoints/shared/requestProtocol";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  normalizeThemeMode,
  watchSystemTheme,
} from "@/entrypoints/shared/theme";
import { initializeCodeCopy, parseMarkdown } from "@/shared/utils/markdown"; // Markdown解析工具
import { PopupEventHandler } from "./popupEventHandler";
import { applyPopupTheme } from "./styles";

const logger = createLogger("content-popup", "🔽"); // 弹窗事件处理器

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
  // 系统主题和菜单事件的清理函数
  private systemThemeCleanup: (() => void) | null = null;
  private themeMenuCleanup: (() => void) | null = null;

  constructor() {
    void SettingsUtils.getSettings().then((settings) => {
      this.setThemeMode(normalizeThemeMode(settings.theme));
    });

    SettingsUtils.onSettingsChanged((settings) => {
      this.setThemeMode(normalizeThemeMode(settings.theme));
    });
  }

  // 显示弹窗方法，接收用户选中的文本
  public showPopup(
    selection: string,
    requestId: string,
    allowLegacyMessages = false
  ): HTMLElement {
    logger.log("显示弹窗", {
      requestId,
      textLength: selection?.length || 0,
      textPreview: selection?.substring(0, 50) + "...",
      hasCurrentPopup: !!this.currentPopup,
      timestamp: new Date().toISOString(),
    });

    // 清理可能存在的旧弹窗
    this.removeCurrentPopup();

    // 创建新的弹窗元素
    const popup = this.createPopupElement(selection);
    this.currentPopup = popup;
    this.currentRequestId = requestId;
    this.allowLegacyMessages = allowLegacyMessages;
    this.requestFinished = false;

    // 将弹窗添加到页面中
    document.body.appendChild(popup);
    // 初始化复制功能
    initializeCodeCopy();
    // 设置弹窗位置
    this.positionPopup(popup);
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
      this.handleTranslationError(request.error, elements.loadingEl);
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
  }

  // 创建弹窗元素方法，接收用户选中的文本
  private createPopupElement(selection: string): HTMLElement {
    // 创建div元素作为弹窗容器
    const popup = document.createElement("div");
    popup.className = "translator-popup"; // 设置CSS类名
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
          <div class="translator-text">${selection}</div>
          <button class="translator-copy-original-btn">复制</button>
        </div>
        <div class="translator-section translator-section-reasoning" style="display: none;">
          <div class="translator-label">思维链</div>
          <div class="translator-reasoning-text"></div>
        </div>
        <div class="translator-section">
          <div class="translator-label">译文</div>
          <div class="translator-translated-text"></div>
          <div class="translator-loading">正在翻译...</div>
        </div>
      </div>
      <button class="translator-copy-btn">复制译文</button>
    `;
    applyPopupTheme(popup, this.themeMode);
    this.updateThemeControls(popup);

    return popup;
  }

  // 定位弹窗方法
  private positionPopup(popup: HTMLElement) {
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认位置和大小
    let left = viewportWidth - 420; // 默认右侧位置
    let top = 20; // 默认顶部位置
    let width = 400; // 默认宽度

    // 如果存在上次保存的位置，则使用上次的位置
    if (this.lastPopupState.left !== null && this.lastPopupState.top !== null) {
      left = Math.min(
        Math.max(0, this.lastPopupState.left), // 确保不超出屏幕左侧
        viewportWidth - 300 // 确保不超出屏幕右侧
      );
      top = Math.min(
        Math.max(0, this.lastPopupState.top), // 确保不超出屏幕顶部
        viewportHeight - 100 // 确保不超出屏幕底部
      );
    }

    // 如果存在上次保存的宽度，则使用上次的宽度
    if (this.lastPopupState.width !== null) {
      width = Math.min(Math.max(300, this.lastPopupState.width), 1200); // 限制宽度范围
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

    // 侧边栏追问按钮点击事件
    popup
      .querySelector(".translator-sidepanel-btn")
      ?.addEventListener("click", async () => {
        const originalText =
          popup.querySelector(".translator-text")?.textContent;
        if (originalText) {
          try {
            await browser.storage.local.set({
              pendingSidepanelText: {
                text: originalText,
                timestamp: Date.now(),
              },
            });
            await browser.runtime.sendMessage({
              action: MESSAGE_TYPES.OPEN_SIDEPANEL,
            });
            this.removeCurrentPopup();
          } catch (error) {
            logger.error("打开侧边栏失败:", error);
          }
        }
      });

    // 收藏到生词本按钮点击事件
    popup
      .querySelector(".translator-vault-btn")
      ?.addEventListener("click", async () => {
        const originalText =
          popup.querySelector(".translator-text")?.textContent;
        const translatedText = popup.querySelector(
          ".translator-translated-text"
        )?.textContent;
        const vaultBtn = popup.querySelector(
          ".translator-vault-btn"
        ) as HTMLButtonElement | null;

        if (originalText && translatedText && vaultBtn) {
          try {
            vaultBtn.textContent = "保存中...";
            await browser.runtime.sendMessage({
              action: MESSAGE_TYPES.SAVE_JARGON_ITEM,
              item: {
                term: originalText.slice(0, 30).trim(),
                explanation: translatedText.trim(),
                category: "通用",
              },
            });
            vaultBtn.textContent = "已收藏 ✓";
            setTimeout(() => {
              if (vaultBtn) vaultBtn.textContent = "⭐ 收藏";
            }, 2000);
          } catch (error) {
            logger.error("存入生词本失败:", error);
            if (vaultBtn) vaultBtn.textContent = "⭐ 收藏";
          }
        }
      });

    // 复制译文按钮
    popup
      .querySelector(".translator-copy-btn")
      ?.addEventListener("click", async () => {
        const translatedText = popup.querySelector(
          ".translator-translated-text"
        )?.textContent;
        if (translatedText) {
          try {
            await navigator.clipboard.writeText(translatedText);
            logger.log("译文已复制");
          } catch (error) {
            logger.error("复制译文失败:", error);
          }
        }
      });
  }

  private setThemeMode(mode: ThemeMode) {
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
      ) as HTMLElement, // 加载提示
      contentEl: this.currentPopup.querySelector(
        ".translator-content"
      ) as HTMLElement, // 内容容器
    };
  }

  // 处理翻译错误的方法
  private handleTranslationError(error: string, loadingEl: HTMLElement) {
    logger.log("翻译发生错误:", error);
    // 根据错误类型显示不同的错误信息
    if (
      error.includes("API Key") ||
      error.includes("API 请求失败") ||
      error.includes("rate limit")
    ) {
      loadingEl.textContent = "翻译失败：" + error;
    } else {
      loadingEl.textContent = "翻译失败，请重试";
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
      elements.translatedTextEl.innerHTML = parseMarkdown(request.content);
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
