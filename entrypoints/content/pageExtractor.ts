/**
 * 网页正文提取器 (Page Extractor)
 * 智能提取网页标题、URL、核心正文，去除广告、导航、侧边栏等噪声
 */

export interface ExtractedPageContent {
  title: string;
  url: string;
  content: string;
  wordCount: number;
  excerpt: string;
}

/**
 * 移除与正文无关的噪声选择器
 */
const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "canvas",
  "video",
  "audio",
  "nav",
  "footer",
  "header",
  "aside",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  ".ad",
  ".ads",
  ".advertisement",
  ".comment",
  ".comments",
  ".comment-list",
  "#comments",
  ".sidebar",
  "#sidebar",
  ".header",
  ".footer",
  ".nav",
  ".menu",
  ".recommendations",
  ".related-posts",
  ".share-box",
  ".social-share",
  ".toolbar",
  ".pagination",
];

/**
 * 候选主要文章容器选择器
 */
const ARTICLE_SELECTORS = [
  "article",
  "main",
  '[role="main"]',
  ".article-content",
  ".article_content",
  ".post-content",
  ".post_content",
  ".entry-content",
  ".markdown-body",
  ".notion-page-content",
  ".content-main",
  "#article-root",
  "#main-content",
  "#article",
  ".article",
];

/**
 * 智能提取网页标题
 */
export function extractPageTitle(doc: Document = document): string {
  // 1. 尝试 OpenGraph 或 meta title
  const ogTitle = doc
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content")
    ?.trim();
  if (ogTitle) return cleanTitleSuffix(ogTitle);

  const twitterTitle = doc
    .querySelector('meta[name="twitter:title"]')
    ?.getAttribute("content")
    ?.trim();
  if (twitterTitle) return cleanTitleSuffix(twitterTitle);

  // 2. 尝试 H1 标签
  const h1 = doc.querySelector("h1")?.textContent?.trim();
  if (h1 && h1.length >= 2 && h1.length <= 120) {
    return cleanTitleSuffix(h1);
  }

  // 3. 回退到 document.title
  if (doc.title) {
    return cleanTitleSuffix(doc.title.trim());
  }

  return "未知网页";
}

/**
 * 清理网页标题中常见的网站后缀（如 " - 知乎"、" | 掘金"、" _ 哔哩哔哩"）
 */
export function cleanTitleSuffix(title: string): string {
  if (!title) return "";
  return title
    .replace(/\s*[-_–—|]\s*(知乎|掘金|CSDN|简书|微信公众平台|Bilibili|哔哩哔哩|GitHub|Medium|Substack|Reddit|Twitter|X|SegmentFault|少数派|36氪|澎湃新闻|腾讯网|网易网|新浪).*$/i, "")
    .replace(/\s*[-_–—|]\s*[^-–—|_|]{2,20}$/, (match) => {
      // 如果末尾的站点名称特征明显且前部分已有实质内容，则剔除
      return title.indexOf(match) > 10 ? "" : match;
    })
    .trim() || title;
}

/**
 * 计算字数统计（针对中英文混合）
 */
export function countWords(text: string): number {
  if (!text) return 0;
  // 统计 CJK 汉字数
  const cjkMatches = text.match(/[一-龥]/g) || [];
  // 统计英文单词数
  const nonCjkText = text.replace(/[一-龥]/g, " ");
  const wordMatches = nonCjkText.match(/[a-zA-Z0-9_\-]+/g) || [];
  return cjkMatches.length + wordMatches.length;
}

/**
 * 从 DOM 中提取正文内容纯文本
 */
export function extractMainContent(doc: Document = document): string {
  // 查找最有可能是正文的根元素
  let mainContainer: Element | null = null;
  for (const selector of ARTICLE_SELECTORS) {
    const el = doc.querySelector(selector);
    if (el && (el.textContent?.trim().length || 0) > 100) {
      mainContainer = el;
      break;
    }
  }

  if (!mainContainer) {
    mainContainer = doc.body;
  }

  if (!mainContainer) {
    return "";
  }

  // 克隆节点进行过滤清理，避免影响页面原生 DOM
  const clone = mainContainer.cloneNode(true) as HTMLElement;

  // 移除所有噪声节点
  NOISE_SELECTORS.forEach((selector) => {
    try {
      const elements = clone.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    } catch {
      // 忽略非法选择器
    }
  });

  // 提取段落与文本
  const textBlocks: string[] = [];
  const nodesToProcess: Node[] = [clone];

  // 递归处理块级结构
  const extractTextRecursively = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        textBlocks.push(text);
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // 隐藏元素跳过
      if (
        el.style.display === "none" ||
        el.style.visibility === "hidden" ||
        el.getAttribute("aria-hidden") === "true"
      ) {
        return;
      }

      // 标题处理
      if (/^h[1-6]$/.test(tagName)) {
        const headingText = el.textContent?.trim();
        if (headingText) {
          textBlocks.push(`\n## ${headingText}\n`);
        }
        return;
      }

      // 列表项处理
      if (tagName === "li") {
        const liText = el.textContent?.trim();
        if (liText) {
          textBlocks.push(`- ${liText}`);
        }
        return;
      }

      // 段落或块级元素
      if (tagName === "p" || tagName === "blockquote" || tagName === "pre" || tagName === "code") {
        const blockText = el.textContent?.trim();
        if (blockText) {
          textBlocks.push(`\n${blockText}\n`);
        }
        return;
      }

      // 子节点递归
      Array.from(el.childNodes).forEach(extractTextRecursively);
    }
  };

  extractTextRecursively(clone);

  // 合并并规整空白行
  const rawContent = textBlocks.join(" ");
  return rawContent
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * 完整提取当前网页信息
 */
export function extractPageData(doc: Document = document, win: Window = window): ExtractedPageContent {
  const title = extractPageTitle(doc);
  const url = win.location ? win.location.href : "";
  const content = extractMainContent(doc);
  const wordCount = countWords(content);
  const excerpt = content.slice(0, 180).replace(/\s+/g, " ").trim();

  return {
    title,
    url,
    content,
    wordCount,
    excerpt,
  };
}
