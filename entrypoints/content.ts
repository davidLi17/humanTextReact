export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("人话翻译器 content script 启动");

    // 消息类型配置
    const MESSAGE_TYPES = {
      TRANSLATE: "translate",
      CLEANUP: "cleanup",
      GET_HISTORY: "getHistory",
      CLEAR_HISTORY: "clearHistory",
      DELETE_HISTORY_ITEM: "deleteHistoryItem",
      IMPORT_HISTORY: "importHistory",
      UPDATE_TRANSLATION: "updateTranslation",
      SHOW_TRANSLATION_POPUP: "showTranslationPopup",
    };

    // 添加弹窗样式
    if (!document.querySelector("#translator-popup-style")) {
      const style = document.createElement("style");
      style.id = "translator-popup-style";
      style.textContent = `
        .translator-popup {
          position: fixed;
          z-index: 10000;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          max-width: none;
          min-width: 300px;
          font-family: system-ui, -apple-system, sans-serif;
          max-height: 80vh;
          cursor: default;
          width: 400px;
          overflow: hidden;
        }

        .translator-popup::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 15px;
          height: 100%;
          cursor: e-resize;
          z-index: 2;
        }
        
        .translator-popup::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 15px;
          height: 100%;
          cursor: w-resize;
          z-index: 2;
        }

        .translator-popup .translator-header {
          position: sticky;
          top: 0;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #eee;
          border-radius: 8px 8px 0 0;
          cursor: grab;
          user-select: none;
        }

        .translator-popup .translator-header:active {
          cursor: grabbing;
        }

        .translator-popup .translator-title {
          font-weight: bold;
          color: #333;
        }

        .translator-popup .translator-close-btn {
          cursor: pointer;
          padding: 4px;
          color: #666;
        }

        .translator-popup .translator-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          scroll-behavior: smooth;
          max-height: calc(80vh - 100px);
          cursor: auto;
        }

        .translator-popup .translator-section {
          margin-bottom: 12px;
          padding: 12px;
          border-radius: 6px;
          background: #fff;
        }

        .translator-popup .translator-section:last-child {
          margin-bottom: 0;
          padding-bottom: 40px;
        }

        .translator-popup .translator-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .translator-popup .translator-text {
          color: #333;
          line-height: 1.5;
          overflow-wrap: break-word;
        }

        .translator-popup .translator-reasoning-text {
          color: #666;
          line-height: 1.5;
          overflow-wrap: break-word;
          font-size: 0.95em;
          background: #f8f9fa;
          padding: 12px;
          border-radius: 4px;
          border-left: 3px solid #6c757d;
        }

        .translator-popup .translator-translated-text {
          color: #333;
          line-height: 1.5;
          overflow-wrap: break-word;
          font-weight: 500;
        }

        .translator-popup .translator-text p,
        .translator-popup .translator-reasoning-text p,
        .translator-popup .translator-translated-text p {
          margin: 0.5em 0;
        }

        .translator-popup .translator-text code,
        .translator-popup .translator-reasoning-text code,
        .translator-popup .translator-translated-text code {
          background: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .translator-popup .translator-text pre,
        .translator-popup .translator-reasoning-text pre,
        .translator-popup .translator-translated-text pre {
          background: #f5f5f5;
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
        }

        .translator-popup .translator-text blockquote,
        .translator-popup .translator-reasoning-text blockquote,
        .translator-popup .translator-translated-text blockquote {
          margin: 0.5em 0;
          padding-left: 1em;
          border-left: 4px solid #ddd;
          color: #666;
        }

        .translator-popup .translator-loading {
          display: inline-block;
          margin-left: 8px;
          color: #666;
        }

        .translator-popup .translator-copy-btn {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          background: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          width: 100%;
          cursor: pointer;
          border-radius: 0 0 8px 8px;
          margin-top: auto;
        }

        .translator-popup .translator-copy-btn:hover {
          background: #45a049;
        }

        .translator-popup.resizing-left {
          cursor: w-resize;
          user-select: none;
        }

        .translator-popup.resizing-right {
          cursor: e-resize;
          user-select: none;
        }

        .translator-popup .translator-content::-webkit-scrollbar {
          width: 8px;
        }

        .translator-popup .translator-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .translator-popup .translator-content::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        .translator-popup .translator-content::-webkit-scrollbar-thumb:hover {
          background: #666;
        }

        .markdown-divider {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 1.5em 0;
          opacity: 0.7;
        }
      `;
      document.head.appendChild(style);
    }

    // 简单的Markdown解析器
    const parseMarkdown = (text: string): string => {
      if (!text) return "";

      let html = text;

      // 转义HTML标签
      html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // 代码块 (```)
      html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

      // 行内代码 (`)
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

      // 粗体 (**)
      html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      // 斜体 (*)
      html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

      // 标题
      html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>");
      html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>");
      html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>");

      // 引用 (>)
      html = html.replace(/^> (.*$)/gm, "<blockquote>$1</blockquote>");

      // 无序列表 (-)
      html = html.replace(/^- (.*$)/gm, "<li>$1</li>");
      html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

      // 换行
      html = html.replace(/\n/g, "<br>");

      // 段落处理
      html = html.replace(/(<br>\s*){2,}/g, "</p><p>");
      html = "<p>" + html + "</p>";

      // 清理空段落
      html = html.replace(/<p><\/p>/g, "");
      html = html.replace(/<p><br><\/p>/g, "");

      return html;
    };

    // 全局变量存储弹窗上次的位置和宽度
    let lastPopupState = {
      left: null as number | null,
      top: null as number | null,
      width: null as number | null,
    };

    // 消息监听器
    browser.runtime.onMessage.addListener(
      (request: any, sender: any, sendResponse: any) => {
        console.log("Content script收到消息:", request.action);

        try {
          if (request.action === MESSAGE_TYPES.SHOW_TRANSLATION_POPUP) {
            const oldPopup = document.querySelector(".translator-popup");
            if (oldPopup) {
              console.log("发现旧的翻译弹窗，先移除");
              browser.runtime.sendMessage(
                { action: MESSAGE_TYPES.CLEANUP },
                () => {
                  oldPopup.remove();
                  console.log("显示新弹窗");
                  showPopup(request.text);
                  browser.runtime.sendMessage({
                    action: MESSAGE_TYPES.TRANSLATE,
                    text: request.text,
                  });
                }
              );
            } else {
              console.log("显示弹窗");
              showPopup(request.text);
              browser.runtime.sendMessage({
                action: MESSAGE_TYPES.TRANSLATE,
                text: request.text,
              });
            }
            sendResponse({ success: true });
            return true;
          }

          if (request.action === MESSAGE_TYPES.UPDATE_TRANSLATION) {
            const popup = document.querySelector(
              ".translator-popup"
            ) as HTMLElement;
            if (!popup) {
              console.log("翻译弹窗不存在，可能已关闭");
              sendResponse({ success: true });
              return true;
            }

            const translatedTextEl = popup.querySelector(
              ".translator-translated-text"
            ) as HTMLElement;
            const reasoningSectionEl = popup.querySelector(
              ".translator-section-reasoning"
            ) as HTMLElement;
            const reasoningTextEl = popup.querySelector(
              ".translator-reasoning-text"
            ) as HTMLElement;
            const loadingEl = popup.querySelector(
              ".translator-loading"
            ) as HTMLElement;
            const contentEl = popup.querySelector(
              ".translator-content"
            ) as HTMLElement;

            if (translatedTextEl && reasoningTextEl && loadingEl) {
              if (request.error) {
                console.log("翻译发生错误:", request.error);
                if (
                  request.error.includes("API Key") ||
                  request.error.includes("API 请求失败") ||
                  request.error.includes("rate limit")
                ) {
                  loadingEl.textContent = "翻译失败：" + request.error;
                } else {
                  loadingEl.textContent = "翻译失败，请重试";
                }
              } else {
                console.log("更新翻译结果");
                translatedTextEl.innerHTML = parseMarkdown(request.content);

                if (reasoningSectionEl) {
                  reasoningSectionEl.style.display = request.hasReasoning
                    ? "block"
                    : "none";
                  if (request.hasReasoning && request.reasoningContent) {
                    reasoningTextEl.innerHTML = parseMarkdown(
                      request.reasoningContent
                    );
                  }
                }

                if (request.done) {
                  console.log("翻译完成");
                  loadingEl.style.display = "none";
                }

                // 判断是否用户已手动滚动
                if (
                  !(popup as any).userHasScrolled ||
                  !(popup as any).userHasScrolled()
                ) {
                  if (contentEl) {
                    contentEl.scrollTop = contentEl.scrollHeight;
                  }
                }
              }
            }

            sendResponse({ success: true });
            return true;
          }

          if (request.action === "getSelectedText") {
            const selectedText = window.getSelection()?.toString().trim();
            if (selectedText) {
              browser.runtime.sendMessage({
                action: MESSAGE_TYPES.SHOW_TRANSLATION_POPUP,
                text: selectedText,
              });
            }
            sendResponse({ success: true });
            return true;
          }
        } catch (error: any) {
          console.error("处理消息错误:", error);
          sendResponse({ success: false, error: error.message });
          return true;
        }

        sendResponse({ success: false, error: "未知操作" });
        return true;
      }
    );

    // 显示弹窗函数
    function showPopup(selection: string) {
      // 清理可能存在的旧弹窗
      const oldPopup = document.querySelector(".translator-popup");
      if (oldPopup) oldPopup.remove();

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

      document.body.appendChild(popup);

      // 设置弹窗位置
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = viewportWidth - 420;
      let top = 20;
      let width = 400;

      if (lastPopupState.left !== null && lastPopupState.top !== null) {
        left = Math.min(Math.max(0, lastPopupState.left), viewportWidth - 300);
        top = Math.min(Math.max(0, lastPopupState.top), viewportHeight - 100);
      }

      if (lastPopupState.width !== null) {
        width = Math.min(Math.max(300, lastPopupState.width), 1200);
      }

      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      popup.style.width = `${width}px`;

      // 初始化事件
      const eventCleanupFunctions = initializePopupEvents(popup);

      // 添加滚动检测
      const contentEl = popup.querySelector(
        ".translator-content"
      ) as HTMLElement;
      let userHasScrolled = false;

      contentEl.addEventListener("scroll", () => {
        const isAtBottom =
          contentEl.scrollHeight - contentEl.scrollTop <=
          contentEl.clientHeight + 1;
        if (!isAtBottom) {
          userHasScrolled = true;
        } else {
          userHasScrolled = false;
        }
      });

      (popup as any).userHasScrolled = () => userHasScrolled;

      // 关闭按钮事件
      popup
        .querySelector(".translator-close-btn")!
        .addEventListener("click", () => {
          savePopupState(popup);
          browser.runtime.sendMessage({ action: MESSAGE_TYPES.CLEANUP });
          if (eventCleanupFunctions) {
            eventCleanupFunctions();
          }
          popup.remove();
        });

      return popup;
    }

    // 保存弹窗状态
    function savePopupState(popup: HTMLElement) {
      if (popup) {
        const left = parseInt(popup.style.left);
        const top = parseInt(popup.style.top);
        const width = parseInt(popup.style.width);

        if (!isNaN(left) && !isNaN(top) && !isNaN(width)) {
          lastPopupState = { left, top, width };
          console.log("保存弹窗状态:", lastPopupState);
        }
      }
    }

    // 初始化弹窗事件
    function initializePopupEvents(popup: HTMLElement) {
      let isDragging = false;
      let isResizing = false;
      let resizeDirection: string | null = null;
      let startX: number, startY: number, startWidth: number;
      let initialX: number, initialY: number, startLeft: number;

      const header = popup.querySelector(".translator-header") as HTMLElement;

      header.addEventListener(
        "mousedown",
        (e) => {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          initialX = popup.offsetLeft;
          initialY = popup.offsetTop;
          e.preventDefault();
          e.stopPropagation();
        },
        true
      );

      popup.addEventListener(
        "mousedown",
        (e) => {
          if ((e.target as HTMLElement).closest(".translator-header")) {
            return;
          }

          const rect = popup.getBoundingClientRect();
          const leftEdgeDistance = e.clientX - rect.left;
          const rightEdgeDistance = rect.right - e.clientX;

          if (leftEdgeDistance <= 15) {
            isResizing = true;
            resizeDirection = "left";
            startWidth = popup.offsetWidth;
            startX = e.clientX;
            startLeft = popup.offsetLeft;
            popup.classList.add("resizing-left");
            e.preventDefault();
            e.stopPropagation();
          } else if (rightEdgeDistance <= 15) {
            isResizing = true;
            resizeDirection = "right";
            startWidth = popup.offsetWidth;
            startX = e.clientX;
            popup.classList.add("resizing-right");
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true
      );

      const mouseMoveHandler = (e: MouseEvent) => {
        if (isResizing) {
          let newWidth: number;

          if (resizeDirection === "right") {
            const dx = e.clientX - startX;
            newWidth = startWidth + dx;
          } else if (resizeDirection === "left") {
            const dx = startX - e.clientX;
            newWidth = startWidth + dx;
          } else {
            return;
          }

          if (newWidth < 300) {
            newWidth = 300;
          } else if (newWidth > 1200) {
            newWidth = 1200;
          }

          popup.style.width = `${newWidth}px`;

          if (resizeDirection === "left") {
            const newLeft = startLeft - (newWidth - startWidth);
            popup.style.left = `${newLeft}px`;
          }

          e.preventDefault();
          e.stopPropagation();
        } else if (isDragging) {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          popup.style.left = `${initialX + dx}px`;
          popup.style.top = `${initialY + dy}px`;
          e.preventDefault();
          e.stopPropagation();
        }
      };

      const mouseUpHandler = (e: MouseEvent) => {
        if (isResizing) {
          isResizing = false;
          resizeDirection = null;
          popup.classList.remove("resizing-left");
          popup.classList.remove("resizing-right");
          savePopupState(popup);
          e.preventDefault();
          e.stopPropagation();
        }
        if (isDragging) {
          isDragging = false;
          savePopupState(popup);
        }
      };

      document.addEventListener("mousemove", mouseMoveHandler, true);
      document.addEventListener("mouseup", mouseUpHandler, true);

      // 复制按钮事件
      popup
        .querySelector(".translator-copy-btn")!
        .addEventListener("click", () => {
          const translatedText =
            (popup.querySelector(".translator-translated-text") as HTMLElement)
              .textContent || "";
          navigator.clipboard
            .writeText(translatedText)
            .then(() => {
              const copyBtn = popup.querySelector(
                ".translator-copy-btn"
              ) as HTMLElement;
              copyBtn.textContent = "已复制";
              setTimeout(() => (copyBtn.textContent = "复制译文"), 1500);
            })
            .catch((error) => {
              console.error("复制失败:", error);
              alert("复制失败，请重试");
            });
        });

      return function cleanup() {
        document.removeEventListener("mousemove", mouseMoveHandler, true);
        document.removeEventListener("mouseup", mouseUpHandler, true);
      };
    }
  },
});
