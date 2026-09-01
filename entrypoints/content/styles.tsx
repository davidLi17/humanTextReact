import { MARKDOWN_STYLES } from "../../shared/styles/markdown";
import {
  applyTheme,
} from "@/entrypoints/shared/theme";
import type { ThemeMode } from "@/entrypoints/shared/constants";

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
    color-scheme: light;
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
    z-index: 3;
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

  .translator-popup .translator-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: default;
  }

  .translator-popup .translator-sidepanel-btn {
    cursor: pointer;
    padding: 3px 8px;
    color: #4f46e5;
    border-radius: 6px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(79, 70, 229, 0.2);
    background: rgba(79, 70, 229, 0.06);
    font-size: 12px;
    font-weight: 500;
  }

  .translator-popup .translator-sidepanel-btn:hover {
    background: rgba(79, 70, 229, 0.12);
    border-color: rgba(79, 70, 229, 0.4);
    transform: translateY(-1px);
  }

  .translator-popup .translator-vault-btn {
    cursor: pointer;
    padding: 3px 8px;
    color: #d97706;
    border-radius: 6px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(245, 158, 11, 0.25);
    background: rgba(245, 158, 11, 0.08);
    font-size: 12px;
    font-weight: 500;
  }

  .translator-popup .translator-vault-btn:hover {
    background: rgba(245, 158, 11, 0.16);
    border-color: rgba(245, 158, 11, 0.5);
    transform: translateY(-1px);
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
    width: 30px;
    height: 30px;
    border: 0;
    background: transparent;
    font-size: 14px;
  }

  .translator-popup .translator-close-btn:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #333;
  }

  .translator-popup .translator-theme-selector {
    position: relative;
  }

  .translator-popup .translator-theme-trigger {
    width: 30px;
    height: 30px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.03);
    color: #4b5563;
    cursor: pointer;
    font-size: 17px;
  }

  .translator-popup .translator-theme-trigger:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #111827;
  }

  .translator-popup .translator-theme-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 142px;
    padding: 6px;
    border-radius: 8px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(12px);
  }

  .translator-popup .translator-theme-menu[hidden] {
    display: none;
  }

  .translator-popup .translator-theme-menu button {
    width: 100%;
    min-height: 34px;
    padding: 7px 8px;
    display: grid;
    grid-template-columns: 20px 1fr 16px;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #334155;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    text-align: left;
  }

  .translator-popup .translator-theme-menu button:hover {
    background: #f1f5f9;
  }

  .translator-popup .translator-theme-menu button.active {
    color: #4f46e5;
    background: #eef2ff;
    font-weight: 600;
  }

  .translator-popup .translator-theme-check {
    text-align: center;
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

  .translator-popup[data-theme="dark"] {
    color-scheme: dark;
    background: #111827;
    border-color: rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
  }
  .translator-popup[data-theme="dark"] .translator-header {
    background: rgba(17, 24, 39, 0.96);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  .translator-popup[data-theme="dark"] .translator-content {
    background: #111827;
  }
  .translator-popup[data-theme="dark"] .translator-section {
    background: #1f2937;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .translator-popup[data-theme="dark"] .translator-title,
  .translator-popup[data-theme="dark"] .translator-text,
  .translator-popup[data-theme="dark"] .translator-translated-text {
    color: #f3f4f6;
  }
  .translator-popup[data-theme="dark"] .translator-label,
  .translator-popup[data-theme="dark"] .translator-loading {
    color: #94a3b8;
  }
  .translator-popup[data-theme="dark"] .translator-reasoning-text {
    background: linear-gradient(135deg, #0f172a 0%, #172033 100%);
    color: #cbd5e1;
    border-left-color: #64748b;
  }
  .translator-popup[data-theme="dark"] .translator-close-btn,
  .translator-popup[data-theme="dark"] .translator-theme-trigger {
    color: #cbd5e1;
  }
  .translator-popup[data-theme="dark"] .translator-theme-trigger {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }
  .translator-popup[data-theme="dark"] .translator-close-btn:hover,
  .translator-popup[data-theme="dark"] .translator-theme-trigger:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f8fafc;
  }
  .translator-popup[data-theme="dark"] .translator-theme-menu {
    background: rgba(15, 23, 42, 0.98);
    border-color: #334155;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  }
  .translator-popup[data-theme="dark"] .translator-theme-menu button {
    color: #e2e8f0;
  }
  .translator-popup[data-theme="dark"] .translator-theme-menu button:hover {
    background: #1e293b;
  }
  .translator-popup[data-theme="dark"] .translator-theme-menu button.active {
    color: #c7d2fe;
    background: rgba(79, 70, 229, 0.24);
  }
  .translator-popup[data-theme="dark"] .translator-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  .translator-popup[data-theme="dark"] .translator-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.22);
  }
  .translator-popup[data-theme="dark"] .markdown-content,
  .translator-popup[data-theme="dark"] .markdown-paragraph,
  .translator-popup[data-theme="dark"] .markdown-content h1,
  .translator-popup[data-theme="dark"] .markdown-content h2,
  .translator-popup[data-theme="dark"] .markdown-content h3,
  .translator-popup[data-theme="dark"] .markdown-content h4,
  .translator-popup[data-theme="dark"] .markdown-content h5,
  .translator-popup[data-theme="dark"] .markdown-content h6 {
    color: #e5e7eb;
  }
  .translator-popup[data-theme="dark"] .code-block-container {
    background: #0f172a;
    border-color: #334155;
  }
  .translator-popup[data-theme="dark"] .code-block-header {
    background: #1e293b;
    border-bottom-color: #334155;
  }
  .translator-popup[data-theme="dark"] .code-block code {
    color: #e2e8f0;
  }
  .translator-popup[data-theme="dark"] .markdown-table {
    border-color: #334155;
  }
  .translator-popup[data-theme="dark"] .markdown-table th {
    color: #f1f5f9;
    background: #1e293b;
    border-bottom-color: #475569;
  }
  .translator-popup[data-theme="dark"] .markdown-table td {
    border-bottom-color: #334155;
  }
  .translator-popup[data-theme="dark"] .markdown-table tr:nth-child(even) {
    background: rgba(51, 65, 85, 0.35);
  }
  .translator-popup[data-theme="dark"] .markdown-quote {
    color: #fde68a;
    background: rgba(146, 64, 14, 0.28);
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

/**
 * 根据主题在弹窗根元素上设置 data-theme，实现暗色/浅色切换。
 * mode: 'light' | 'dark' | 'system'
 */
export function applyPopupTheme(
  rootEl: HTMLElement,
  mode: ThemeMode,
  systemPrefersDark?: boolean
) {
  return applyTheme(rootEl, mode, systemPrefersDark);
}
