/**
 * 网页正文提取器 (Page Extractor)
 * 智能提取网页标题、URL、核心正文，去除广告、导航、侧边栏等噪声
 * 深度支持：
 * 1. 开放 Shadow DOM (Web Components) 原位穿透与 Slot 组合树分发
 * 2. CSS 隔离环境下的真实计算样式可见性判定
 * 3. 虚拟滚动 (Virtual List) 与懒加载启发式健康检测及无损增量采集合并
 */

export interface ExtractedPageContent {
  title: string;
  url: string;
  content: string;
  wordCount: number;
  excerpt: string;
  isLikelyVirtualList?: boolean;
  totalEstimatedScreens?: number;
  scrollDensity?: number;
  hasMoreContent?: boolean;
}

/**
 * 噪声标签白名单集合 (O(1) 快速短路，跳过脚本、多媒体与纯框架骨架)
 */
const NOISE_TAGS = new Set([
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
]);

/**
 * 移除与正文无关的噪声选择器
 */
const NOISE_SELECTORS = [
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

const NOISE_SELECTOR_QUERY = NOISE_SELECTORS.join(", ");

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
 * 虚拟列表/长文编辑器常见特征标记
 */
const VIRTUAL_LIST_MARKERS = [
  "[data-virtual-list]",
  "[data-virtualized]",
  "[data-windowing]",
  '[data-testid="cellInnerDiv"]', // Twitter / X
  ".suite-editor", // 飞书云文档
  ".doc-scroll-container", // 飞书滚动容器
  ".lake-content", // 语雀阅读区
  ".ne-viewer-body", // 语雀引擎
  ".notion-page-content", // Notion
];

const MAX_TRAVERSAL_DEPTH = 64;
const MAX_EXTRACTED_CHARS = 100_000;

/**
 * 判断元素是否为不可见的干扰元素（结合属性与真实计算样式）
 */
function isElementVisible(el: HTMLElement, win: Window | null): boolean {
  if (
    el.hidden ||
    el.getAttribute("aria-hidden") === "true" ||
    el.style.display === "none" ||
    el.style.visibility === "hidden"
  ) {
    return false;
  }

  try {
    if (win && typeof win.getComputedStyle === "function") {
      const style = win.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse"
      ) {
        return false;
      }
    }
  } catch {
    // 忽略样式计算异常，保持防御性通过
  }

  return true;
}

/**
 * 判断元素是否匹配噪声节点规则
 */
function isNoiseElement(el: Element): boolean {
  const tagName = el.tagName.toLowerCase();
  if (NOISE_TAGS.has(tagName)) {
    return true;
  }

  try {
    if (typeof el.matches === "function" && el.matches(NOISE_SELECTOR_QUERY)) {
      return true;
    }
  } catch {
    // 忽略非法选择器匹配异常
  }

  return false;
}

/**
 * 在开放 Shadow DOM 与主文档树中深度寻找文章主容器
 */
export function findMainContainer(doc: Document): Element | null {
  // 1. 优先在顶层检查标准文章选择器
  for (const selector of ARTICLE_SELECTORS) {
    try {
      const el = doc.querySelector(selector);
      if (el && (el.textContent?.trim().length || 0) > 100) {
        return el;
      }
    } catch {
      // 忽略非法选择器
    }
  }

  // 2. 若顶层未命中，广度扫描包含 open shadowRoot 的自定义元素
  const root = doc.body;
  if (!root) return null;

  const queue: Element[] = Array.from(root.children);
  const visited = new WeakSet<ShadowRoot>();
  let scannedCount = 0;

  while (queue.length > 0 && scannedCount < 100) {
    const el = queue.shift()!;
    scannedCount++;

    if (el.shadowRoot && !visited.has(el.shadowRoot)) {
      visited.add(el.shadowRoot);
      for (const selector of ARTICLE_SELECTORS) {
        try {
          const match = el.shadowRoot.querySelector(selector);
          if (match && (match.textContent?.trim().length || 0) > 100) {
            return match;
          }
        } catch {}
      }
      queue.push(...Array.from(el.shadowRoot.children));
    }

    if (el.children && queue.length < 200) {
      queue.push(...Array.from(el.children));
    }
  }

  return doc.body;
}

