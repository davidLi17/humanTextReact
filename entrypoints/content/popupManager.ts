// 导入必要的类型和模块
import {
  PopupState,  // 弹窗状态类型
  MESSAGE_TYPES,  // 消息类型常量
  TranslationRequest,  // 翻译请求类型
} from "../shared/constants";  // 从共享常量文件中导入
import { PopupEventHandler } from "./popupEventHandler";  // 弹窗事件处理器
import { parseMarkdown } from "../../shared/utils/markdown";  // Markdown解析工具

// 弹窗管理类，负责创建、显示、更新和删除翻译弹窗
export class PopupManager {
  // 存储上一次弹窗的状态（位置和大小）
  private lastPopupState: PopupState = {
    left: null,  // 弹窗左侧位置
    top: null,   // 弹窗顶部位置
    width: null, // 弹窗宽度
  };
  // 当前显示的弹窗元素
  private currentPopup: HTMLElement | null = null;
  // 弹窗事件处理器实例
  private eventHandler: PopupEventHandler | null = null;
  // 标记用户是否手动滚动过弹窗内容
  private userHasScrolled = false;

  // 显示弹窗方法，接收用户选中的文本
  public showPopup(selection: string): HTMLElement {
    // 清理可能存在的旧弹窗
    this.removeCurrentPopup();

    // 创建新的弹窗元素
    const popup = this.createPopupElement(selection);
    this.currentPopup = popup;

    // 将弹窗添加到页面中
    document.body.appendChild(popup);
    // 设置弹窗位置
    this.positionPopup(popup);
    // 设置事件处理器
    this.setupEventHandlers(popup);
    // 设置滚动检测
    this.setupScrollDetection(popup);

    return popup;
  }

  // 更新翻译内容方法，接收翻译请求
  public updateTranslation(request: TranslationRequest): boolean {
    // 检查弹窗是否存在
    if (!this.currentPopup) {
      console.log("翻译弹窗不存在，可能已关闭");
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
      return false;
    }

    // 处理翻译错误或更新翻译结果
    if (request.error) {
      this.handleTranslationError(request.error, elements.loadingEl);
    } else {
      this.handleTranslationUpdate(request, elements);
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
  }

  // 创建弹窗元素方法，接收用户选中的文本
  private createPopupElement(selection: string): HTMLElement {
    // 创建div元素作为弹窗容器
    const popup = document.createElement("div");
    popup.className = "translator-popup";  // 设置CSS类名
    // 设置弹窗HTML结构
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

  // 定位弹窗方法
  private positionPopup(popup: HTMLElement) {
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认位置和大小
    let left = viewportWidth - 420;  // 默认右侧位置
    let top = 20;  // 默认顶部位置
    let width = 400;  // 默认宽度

    // 如果存在上次保存的位置，则使用上次的位置
    if (this.lastPopupState.left !== null && this.lastPopupState.top !== null) {
      left = Math.min(
        Math.max(0, this.lastPopupState.left),  // 确保不超出屏幕左侧
        viewportWidth - 300  // 确保不超出屏幕右侧
      );
      top = Math.min(
        Math.max(0, this.lastPopupState.top),  // 确保不超出屏幕顶部
        viewportHeight - 100  // 确保不超出屏幕底部
      );
    }

    // 如果存在上次保存的宽度，则使用上次的宽度
    if (this.lastPopupState.width !== null) {
      width = Math.min(Math.max(300, this.lastPopupState.width), 1200);  // 限制宽度范围
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
      this.lastPopupState = state;  // 保存弹窗状态
      console.log("保存弹窗状态:", state);
    });

    // 关闭按钮点击事件
    popup
      .querySelector(".translator-close-btn")
      ?.addEventListener("click", () => {
        // 发送清理消息给后台
        browser.runtime.sendMessage({ action: MESSAGE_TYPES.CLEANUP });
        // 移除当前弹窗
        this.removeCurrentPopup();
      });
  }

  // 设置滚动检测方法
  private setupScrollDetection(popup: HTMLElement) {
    // 获取内容区域元素
    const contentEl = popup.querySelector(".translator-content") as HTMLElement;
    this.userHasScrolled = false;  // 重置滚动状态

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
      ) as HTMLElement,  // 译文显示区域
      reasoningSectionEl: this.currentPopup.querySelector(
        ".translator-section-reasoning"
      ) as HTMLElement,  // 思维链区域
      reasoningTextEl: this.currentPopup.querySelector(
        ".translator-reasoning-text"
      ) as HTMLElement,  // 思维链文本
      loadingEl: this.currentPopup.querySelector(
        ".translator-loading"
      ) as HTMLElement,  // 加载提示
      contentEl: this.currentPopup.querySelector(
        ".translator-content"
      ) as HTMLElement,  // 内容容器
    };
  }

  // 处理翻译错误的方法
  private handleTranslationError(error: string, loadingEl: HTMLElement) {
    console.log("翻译发生错误:", error);
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
    console.log("更新翻译结果");

    // 更新译文内容
    if (request.content) {
      elements.translatedTextEl.innerHTML = parseMarkdown(request.content);
    }

    // 处理思维链内容
    if (elements.reasoningSectionEl) {
      // 根据是否有思维链内容显示/隐藏区域
      elements.reasoningSectionEl.style.display = request.hasReasoning
        ? "block"
        : "none";
      // 如果有思维链内容则更新
      if (request.hasReasoning && request.reasoningContent) {
        elements.reasoningTextEl.innerHTML = parseMarkdown(
          request.reasoningContent
        );
      }
    }

    // 翻译完成时隐藏加载提示
    if (request.done) {
      console.log("翻译完成");
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