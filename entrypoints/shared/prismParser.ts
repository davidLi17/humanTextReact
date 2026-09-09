import {
  PRISM_TAB_KEYS,
  type PrismParsedResult,
  type PrismTabKey,
} from "./prismTypes";

interface SectionMatch {
  key: "vernacular" | "corporate" | "truth";
  startIndex: number;
  contentStartIndex: number;
}

const SECTION_HEADER_PATTERNS: Array<{
  key: "vernacular" | "corporate" | "truth";
  regex: RegExp;
}> = [
  {
    key: "vernacular",
    regex:
      /(?:^|\n)(?:#{1,4}\s*)?(?:(?:\d+[\.、]\s*)?)(?:🍼|\[🍼\])\s*(?:直白人话[版]?|人话[版]?)[：:]?/i,
  },
  {
    key: "corporate",
    regex:
      /(?:^|\n)(?:#{1,4}\s*)?(?:(?:\d+[\.、]\s*)?)(?:👔|\[👔\])\s*(?:向上汇报[版]?|周报汇报[版]?|汇报[版]?)[：:]?/i,
  },
  {
    key: "truth",
    regex:
      /(?:^|\n)(?:#{1,4}\s*)?(?:(?:\d+[\.、]\s*)?)(?:🔪|\[🔪\])\s*(?:犀利真相[版]?|潜台词真相[版]?|真相[版]?)[：:]?/i,
  },
];

/**
 * 解析翻译文本，支持流式增长与终态文本的三棱镜结构化提取
 */
export function parsePrismTranslation(rawText: string = ""): PrismParsedResult {
  const text = rawText || "";
  if (!text.trim()) {
    return {
      isPrism: false,
      vernacular: "",
      corporate: "",
      truth: "",
      raw: text,
    };
  }

  // 寻找各个 section header 的出现位置
  const matches: SectionMatch[] = [];
  for (const { key, regex } of SECTION_HEADER_PATTERNS) {
    const match = regex.exec(text);
    if (match) {
      matches.push({
        key,
        startIndex: match.index,
        contentStartIndex: match.index + match[0].length,
      });
    }
  }

  // 如果没有任何一个三棱镜标记，则降级为常规非三棱镜输出
  if (matches.length === 0) {
    return {
      isPrism: false,
      vernacular: text,
      corporate: "",
      truth: "",
      raw: text,
    };
  }

  // 按出现先后顺序排序
  matches.sort((a, b) => a.startIndex - b.startIndex);

  const sections: Record<"vernacular" | "corporate" | "truth", string> = {
    vernacular: "",
    corporate: "",
    truth: "",
  };

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const end = next ? next.startIndex : text.length;
    const content = text.slice(current.contentStartIndex, end).trim();
    sections[current.key] = content;
  }

  const lastMatch = matches[matches.length - 1];

  return {
    isPrism: true,
    vernacular: sections.vernacular,
    corporate: sections.corporate,
    truth: sections.truth,
    raw: text,
    activeStreamKey: lastMatch ? lastMatch.key : undefined,
  };
}

/**
 * 根据所选 Tab 提取渲染内容
 */
export function getPrismContentByTab(
  parsed: PrismParsedResult,
  tab: PrismTabKey
): string {
  if (!parsed.isPrism) {
    return parsed.raw;
  }

  switch (tab) {
    case PRISM_TAB_KEYS.VERNACULAR:
      return parsed.vernacular;
    case PRISM_TAB_KEYS.CORPORATE:
      return parsed.corporate;
    case PRISM_TAB_KEYS.TRUTH:
      return parsed.truth;
    case PRISM_TAB_KEYS.RAW:
    default:
      return parsed.raw;
  }
}

/**
 * 获取用于复制的纯文本或 Markdown 文本
 */
export function getPrismCopyText(
  parsed: PrismParsedResult,
  tab: PrismTabKey
): string {
  const content = getPrismContentByTab(parsed, tab);
  return content.trim() || parsed.raw.trim();
}