/**
 * 遍历 Composed Tree 提取纯文本正文
 * 原位深度优先只读遍历，零 DOM 克隆破坏，支持开放 ShadowRoot、Slot 内容分发与 Fallback 回退
 */
export function extractComposedText(
  rootNode: Node,
  win: Window | null = null
): string {
  const textBlocks: string[] = [];
  const visitedRoots = new WeakSet<Node>();
  let currentLength = 0;

  const traverse = (node: Node, depth: number) => {
    if (depth > MAX_TRAVERSAL_DEPTH || currentLength >= MAX_EXTRACTED_CHARS) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        textBlocks.push(text);
        currentLength += text.length;
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // 1. 噪声节点剪枝
      if (isNoiseElement(el)) {
        return;
      }

      // 2. 不可见元素剪枝（穿透 CSS 隔离）
      if (!isElementVisible(el, win)) {
        return;
      }

      const tagName = el.tagName.toLowerCase();
      const isHeading = /^h[1-6]$/.test(tagName);
      const isListItem = tagName === "li";
      const isBlock =
        tagName === "p" ||
        tagName === "blockquote" ||
        tagName === "pre" ||
        tagName === "code";

      // 获取当前节点符合组合树（Composed Tree）逻辑的下级节点
      const getChildrenToTraverse = (): Node[] => {
        // 分支 A: HTMLSlotElement，处理内容分发与备用内容
        if (tagName === "slot") {
          const slot = el as HTMLSlotElement;
          const assigned =
            typeof slot.assignedNodes === "function"
              ? slot.assignedNodes({ flatten: true })
              : [];
          return assigned.length > 0 ? assigned : Array.from(slot.childNodes);
        }

        // 分支 B: Shadow Host，下钻进入 ShadowRoot，不再重复遍历 Light DOM childNodes（防止文字重复）
        if (el.shadowRoot) {
          if (!visitedRoots.has(el.shadowRoot)) {
            visitedRoots.add(el.shadowRoot);
            return Array.from(el.shadowRoot.childNodes);
          }
          return [];
        }

        // 分支 C: 普通 Light DOM 元素
        return Array.from(el.childNodes);
      };

      // 3. 语义化块级格式化处理
      if (isHeading || isListItem || isBlock) {
        const startIndex = textBlocks.length;
        const children = getChildrenToTraverse();
        for (const child of children) {
          traverse(child, depth + 1);
        }

        const blockTokens = textBlocks.splice(startIndex);
        const innerText = blockTokens.join(" ").replace(/[ \t]+/g, " ").trim();
        if (innerText) {
          if (isHeading) {
            textBlocks.push(`\n## ${innerText}\n`);
          } else if (isListItem) {
            textBlocks.push(`- ${innerText}`);
          } else {
            textBlocks.push(`\n${innerText}\n`);
          }
        }
        return;
      }

      // 4. 普通容器透明穿透下钻
      const children = getChildrenToTraverse();
      for (const child of children) {
        traverse(child, depth + 1);
      }
    }
  };

  traverse(rootNode, 0);

  const rawContent = textBlocks.join(" ");
  return rawContent
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

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
  return (
    title
      .replace(
        /\s*[-_–—|]\s*(知乎|掘金|CSDN|简书|微信公众平台|Bilibili|哔哩哔哩|GitHub|Medium|Substack|Reddit|Twitter|X|SegmentFault|少数派|36氪|澎湃新闻|腾讯网|网易网|新浪).*$/i,
        ""
      )
      .replace(/\s*[-_–—|]\s*[^-–—|_|]{2,20}$/, (match) => {
        return title.indexOf(match) > 10 ? "" : match;
      })
      .trim() || title
  );
}

/**
 * 计算字数统计（针对中英文混合）
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(/[一-龥]/g) || [];
  const nonCjkText = text.replace(/[一-龥]/g, " ");
  const wordMatches = nonCjkText.match(/[a-zA-Z0-9_\-]+/g) || [];
  return cjkMatches.length + wordMatches.length;
}

/**
 * 从 DOM 中提取正文内容纯文本（原位只读遍历，深度支持 Shadow DOM）
 */
