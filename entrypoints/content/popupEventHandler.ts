import { PopupState } from "./constants";

export class PopupEventHandler {
  private isDragging = false;
  private isResizing = false;
  private resizeDirection: string | null = null;
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private initialX = 0;
  private initialY = 0;
  private startLeft = 0;
  private cleanup: (() => void) | null = null;

  constructor(
    private popup: HTMLElement,
    private onStateChange: (state: PopupState) => void
  ) {
    this.initializeEvents();
  }

  private initializeEvents() {
    const header = this.popup.querySelector(
      ".translator-header"
    ) as HTMLElement;

    // 拖拽事件
    header.addEventListener("mousedown", this.handleHeaderMouseDown, true);
    this.popup.addEventListener("mousedown", this.handlePopupMouseDown, true);

    // 复制按钮事件
    this.setupCopyButtons();

    // 全局事件监听
    document.addEventListener("mousemove", this.handleMouseMove, true);
    document.addEventListener("mouseup", this.handleMouseUp, true);

    this.cleanup = () => {
      document.removeEventListener("mousemove", this.handleMouseMove, true);
      document.removeEventListener("mouseup", this.handleMouseUp, true);
    };
  }

  private handleHeaderMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.initialX = this.popup.offsetLeft;
    this.initialY = this.popup.offsetTop;
    e.preventDefault();
    e.stopPropagation();
  };

  private handlePopupMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(".translator-header")) {
      return;
    }

    const rect = this.popup.getBoundingClientRect();
    const leftEdgeDistance = e.clientX - rect.left;
    const rightEdgeDistance = rect.right - e.clientX;

    if (leftEdgeDistance <= 15) {
      this.isResizing = true;
      this.resizeDirection = "left";
      this.startWidth = this.popup.offsetWidth;
      this.startX = e.clientX;
      this.startLeft = this.popup.offsetLeft;
      this.popup.classList.add("resizing-left");
      e.preventDefault();
      e.stopPropagation();
    } else if (rightEdgeDistance <= 15) {
      this.isResizing = true;
      this.resizeDirection = "right";
      this.startWidth = this.popup.offsetWidth;
      this.startX = e.clientX;
      this.popup.classList.add("resizing-right");
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isResizing) {
      this.handleResize(e);
    } else if (this.isDragging) {
      this.handleDrag(e);
    }
  };

  private handleResize(e: MouseEvent) {
    let newWidth: number;

    if (this.resizeDirection === "right") {
      const dx = e.clientX - this.startX;
      newWidth = this.startWidth + dx;
    } else if (this.resizeDirection === "left") {
      const dx = this.startX - e.clientX;
      newWidth = this.startWidth + dx;
    } else {
      return;
    }

    newWidth = Math.min(Math.max(300, newWidth), 1200);
    this.popup.style.width = `${newWidth}px`;

    if (this.resizeDirection === "left") {
      const newLeft = this.startLeft - (newWidth - this.startWidth);
      this.popup.style.left = `${newLeft}px`;
    }

    e.preventDefault();
    e.stopPropagation();
  }

  private handleDrag(e: MouseEvent) {
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.popup.style.left = `${this.initialX + dx}px`;
    this.popup.style.top = `${this.initialY + dy}px`;
    e.preventDefault();
    e.stopPropagation();
  }

  private handleMouseUp = (e: MouseEvent) => {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeDirection = null;
      this.popup.classList.remove("resizing-left", "resizing-right");
      this.savePopupState();
      e.preventDefault();
      e.stopPropagation();
    }
    if (this.isDragging) {
      this.isDragging = false;
      this.savePopupState();
    }
  };

  private setupCopyButtons() {
    // 复制译文按钮
    const copyBtn = this.popup.querySelector(".translator-copy-btn");
    copyBtn?.addEventListener("click", () => {
      const translatedText =
        (this.popup.querySelector(".translator-translated-text") as HTMLElement)
          ?.textContent || "";
      this.copyToClipboard(translatedText, copyBtn as HTMLElement, "复制译文");
    });

    // 复制原文按钮
    const copyOriginalBtn = this.popup.querySelector(
      ".translator-copy-original-btn"
    );
    copyOriginalBtn?.addEventListener("click", () => {
      const originalText =
        (this.popup.querySelector(".translator-text") as HTMLElement)
          ?.textContent || "";
      this.copyToClipboard(
        originalText,
        copyOriginalBtn as HTMLElement,
        "复制"
      );
    });
  }

  private async copyToClipboard(
    text: string,
    button: HTMLElement,
    originalText: string
  ) {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "已复制";
      setTimeout(() => (button.textContent = originalText), 1500);
    } catch (error) {
      console.error("复制失败:", error);
      alert("复制失败，请重试");
    }
  }

  private savePopupState() {
    const left = parseInt(this.popup.style.left);
    const top = parseInt(this.popup.style.top);
    const width = parseInt(this.popup.style.width);

    if (!isNaN(left) && !isNaN(top) && !isNaN(width)) {
      this.onStateChange({ left, top, width });
    }
  }

  public destroy() {
    if (this.cleanup) {
      this.cleanup();
    }
  }
}
