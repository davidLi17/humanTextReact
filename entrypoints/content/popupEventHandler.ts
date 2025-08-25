import { PopupState } from "../shared/constants";

export class PopupEventHandler {
  // 标记是否正在拖拽中
  private isDragging = false;
  // 标记是否正在调整大小中
  private isResizing = false;
  // 记录调整大小的方向（'left' 或 'right'）
  private resizeDirection: string | null = null;
  // 记录鼠标按下时的初始X坐标
  private startX = 0;
  // 记录鼠标按下时的初始Y坐标
  private startY = 0;
  // 记录开始调整大小时的初始宽度
  private startWidth = 0;
  // 记录拖拽开始时元素的初始X位置
  private initialX = 0;
  // 记录拖拽开始时元素的初始Y位置
  private initialY = 0;
  // 记录开始调整大小时的初始left位置（用于左侧调整）
  private startLeft = 0;
  // 清理函数，用于移除事件监听
  private cleanup: (() => void) | null = null;

  // 构造函数，接收popup元素和状态变化回调函数
  constructor(
    private popup: HTMLElement,
    private onStateChange: (state: PopupState) => void
  ) {
    // 初始化事件监听
    this.initializeEvents();
  }

  // 初始化所有事件监听
  private initializeEvents() {
    // 获取popup中的头部元素
    const header = this.popup.querySelector(
      ".translator-header"
    ) as HTMLElement;

    // 为头部元素添加鼠标按下事件监听（用于拖拽）
    header.addEventListener("mousedown", this.handleHeaderMouseDown, true);
    // 为整个popup添加鼠标按下事件监听（用于检测调整大小）
    this.popup.addEventListener("mousedown", this.handlePopupMouseDown, true);

    // 设置复制按钮的事件监听
    this.setupCopyButtons();

    // 在文档上添加鼠标移动和松开事件监听（使用事件捕获）
    document.addEventListener("mousemove", this.handleMouseMove, true);
    document.addEventListener("mouseup", this.handleMouseUp, true);

    // 设置清理函数，用于移除全局事件监听
    this.cleanup = () => {
      document.removeEventListener("mousemove", this.handleMouseMove, true);
      document.removeEventListener("mouseup", this.handleMouseUp, true);
    };
  }

