import { PopupState, MESSAGE_TYPES, TranslationRequest } from "./constants";
import { PopupEventHandler } from "./popupEventHandler";
import { parseMarkdown } from "./markdown";

export class PopupManager {
  private lastPopupState: PopupState = {
    left: null,
    top: null,
    width: null,
  };
  private currentPopup: HTMLElement | null = null;
  private eventHandler: PopupEventHandler | null = null;
  private userHasScrolled = false;

  public showPopup(selection: string): HTMLElement {
    // 清理可能存在的旧弹窗
    this.removeCurrentPopup();

    const popup = this.createPopupElement(selection);
    this.currentPopup = popup;

    document.body.appendChild(popup);
    this.positionPopup(popup);
    this.setupEventHandlers(popup);
    this.setupScrollDetection(popup);

    return popup;
  }

  public updateTranslation(request: TranslationRequest): boolean {
    if (!this.currentPopup) {
      console.log("翻译弹窗不存在，可能已关闭");
      return false;
    }

    const elements = this.getPopupElements();
    if (
      !elements.translatedTextEl ||
      !elements.reasoningTextEl ||
      !elements.loadingEl
    ) {
      return false;
    }

    if (request.error) {
      this.handleTranslationError(request.error, elements.loadingEl);
    } else {
      this.handleTranslationUpdate(request, elements);
    }

    return true;
  }

  public removeCurrentPopup() {
    if (this.currentPopup) {
      this.savePopupState(this.currentPopup);
      if (this.eventHandler) {
        this.eventHandler.destroy();
        this.eventHandler = null;
      }
      this.currentPopup.remove();
      this.currentPopup = null;
    }
  }

  private createPopupElement(selection: string): HTMLElement {
    const popup = document.createElement("div");
    popup.className = "translator-popup";
    popup.innerHTML = `
      <div class="translator-header">
        <div class="translator-title">人话翻译器</div>
        <div class="translator-close-btn">✕</div>
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
    return popup;
  }

  private positionPopup(popup: HTMLElement) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = viewportWidth - 420;
    let top = 20;
    let width = 400;

    if (this.lastPopupState.left !== null && this.lastPopupState.top !== null) {
      left = Math.min(
        Math.max(0, this.lastPopupState.left),
        viewportWidth - 300
      );
      top = Math.min(
        Math.max(0, this.lastPopupState.top),
        viewportHeight - 100
      );
    }

    if (this.lastPopupState.width !== null) {
      width = Math.min(Math.max(300, this.lastPopupState.width), 1200);
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.width = `${width}px`;
  }

  private setupEventHandlers(popup: HTMLElement) {
    // 初始化事件处理器
    this.eventHandler = new PopupEventHandler(popup, (state) => {
      this.lastPopupState = state;
      console.log("保存弹窗状态:", state);
    });

    // 关闭按钮事件
    popup
      .querySelector(".translator-close-btn")
      ?.addEventListener("click", () => {
        browser.runtime.sendMessage({ action: MESSAGE_TYPES.CLEANUP });
        this.removeCurrentPopup();
      });
  }

  private setupScrollDetection(popup: HTMLElement) {
    const contentEl = popup.querySelector(".translator-content") as HTMLElement;
    this.userHasScrolled = false;

    contentEl.addEventListener("scroll", () => {
      const isAtBottom =
        contentEl.scrollHeight - contentEl.scrollTop <=
        contentEl.clientHeight + 1;
      this.userHasScrolled = !isAtBottom;
    });

    // 将滚动状态绑定到弹窗元素
    (popup as any).userHasScrolled = () => this.userHasScrolled;
  }

  private getPopupElements() {
    if (!this.currentPopup) return {};

    return {
      translatedTextEl: this.currentPopup.querySelector(
        ".translator-translated-text"
      ) as HTMLElement,
      reasoningSectionEl: this.currentPopup.querySelector(
        ".translator-section-reasoning"
      ) as HTMLElement,
      reasoningTextEl: this.currentPopup.querySelector(
        ".translator-reasoning-text"
      ) as HTMLElement,
      loadingEl: this.currentPopup.querySelector(
        ".translator-loading"
      ) as HTMLElement,
      contentEl: this.currentPopup.querySelector(
        ".translator-content"
      ) as HTMLElement,
    };
  }

  private handleTranslationError(error: string, loadingEl: HTMLElement) {
    console.log("翻译发生错误:", error);
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

  private handleTranslationUpdate(request: TranslationRequest, elements: any) {
    console.log("更新翻译结果");

    if (request.content) {
      elements.translatedTextEl.innerHTML = parseMarkdown(request.content);
    }

    if (elements.reasoningSectionEl) {
      elements.reasoningSectionEl.style.display = request.hasReasoning
        ? "block"
        : "none";
      if (request.hasReasoning && request.reasoningContent) {
        elements.reasoningTextEl.innerHTML = parseMarkdown(
          request.reasoningContent
        );
      }
    }

    if (request.done) {
      console.log("翻译完成");
      elements.loadingEl.style.display = "none";
    }

    // 自动滚动到底部（如果用户没有手动滚动）
    if (!this.userHasScrolled && elements.contentEl) {
      elements.contentEl.scrollTop = elements.contentEl.scrollHeight;
    }
  }

  private savePopupState(popup: HTMLElement) {
    const left = parseInt(popup.style.left);
    const top = parseInt(popup.style.top);
    const width = parseInt(popup.style.width);

    if (!isNaN(left) && !isNaN(top) && !isNaN(width)) {
      this.lastPopupState = { left, top, width };
    }
  }
}
