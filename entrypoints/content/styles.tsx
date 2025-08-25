import { MARKDOWN_STYLES } from "../../shared/styles/markdown";

export const POPUP_STYLES = /*css*/ `
  .translator-popup {
    position: fixed;
    z-index: 10000;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    max-width: none;
    min-width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    max-height: 85vh;
    cursor: default;
    width: 420px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(8px);
  }

  .translator-popup::after {
    content: "";
    position: absolute;
    top: 0; 
    right: 0;
    width: 15px;
    height: 100%;
    cursor: e-resize;
    z-index: 2;
  }

  .translator-popup::before {
    content: "";
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
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.95);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 12px 12px 0 0;
    cursor: grab;
    user-select: none;
    backdrop-filter: blur(8px);
  }

  .translator-popup .translator-header:active {
    cursor: grabbing;
  }

  .translator-popup .translator-title {
    font-weight: 600;
    color: #1a1a1a;
    font-size: 15px;
  }

  .translator-popup .translator-close-btn {
    cursor: pointer;
    padding: 6px;
    color: #666;
    border-radius: 6px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .translator-popup .translator-close-btn:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #333;
  }

  .translator-popup .translator-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    scroll-behavior: smooth;
    max-height: calc(85vh - 120px);
    cursor: auto;
    line-height: 1.6;
  }

  .translator-popup .translator-section {
    margin-bottom: 16px;
    padding: 16px;
    border-radius: 8px;
    background: #fff;
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .translator-popup .translator-section:last-child {
    margin-bottom: 0;
    padding-bottom: 40px;
  }

  .translator-popup .translator-copy-original-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(52, 199, 89, 0.1);
    color: #34c759;
    border: 1px solid rgba(52, 199, 89, 0.3);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    opacity: 0.8;
    transition: all 0.2s ease;
  }

  .translator-popup .translator-copy-original-btn:hover {
    opacity: 1;
    background: rgba(52, 199, 89, 0.15);
    transform: translateY(-1px);
  }

  .translator-popup .translator-label {
    font-size: 13px;
    color: #666;
    margin-bottom: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .translator-popup .translator-text {
    color: #1a1a1a;
    line-height: 1.6;
    overflow-wrap: break-word;
    font-size: 14px;
  }

  .translator-popup .translator-reasoning-text {
    color: #4a5568;
    line-height: 1.6;
    overflow-wrap: break-word;
    font-size: 13px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid #64748b;
    margin: 12px 0;
  }

  .translator-popup .translator-translated-text {
    color: #1a1a1a;
    line-height: 1.6;
    overflow-wrap: break-word;
    font-weight: 500;
    font-size: 14px;
  }

  .translator-popup .translator-loading {
    display: inline-block;
    margin-left: 8px;
    color: #64748b;
    font-size: 13px;
  }

  .translator-popup .translator-copy-btn {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    width: 100%;
    cursor: pointer;
    border-radius: 0 0 12px 12px;
    margin-top: auto;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .translator-popup .translator-copy-btn:hover {
    background: linear-gradient(135deg, #30b454 0%, #2bc653 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3);
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
    width: 6px;
  }

  .translator-popup .translator-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
  }

  .translator-popup .translator-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    transition: background 0.2s ease;
  }

  .translator-popup .translator-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  /* 集成共享 Markdown 样式，添加 .translator-popup 前缀 */
  ${MARKDOWN_STYLES.replace(/(\.[a-zA-Z])/g, ".translator-popup $1")}

  /* 暗黑模式支持 */
  @media (prefers-color-scheme: dark) {
    .translator-popup {
      background: #1a1a1a;
      border-color: rgba(255, 255, 255, 0.1);
      color: #e5e5e5;
    }

    .translator-popup .translator-header {
      background: rgba(26, 26, 26, 0.95);
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }

    .translator-popup .translator-title {
      color: #e5e5e5;
    }

    .translator-popup .translator-text,
    .translator-popup .translator-translated-text {
      color: #e5e5e5;
    }

    .translator-popup .translator-reasoning-text {
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
      color: #b0b0b0;
      border-left-color: #666;
    }
  }

  /* 响应式设计 */
  @media (max-width: 480px) {
    .translator-popup {
      width: calc(100vw - 40px);
      max-width: none;
      left: 20px !important;
      right: 20px !important;
    }
  }
`;

export function injectStyles() {
  if (!document.querySelector("#translator-popup-style")) {
    const style = document.createElement("style");
    style.id = "translator-popup-style";
    style.textContent = POPUP_STYLES;
    document.head.appendChild(style);
  }
}
