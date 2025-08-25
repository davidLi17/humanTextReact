/**
 * 共享 Markdown 样式
 * 可用于 popup 和 content 等多个模块
 */

export const MARKDOWN_STYLES = /*css*/ `
  /* Markdown 基础样式 */
  .markdown-content {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
  }

  .markdown-paragraph {
    margin: 0.8em 0;
    color: #1a1a1a;
  }

  .markdown-paragraph:first-child {
    margin-top: 0;
  }

  .markdown-paragraph:last-child {
    margin-bottom: 0;
  }

  /* 标题样式 */
  .markdown-content h1,
  .markdown-content h2,
  .markdown-content h3,
  .markdown-content h4,
  .markdown-content h5,
  .markdown-content h6 {
    margin: 1.2em 0 0.6em 0;
    font-weight: 600;
    line-height: 1.3;
    color: #1a1a1a;
  }

  .markdown-content h1 {
    font-size: 1.5em;
  }
  .markdown-content h2 {
    font-size: 1.3em;
  }
  .markdown-content h3 {
    font-size: 1.2em;
  }
  .markdown-content h4 {
    font-size: 1.1em;
  }
  .markdown-content h5 {
    font-size: 1em;
  }
  .markdown-content h6 {
    font-size: 0.95em;
  }

  /* 代码块样式 */
  .code-block {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin: 1em 0;
    overflow: hidden;
  }

  .code-block code {
    display: block;
    padding: 16px;
    overflow-x: auto;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #2d3748;
    background: transparent;
  }

  .inline-code {
    background: rgba(107, 114, 126, 0.1);
    color: #d63384;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-weight: 500;
  }

  /* 列表样式 */
  .markdown-list {
    margin: 1em 0;
    padding-left: 0;
  }

  .list-item {
    margin: 0.4em 0;
    padding-left: 1.5em;
    position: relative;
  }

  ul.markdown-list .list-item::before {
    content: "•";
    position: absolute;
    left: 0.5em;
    color: #64748b;
    font-weight: bold;
  }

  ol.markdown-list {
    counter-reset: list-counter;
  }

  ol.markdown-list .list-item {
    counter-increment: list-counter;
  }

  ol.markdown-list .list-item::before {
    content: counter(list-counter) ".";
    position: absolute;
    left: 0;
    color: #64748b;
    font-weight: 600;
    min-width: 1.2em;
  }

  .list-item.level-1 {
    padding-left: 2.5em;
  }
  .list-item.level-2 {
    padding-left: 3.5em;
  }
  .list-item.level-3 {
    padding-left: 4.5em;
  }

  /* 引用样式 */
  .markdown-quote {
    margin: 1em 0;
    padding: 12px 16px;
    background: linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%);
    border-left: 4px solid #f59e0b;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #92400e;
  }

  /* 表格样式 */
  .markdown-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .markdown-table th {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #1a1a1a;
    border-bottom: 2px solid #e2e8f0;
  }

  .markdown-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
  }

  .markdown-table tr:last-child td {
    border-bottom: none;
  }

  .markdown-table tr:nth-child(even) {
    background: rgba(248, 250, 252, 0.5);
  }

  /* 链接样式 */
  .markdown-link {
    color: #3b82f6;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .markdown-link:hover {
    color: #1d4ed8;
    border-bottom-color: #3b82f6;
  }

  /* 图片样式 */
  .markdown-image {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* 文本样式 */
  .bold {
    font-weight: 600;
    color: #1a1a1a;
  }

  .italic {
    font-style: italic;
  }

  .strikethrough {
    text-decoration: line-through;
    color: #6b7280;
  }

  .highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    padding: 2px 4px;
    border-radius: 4px;
    color: #92400e;
  }

  /* 分割线样式 */
  .markdown-divider {
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 2em 0;
    opacity: 0.8;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #e2e8f0 50%,
      transparent 100%
    );
    height: 1px;
  }

  /* 暗黑模式支持 */
  @media (prefers-color-scheme: dark) {
    .markdown-content {
      color: #e5e5e5;
    }

    .markdown-paragraph,
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      color: #e5e5e5;
    }

    .code-block {
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
      border-color: #444;
    }

    .code-block code {
      color: #e5e5e5;
    }

    .inline-code {
      background: rgba(255, 255, 255, 0.1);
      color: #ff6b9d;
    }

    .markdown-quote {
      background: linear-gradient(135deg, #2d1b0a 0%, #3d2a0f 100%);
      color: #d97706;
    }

    .markdown-table th {
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
      color: #e5e5e5;
      border-bottom-color: #444;
    }

    .markdown-table {
      border-color: #444;
    }

    .markdown-table td {
      border-bottom-color: #333;
    }

    .markdown-table tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.05);
    }

    .bold {
      color: #e5e5e5;
    }
  }
`;

/**
 * 注入 Markdown 样式到文档
 */
export function injectMarkdownStyles(containerId: string = "markdown-styles") {
  if (!document.querySelector(`#${containerId}`)) {
    const style = document.createElement("style");
    style.id = containerId;
    style.textContent = MARKDOWN_STYLES;
    document.head.appendChild(style);
  }
}