  // 处理头部鼠标按下事件（开始拖拽）
  private handleHeaderMouseDown = (e: MouseEvent) => {
    // 设置拖拽状态为true
    this.isDragging = true;
    // 记录当前鼠标位置
    this.startX = e.clientX;
    this.startY = e.clientY;
    // 记录popup的初始位置
    this.initialX = this.popup.offsetLeft;
    this.initialY = this.popup.offsetTop;
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理popup鼠标按下事件（检测调整大小）
  private handlePopupMouseDown = (e: MouseEvent) => {
    // 如果点击的是头部元素，则跳过（因为头部用于拖拽）
    if ((e.target as HTMLElement).closest(".translator-header")) {
      return;
    }

    // 获取popup的位置和尺寸信息
    const rect = this.popup.getBoundingClientRect();
    // 计算鼠标距离左边缘的距离
    const leftEdgeDistance = e.clientX - rect.left;
    // 计算鼠标距离右边缘的距离
    const rightEdgeDistance = rect.right - e.clientX;

    // 如果鼠标在左边缘15像素范围内
    if (leftEdgeDistance <= 15) {
      // 设置调整大小状态
      this.isResizing = true;
      // 设置调整方向为左侧
      this.resizeDirection = "left";
      // 记录当前宽度
      this.startWidth = this.popup.offsetWidth;
      // 记录当前鼠标位置
      this.startX = e.clientX;
      // 记录当前left位置
      this.startLeft = this.popup.offsetLeft;
      // 添加resizing-left类（用于样式调整）
      this.popup.classList.add("resizing-left");
      // 阻止默认行为和事件冒泡
      e.preventDefault();
      e.stopPropagation();
    } else if (rightEdgeDistance <= 15) {
      // 如果鼠标在右边缘15像素范围内
      // 设置调整大小状态
      this.isResizing = true;
      // 设置调整方向为右侧
      this.resizeDirection = "right";
      // 记录当前宽度
      this.startWidth = this.popup.offsetWidth;
      // 记录当前鼠标位置
      this.startX = e.clientX;
      // 添加resizing-right类（用于样式调整）
      this.popup.classList.add("resizing-right");
      // 阻止默认行为和事件冒泡
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // 处理鼠标移动事件
  private handleMouseMove = (e: MouseEvent) => {
    // 如果正在调整大小，则处理调整大小
    if (this.isResizing) {
      this.handleResize(e);
    } else if (this.isDragging) {
      // 如果正在拖拽，则处理拖拽
      this.handleDrag(e);
    }
  };

  // 处理调整大小
  private handleResize(e: MouseEvent) {
    let newWidth: number;

    // 根据调整方向计算新宽度
    if (this.resizeDirection === "right") {
      // 右侧调整：计算鼠标移动距离
      const dx = e.clientX - this.startX;
      // 新宽度 = 初始宽度 + 移动距离
      newWidth = this.startWidth + dx;
    } else if (this.resizeDirection === "left") {
      // 左侧调整：计算鼠标移动距离（反向）
      const dx = this.startX - e.clientX;
      // 新宽度 = 初始宽度 + 移动距离
      newWidth = this.startWidth + dx;
    } else {
      // 如果没有调整方向，则返回
      return;
    }

    // 限制宽度在300到1200像素之间
    newWidth = Math.min(Math.max(300, newWidth), 1200);
    // 设置popup的新宽度
    this.popup.style.width = `${newWidth}px`;

    // 如果是左侧调整，还需要调整left位置
    if (this.resizeDirection === "left") {
      // 计算新的left位置
      const newLeft = this.startLeft - (newWidth - this.startWidth);
      // 设置popup的新left位置
      this.popup.style.left = `${newLeft}px`;
    }

    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
  }

  // 处理拖拽
  private handleDrag(e: MouseEvent) {
    // 计算鼠标移动距离
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    // 设置popup的新位置（初始位置 + 移动距离）
    this.popup.style.left = `${this.initialX + dx}px`;
    this.popup.style.top = `${this.initialY + dy}px`;
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
  }

  // 处理鼠标松开事件
  private handleMouseUp = (e: MouseEvent) => {
    // 如果之前正在调整大小
    if (this.isResizing) {
      // 重置调整大小状态
      this.isResizing = false;
      // 清空调整方向
      this.resizeDirection = null;
      // 移除resizing相关类
      this.popup.classList.remove("resizing-left", "resizing-right");
      // 保存popup状态
      this.savePopupState();
      // 阻止默认行为和事件冒泡
      e.preventDefault();
      e.stopPropagation();
    }
    // 如果之前正在拖拽
    if (this.isDragging) {
      // 重置拖拽状态
      this.isDragging = false;
      // 保存popup状态
      this.savePopupState();
    }
  };

  // 设置复制按钮的事件监听
  private setupCopyButtons() {
    // 获取复制译文按钮
    const copyBtn = this.popup.querySelector(".translator-copy-btn");
    // 为复制译文按钮添加点击事件
    copyBtn?.addEventListener("click", () => {
      // 获取译文文本内容
      const translatedText =
        (this.popup.querySelector(".translator-translated-text") as HTMLElement)
          ?.textContent || "";
      // 调用复制到剪贴板函数
      this.copyToClipboard(translatedText, copyBtn as HTMLElement, "复制译文");
    });

    // 获取复制原文按钮
    const copyOriginalBtn = this.popup.querySelector(
      ".translator-copy-original-btn"
    );
    // 为复制原文按钮添加点击事件
    copyOriginalBtn?.addEventListener("click", () => {
      // 获取原文文本内容
      const originalText =
        (this.popup.querySelector(".translator-text") as HTMLElement)
          ?.textContent || "";
      // 调用复制到剪贴板函数
      this.copyToClipboard(
        originalText,
        copyOriginalBtn as HTMLElement,
        "复制"
      );
    });
  }

  // 复制文本到剪贴板
  private async copyToClipboard(
    text: string,        // 要复制的文本
    button: HTMLElement, // 按钮元素
    originalText: string // 按钮原始文本
  ) {
    try {
      // 使用Clipboard API复制文本
      await navigator.clipboard.writeText(text);
      // 复制成功后，将按钮文本改为"已复制"
      button.textContent = "已复制";
      // 1.5秒后恢复按钮原始文本
      setTimeout(() => (button.textContent = originalText), 1500);
    } catch (error) {
      // 复制失败时输出错误信息
      console.error("复制失败:", error);
      // 弹出复制失败提示
      alert("复制失败，请重试");
    }
  }

  // 保存popup状态
  private savePopupState() {
    // 获取当前popup的位置和尺寸
    const left = parseInt(this.popup.style.left);
    const top = parseInt(this.popup.style.top);
    const width = parseInt(this.popup.style.width);

    // 如果所有值都是有效数字，则调用状态变化回调
    if (!isNaN(left) && !isNaN(top) && !isNaN(width)) {
      this.onStateChange({ left, top, width });
    }
  }

  // 销毁方法，用于清理事件监听
  public destroy() {
    // 如果存在清理函数，则执行
    if (this.cleanup) {
      this.cleanup();
    }
  }
}