export function extractMainContent(
  doc: Document = document,
  win?: Window
): string {
  const targetWin =
    win ||
    (doc.defaultView as Window) ||
    (typeof window !== "undefined" ? window : null);

  const mainContainer = findMainContainer(doc);
  if (!mainContainer) {
    return "";
  }

  return extractComposedText(mainContainer, targetWin);
}

/**
 * 寻找主滚动容器（针对内嵌在特定 div 的文档，如飞书/语雀/Twitter）
 */
export function findPrimaryScrollContainer(
  doc: Document = document
): HTMLElement {
  // 1. 优先探测已知富文本/长文专用容器
  for (const selector of VIRTUAL_LIST_MARKERS) {
    try {
      const el = doc.querySelector(selector) as HTMLElement | null;
      if (el && el.scrollHeight > el.clientHeight + 200) {
        return el;
      }
    } catch {}
  }

  // 2. 检查拥有 overflow-y 滚动特性的最大内部容器
  const candidateElements = doc.querySelectorAll(
    'main, article, div[class*="content"], div[class*="scroll"], div[class*="reader"], div[class*="editor"]'
  );
  let bestContainer: HTMLElement | null = null;
  let maxScrollHeight = 0;

  candidateElements.forEach((node) => {
    const el = node as HTMLElement;
    try {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        el.scrollHeight > maxScrollHeight &&
        el.clientHeight > 200
      ) {
        maxScrollHeight = el.scrollHeight;
        bestContainer = el;
      }
    } catch {}
  });

  if (bestContainer && maxScrollHeight > (window.innerHeight || 800) * 1.5) {
    return bestContainer;
  }

  // 3. 兜底退回 documentElement / scrollingElement
  return (doc.scrollingElement ||
    doc.documentElement ||
    doc.body) as HTMLElement;
}

/**
 * 启发式诊断：检测文档是否存在虚拟滚动与文本截断
 */
export function evaluateVirtualListState(
  doc: Document = document,
  extractedChars: number,
  container?: HTMLElement
): {
  isLikelyVirtualList: boolean;
  totalScreens: number;
  density: number;
  hasMoreContent: boolean;
} {
  const targetContainer = container || findPrimaryScrollContainer(doc);
  const scrollHeight =
    targetContainer.scrollHeight || doc.documentElement?.scrollHeight || 1000;
  const clientHeight =
    targetContainer.clientHeight ||
    (typeof window !== "undefined" ? window.innerHeight : 800) ||
    800;

  const totalScreens = Math.max(1, Math.round(scrollHeight / clientHeight));
  const density = Math.round(extractedChars / totalScreens);

  // 检查特征选择器
  const hasMarker = VIRTUAL_LIST_MARKERS.some((sel) => {
    try {
      return !!doc.querySelector(sel);
    } catch {
      return false;
    }
  });

  // 启发式准则：
  // 1. 页面总屏数 >= 4 且 每屏字符密度 < 160（说明大量高度由未渲染节点占位）
  // 2. 或命中特征标记且总屏数 >= 3
  const isLikelyVirtualList =
    (totalScreens >= 4 && density < 160) || (hasMarker && totalScreens >= 3);
  const hasMoreContent = isLikelyVirtualList && extractedChars < 25000;

  return {
    isLikelyVirtualList,
    totalScreens,
    density,
    hasMoreContent,
  };
}

/**
 * 极简 32 位 FNV-1a 字符串哈希算法（用于段落去重）
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * 受控渐进式步进采集合并（方案 A + C 融合，具备四重熔断与绝对位置无损恢复）
 */
