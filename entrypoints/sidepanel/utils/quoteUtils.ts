/**
 * 侧边栏划词追问与引用工具函数
 */

export interface RectLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface CalculateQuotePositionOptions {
  selectionRect: RectLike;
  containerRect: RectLike;
  barDimensions?: { width: number; height: number };
  offset?: number;
  edgePadding?: number;
}

export interface QuotePositionResult {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

export const DEFAULT_QUOTE_BAR_DIMENSIONS = {
  width: 78,
  height: 30,
};

export const DEFAULT_QUOTE_OFFSET = 8;
export const DEFAULT_QUOTE_EDGE_PADDING = 8;

/**
 * 格式化选中文本为 Markdown 引用块
 */
export function formatQuoteMarkdown(selectedText: string): string {
  const trimmed = (selectedText || "").trim();
  if (!trimmed) return "";

  const lines = trimmed.split(/\r?\n/);
  const quotedLines = lines.map((line) => `> ${line}`).join("\n");
  return `> 引用自历史文字:\n${quotedLines}\n\n`;
}

/**
 * 提取精简引用预览文本
 */
export function extractQuotePreview(text: string, maxLen = 45): string {
  if (!text) return "";
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLen) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLen)}...`;
}

/**
 * 从当前输入框内容中剥离特定的 Markdown 引用块
 */
export function removeQuoteFromInputText(
  inputText: string,
  quotedText?: string
): string {
  if (!inputText) return "";

  // 1. 优先尝试精确移除标准引用块
  if (quotedText) {
    const formatted = formatQuoteMarkdown(quotedText);
    if (inputText.startsWith(formatted)) {
      return inputText.slice(formatted.length);
    }
  }

  // 2. 匹配通用的 "> 引用自历史文字:\n(> ...\n)*\n*" 模式
  const genericQuotePattern = /^>\s*引用自历史文字:[\r\n]+(>[^\r\n]*[\r\n]+)+[\r\n]*/;
  if (genericQuotePattern.test(inputText)) {
    return inputText.replace(genericQuotePattern, "");
  }

  return inputText;
}

/**
 * 判断目标节点是否属于允许划词追问的区域（消息卡片正文等）
 */
export function isNodeInMessageBubble(node: Node | null): boolean {
  if (!node) return false;

  let current: Node | null =
    node.nodeType === 3 ? node.parentElement : (node as HTMLElement);

  const bodyEl = typeof document !== "undefined" ? document.body : null;

  while (current && current !== bodyEl) {
    const el = current as HTMLElement;
    const className = typeof el.className === "string" ? el.className : "";

    // 排除可编辑输入框与控件
    const tagName = (el.tagName || "").toUpperCase();
    if (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      tagName === "BUTTON" ||
      el.isContentEditable ||
      el.getAttribute?.("contenteditable") === "true"
    ) {
      return false;
    }

    // 排除底部输入区域、操作栏、代码复制按钮、追问操作条自身
    if (
      className.includes("chat-input-footer") ||
      className.includes("bubble-footer") ||
      className.includes("user-bubble-actions") ||
      className.includes("inline-edit-footer") ||
      className.includes("code-copy-btn") ||
      className.includes("suggested-pill-btn") ||
      className.includes("sidepanel-quote-action-bar")
    ) {
      return false;
    }

    // 匹配消息气泡或 Markdown 正文内容
    if (
      className.includes("bubble-card") ||
      className.includes("markdown-content") ||
      className.includes("user-text") ||
      className.includes("webpage-user-card") ||
      className.includes("bubble-content-wrapper")
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

/**
 * 校验 Selection 是否为有效的消息划选
 */
export function isValidMessageSelection(
  selection: Selection | null,
  containerEl?: HTMLElement | null
): boolean {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const text = selection.toString().trim();
  if (!text) return false;

  const range = selection.getRangeAt(0);
  if (!range) return false;

  // 必须在传入的 container 内部
  if (containerEl) {
    if (
      !containerEl.contains(range.startContainer) ||
      !containerEl.contains(range.endContainer)
    ) {
      return false;
    }
  }

  // 必须在消息内容区域内，且不在排除区域内
  return (
    isNodeInMessageBubble(range.startContainer) &&
    isNodeInMessageBubble(range.endContainer)
  );
}

/**
 * 计算浮动追问胶囊按钮相对于容器的位置
 */
export function calculateQuotePosition(
  options: CalculateQuotePositionOptions
): QuotePositionResult {
  const {
    selectionRect,
    containerRect,
    barDimensions = DEFAULT_QUOTE_BAR_DIMENSIONS,
    offset = DEFAULT_QUOTE_OFFSET,
    edgePadding = DEFAULT_QUOTE_EDGE_PADDING,
  } = options;

  // 选区中心水平坐标（相对容器）
  const selectionCenterRelX =
    selectionRect.left + selectionRect.width / 2 - containerRect.left;

  // 理想左坐标：水平居中于选区
  let left = selectionCenterRelX - barDimensions.width / 2;

  // 容器边界保护（水平方向）
  const minLeft = edgePadding;
  const maxLeft = containerRect.width - barDimensions.width - edgePadding;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  // 选区在容器内的相对垂直位置
  const selectionTopRelY = selectionRect.top - containerRect.top;
  const selectionBottomRelY = selectionRect.bottom - containerRect.top;

  // 优先放置在选区上方
  const topPlacementTop = selectionTopRelY - barDimensions.height - offset;
  // 备选放置在选区下方
  const bottomPlacementTop = selectionBottomRelY + offset;

  let top = topPlacementTop;
  let placement: "top" | "bottom" = "top";

  // 如果上方超出容器顶部安全区域，则置于选区下方
  if (top < edgePadding) {
    top = bottomPlacementTop;
    placement = "bottom";

    // 如果下方也超出容器底部，则夹持在容器内部
    const maxTop = containerRect.height - barDimensions.height - edgePadding;
    if (top > maxTop) {
      top = Math.max(edgePadding, maxTop);
    }
  }

  return {
    left: Math.round(left),
    top: Math.round(top),
    placement,
  };
}
