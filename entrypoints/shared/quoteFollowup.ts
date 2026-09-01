/**
 * Side Panel 侧边栏划词追问与引用逻辑
 */

export interface QuoteSnippet {
  /** 选中的引用文字片段 */
  text: string;
  /** 引用来源，例如 "assistant" | "user" 或标题 */
  quoteSource?: string;
  /** 引用的消息唯一 ID */
  messageId?: string;
  /** 引用生成时间戳 */
  createdAt?: number;
}

export interface QuotePromptOptions {
  /** 引用文字最大字符数限制（超长时自动截断并追加省略号），默认 1000 */
  maxChars?: number;
  /** 引用前置标题文案，默认 "引用自历史文字:" */
  quoteHeader?: string;
}

export interface FloatingQuotePositionOptions {
  /** 划选区域的包围矩形 */
  selectionRect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
  /** 宿主容器的包围矩形（如 .chat-content） */
  containerRect?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
  /** 浮动追问按钮自身尺寸，默认 72x28 */
  buttonDimensions?: {
    width: number;
    height: number;
  };
  /** 按钮与选区的间距，默认 6px */
  offset?: number;
  /** 边距安全距离，默认 8px */
  edgePadding?: number;
  /** 容器当前的滚动位置 */
  scrollLeft?: number;
  scrollTop?: number;
}

export interface FloatingQuotePositionResult {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

export const DEFAULT_MAX_QUOTE_CHARS = 1000;
export const DEFAULT_QUOTE_HEADER = "引用自历史文字:";
export const DEFAULT_QUOTE_BUTTON_DIMENSIONS = {
  width: 76,
  height: 28,
};

/**
 * 校验划选文本是否有效
 */
export function isValidQuoteSelection(
  text: string | null | undefined
): boolean {
  if (typeof text !== "string") return false;
  return text.trim().length > 0;
}

/**
 * 超长引用文本截断工具
 */
export function truncateQuoteText(
  text: string,
  maxChars = DEFAULT_MAX_QUOTE_CHARS
): string {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return trimmed.slice(0, maxChars) + "...";
}

/**
 * 将引用文本格式化为 Markdown 引用块
 */
export function formatQuoteBlock(
  quoteText: string,
  quoteHeader = DEFAULT_QUOTE_HEADER
): string {
  const trimmed = quoteText.trim();
  if (!trimmed) return "";

  const quoteLines = trimmed
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  const header = quoteHeader.trim() || DEFAULT_QUOTE_HEADER;
  return `> ${header}\n${quoteLines}`;
}

/**
 * 核心格式化函数：构建包含历史引用与用户指令的完整 Prompt
 *
 * 输出规范：
 * ```text
 * > 引用自历史文字:
 * > {quoteText}
 *
 * {userInstruction}
 * ```
 */
export function buildQuotePrompt(
  quoteText: string,
  userInstruction = "",
  options?: QuotePromptOptions
): string {
  const trimmedQuote = (quoteText || "").trim();
  const trimmedInstruction = (userInstruction || "").trim();

  // 如果没有引用内容，直接返回用户指令
  if (!trimmedQuote) {
    return trimmedInstruction;
  }

  const maxChars = options?.maxChars ?? DEFAULT_MAX_QUOTE_CHARS;
  const quoteHeader = options?.quoteHeader ?? DEFAULT_QUOTE_HEADER;

  const processedQuote =
    trimmedQuote.length > maxChars
      ? trimmedQuote.slice(0, maxChars) + "..."
      : trimmedQuote;

  const quoteBlock = formatQuoteBlock(processedQuote, quoteHeader);

  if (!trimmedInstruction) {
    return quoteBlock;
  }

  return `${quoteBlock}\n\n${trimmedInstruction}`;
}

/**
 * 解析用户消息中是否包含引用块，并拆分出 quoteText 和 userInstruction
 */
export function parseQuotePrompt(
  content: string | null | undefined
): { quoteText: string; userInstruction: string } | null {
  if (!content || typeof content !== "string") return null;

  const trimmed = content.trim();
  const quoteHeaderPattern = /^>\s*引用自历史文字:\s*\n/i;

  if (!quoteHeaderPattern.test(trimmed)) {
    return null;
  }

  const lines = trimmed.split("\n");
  const quoteLineList: string[] = [];
  let index = 1; // 跳过 "> 引用自历史文字:"

  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("> ")) {
      quoteLineList.push(line.slice(2));
      index++;
    } else if (line === ">") {
      quoteLineList.push("");
      index++;
    } else {
      break;
    }
  }

  if (quoteLineList.length === 0) {
    return null;
  }

  // 跳过空行获取后面的用户指令
  while (index < lines.length && lines[index].trim() === "") {
    index++;
  }

  const userInstruction = lines.slice(index).join("\n").trim();
  const quoteText = quoteLineList.join("\n").trim();

  return {
    quoteText,
    userInstruction,
  };
}

/**
 * 计算浮动追问按钮的绝对/相对坐标
 */
export function calculateFloatingQuotePosition(
  options: FloatingQuotePositionOptions
): FloatingQuotePositionResult {
  const {
    selectionRect,
    containerRect,
    buttonDimensions = DEFAULT_QUOTE_BUTTON_DIMENSIONS,
    offset = 6,
    edgePadding = 8,
    scrollLeft = 0,
    scrollTop = 0,
  } = options;

  const btnWidth = buttonDimensions.width;
  const btnHeight = buttonDimensions.height;

  // 如果有容器矩形，计算相对于容器的坐标
  const bounds = containerRect || {
    top: 0,
    bottom: typeof window !== "undefined" ? window.innerHeight : 768,
    left: 0,
    right: typeof window !== "undefined" ? window.innerWidth : 400,
    width: typeof window !== "undefined" ? window.innerWidth : 400,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  };

  const relSelectionLeft = selectionRect.left - bounds.left;
  const relSelectionTop = selectionRect.top - bounds.top;
  const relSelectionRight = selectionRect.right - bounds.left;
  const relSelectionBottom = selectionRect.bottom - bounds.top;

  // 水平位置：默认对齐选区右侧上方（或选区中央）
  let targetLeft =
    relSelectionLeft + (selectionRect.width - btnWidth) / 2 + scrollLeft;

  // 边界约束
  const minLeft = edgePadding;
  const maxLeft = Math.max(edgePadding, bounds.width - btnWidth - edgePadding);
  const clampedLeft = Math.min(Math.max(targetLeft, minLeft), maxLeft);

  // 垂直位置：优先出现在选区上方，若上方空间不足则翻转到选区下方
  const topAbove = relSelectionTop - btnHeight - offset + scrollTop;
  const topBelow = relSelectionBottom + offset + scrollTop;

  let chosenTop: number;
  let placement: "top" | "bottom";

  if (topAbove >= edgePadding + scrollTop) {
    chosenTop = topAbove;
    placement = "top";
  } else if (topBelow + btnHeight <= bounds.height - edgePadding + scrollTop) {
    chosenTop = topBelow;
    placement = "bottom";
  } else {
    // 空间过小时兜底
    if (topAbove >= 0) {
      chosenTop = Math.max(edgePadding, topAbove);
      placement = "top";
    } else {
      chosenTop = Math.max(
        edgePadding,
        Math.min(topBelow, bounds.height - btnHeight - edgePadding + scrollTop)
      );
      placement = "bottom";
    }
  }

  return {
    left: Math.round(clampedLeft),
    top: Math.round(chosenTop),
    placement,
  };
}