export async function harvestProgressiveVirtualContent(
  doc: Document = document,
  options: {
    maxDurationMs?: number;
    maxSteps?: number;
    maxChars?: number;
    stepDelayMs?: number;
  } = {}
): Promise<string> {
  const {
    maxDurationMs = 3200,
    maxSteps = 15,
    maxChars = 24000,
    stepDelayMs = 75,
  } = options;

  const container = findPrimaryScrollContainer(doc);
  const isWindow =
    container === doc.documentElement ||
    container === doc.body ||
    container === doc.scrollingElement;

  const originalScrollTop = isWindow
    ? window.scrollY || window.pageYOffset || 0
    : container.scrollTop;

  const seenParagraphHashes = new Set<string>();
  const collectedParagraphs: string[] = [];
  let totalHarvestedChars = 0;
  let consecutiveEmptySteps = 0;
  const startTime = Date.now();

  try {
    for (let step = 0; step < maxSteps; step++) {
      // 1. 耗时熔断
      if (Date.now() - startTime > maxDurationMs) break;

      // 2. 提取当前视口内可见正文
      const stepContent = extractMainContent(doc);
      const stepParagraphs = stepContent
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 5);

      let stepNewChars = 0;
      for (const para of stepParagraphs) {
        const hash = fnv1aHash(para.slice(0, 120)); // 使用前缀哈希
        if (!seenParagraphHashes.has(hash)) {
          seenParagraphHashes.add(hash);
          collectedParagraphs.push(para);
          stepNewChars += para.length;
          totalHarvestedChars += para.length;
        }
      }

      // 3. 字符上限熔断
      if (totalHarvestedChars >= maxChars) break;

      // 4. 无增量早停检测
      if (stepNewChars === 0) {
        consecutiveEmptySteps++;
        if (consecutiveEmptySteps >= 2) break; // 连续 2 步无新内容，说明到底或不可滚动
      } else {
        consecutiveEmptySteps = 0;
      }

      // 5. 步进向下滚动
      const clientHeight = isWindow
        ? window.innerHeight || 800
        : container.clientHeight;
      const currentScrollTop = isWindow
        ? window.scrollY || window.pageYOffset || 0
        : container.scrollTop;
      const scrollHeight = container.scrollHeight;

      // 到达底部退出
      if (currentScrollTop + clientHeight >= scrollHeight - 30) {
        break;
      }

      const nextScrollTop =
        currentScrollTop + Math.min(clientHeight * 0.85, 750);
      if (isWindow) {
        window.scrollTo({ top: nextScrollTop, behavior: "instant" });
      } else {
        container.scrollTo({ top: nextScrollTop, behavior: "instant" });
      }

      // 6. 停顿等待宏任务，触发 DOM 虚拟挂载与重排
      await new Promise((resolve) => setTimeout(resolve, stepDelayMs));
    }
  } finally {
    // 7. 绝对位置无损恢复：瞬时还原到最初位置
    if (isWindow) {
      window.scrollTo({ top: originalScrollTop, behavior: "instant" });
    } else {
      container.scrollTo({ top: originalScrollTop, behavior: "instant" });
    }
  }

  if (collectedParagraphs.length > 0) {
    return collectedParagraphs.join("\n\n").trim();
  }
  return extractMainContent(doc);
}

/**
 * 完整提取当前网页信息（集成 Shadow DOM 与虚拟长文诊断）
 */
export async function extractPageData(
  doc: Document = document,
  win: Window = window,
  options?: { deepScan?: boolean }
): Promise<ExtractedPageContent> {
  const isDeepScan = options?.deepScan || false;
  const title = extractPageTitle(doc);
  const url = win.location ? win.location.href : "";

  let content = "";
  if (isDeepScan) {
    content = await harvestProgressiveVirtualContent(doc);
  } else {
    content = extractMainContent(doc, win);
  }

  const wordCount = countWords(content);
  const excerpt = content.slice(0, 180).replace(/\s+/g, " ").trim();

  // 启发式检测
  const container = findPrimaryScrollContainer(doc);
  const heuristics = evaluateVirtualListState(doc, content.length, container);

  return {
    title,
    url,
    content,
    wordCount,
    excerpt,
    isLikelyVirtualList: heuristics.isLikelyVirtualList,
    totalEstimatedScreens: heuristics.totalScreens,
    scrollDensity: heuristics.density,
    hasMoreContent: isDeepScan ? false : heuristics.hasMoreContent,
  };
}
