export const POPUP_STYLES = `
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
    position: relative;
  }

  .translator-popup .translator-section:last-child {
    margin-bottom: 0;
    padding-bottom: 40px;
  }

  .translator-popup .translator-copy-original-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(76, 175, 80, 0.1);
    color: #4CAF50;
    border: 1px solid #4CAF50;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    opacity: 0.8;
    transition: all 0.2s ease;
  }

  .translator-popup .translator-copy-original-btn:hover {
    opacity: 1;
    background: rgba(76, 175, 80, 0.2);
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

export function injectStyles() {
  if (!document.querySelector("#translator-popup-style")) {
    const style = document.createElement("style");
    style.id = "translator-popup-style";
    style.textContent = POPUP_STYLES;
    document.head.appendChild(style);
  }
}
