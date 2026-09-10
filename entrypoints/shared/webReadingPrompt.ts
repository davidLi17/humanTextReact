/**
 * 网页长文一键通读 - 结构化 Prompt 与相关工具
 */

export interface WebPageMetadata {
  title: string;
  url: string;
  content: string;
  excerpt?: string;
  wordCount?: number;
  /** 是否疑似超长虚拟滚动列表（段落随滚动被销毁或未挂载） */
  isLikelyVirtualList?: boolean;
  /** 预估总屏数 */
  totalEstimatedScreens?: number;
  /** 正文每屏平均字符密度 */
  scrollDensity?: number;
  /** 是否检测到未加载完成的长文内容 */
  hasMoreContent?: boolean;
}

/**
 * 专门针对“整页长文人话通读”的系统提示词
 */
export const WEB_READING_SYSTEM_PROMPT = `你是一个顶级的内容提炼专家与“人话翻译官”。你的任务是阅读用户提供的网页/长文正文，用极其接地气、大白话的方式输出一份结构清晰、直击本质的阅读报告，彻底帮用户扫清行业黑话和形式主义废话。

请严格按照以下四个结构化板块进行输出（使用 Markdown 格式）：

### 💡 一句话大白话总览
- 用最通俗、一针见血的话概括作者的核心观点（就像跟好朋友聊天一样，用一两句话把整篇文章到底在讲啥说透，剔除所有公关套话与虚浮包装）。

### 📖 核心黑话/专业术语速查表
- 提取文中最核心的 3~6 个行业黑话、专业术语或英文缩写。
- 用 Markdown 表格或清晰列表形式呈现，每一项必须包含：
  - **术语名称**（含英文全称/缩写）
  - **一句话大白话释义**（必须附带一个接地气的生活比喻或通俗例子）。

### 🎯 要点与行动项提炼
- 提炼出 3~5 条最重要的核心论据、关键事实或落地行动建议。
- 每条使用序号列出，先用加粗标题概括要点，再用 1-2 句通俗语言解释。

### 💬 深度追问指引
- 基于本文的论述盲点、延伸思考或实操落地，给出 2~3 个最具启发性的后续提问。
- 格式要求：每一条单独一行，以「? 」或建议追问形式呈现，方便用户直接点击或继续在对话中深入探讨。

【风格要求】：
1. 语气亲切生动、客观犀利，杜绝空话。
2. 遇到英文缩写务必给出中文直译与解释。
3. 排版清爽，适当配合 Emoji 提升阅读愉悦感。`;

/**
 * 最大文本截断长度（字符数），防止超出单次上下文窗口
 */
export const MAX_PAGE_CONTENT_CHARS = 16000;

/**
 * 提取结果视为“有效长文”的最小正文字符数，低于该值视为提取失败
 */
export const MIN_PAGE_CONTENT_CHARS = 15;

/**
 * 页面正文提取消息的超时时间（毫秒），防止 UI 永久停留在“正在提取”状态
 */
export const WEB_READING_EXTRACT_TIMEOUT_MS = 10000;

/**
 * 提取超时的哨兵错误标记（sidepanel 内部用于区分“消息无响应超时”与其他失败）
 */
export const WEB_READING_EXTRACT_TIMEOUT_MARKER = "web-reading-extract-timeout";

/**
 * 网页内容获取链路的环节标记（用于错误文案定位环节 + 日志 stage 字段）
 */
export type WebReadExtractStage =
  | "tab" // 获取活动标签页
  | "restricted" // 受限页识别拦截
  | "cs-inject" // content script 未注入/无响应
  | "cs-extract" // content script 内正文提取失败
  | "fallback-extract" // 动态注入兜底提取失败
  | "content-too-short" // 提取成功但正文过短
  | "ai-request"; // AI 请求环节（透传现有错误，不做细分）

/**
 * 环节标记的中文标签，展示在错误文案末尾方便用户定位问题环节
 */
export const WEB_READ_STAGE_LABELS: Record<WebReadExtractStage, string> = {
  "tab": "环节：获取标签页",
  "restricted": "环节：受限页拦截",
  "cs-inject": "环节：内容脚本未注入",
  "cs-extract": "环节：正文提取（内容脚本）",
  "fallback-extract": "环节：正文提取（动态注入兜底）",
  "content-too-short": "环节：正文过少",
  "ai-request": "环节：AI 请求",
};

/**
 * 网页内容获取失败类型（用于在聊天视图给出明确的三要素提示：
 * 发生了什么 / 可能原因 / 用户该怎么办）
 */
export type WebReadFailureKind =
  | "no-active-tab" // 拿不到活动标签页
  | "restricted-page" // 浏览器受限页（chrome:// 等）
  | "empty-content" // 提取成功但正文为空或过短
  | "extract-timeout" // 提取消息无响应/超时
  | "cs-extract-failed" // content script 已注入但提取正文出错
  | "script-blocked" // content script 未注入且动态注入被拦截
  | "unknown"; // 其他未知失败

const WEB_READ_FAILURE_GUIDANCE: Record<
  WebReadFailureKind,
  (detail?: string) => string
> = {
  "no-active-tab": () =>
    "未能获取网页内容：没有找到可读取的活动标签页。可能原因：当前浏览器窗口没有已打开的网页。建议：先切换或打开一个普通网页，再重新点击「通读当前网页」。",
  "restricted-page": () =>
    "未能获取网页内容：当前是浏览器内置页面（如 chrome:// 设置页、新标签页、扩展商店等），扩展无权读取其内容。可能原因：浏览器出于安全限制禁止扩展访问这类页面，并非功能故障。建议：切换到普通文章页面后，再点击「通读当前网页」。",
  "empty-content": () =>
    "未能获取网页内容：页面已打开，但只提取到极少的正文，不足以通读。可能原因：页面尚未加载完成、正文需要登录后才能查看，或该站点（在线文档、PDF 阅读器、强反爬站点等）拦截了内容读取。建议：等待页面加载完成后刷新页面重试；需要登录的页面请先登录；仍失败可换一篇普通文章页测试。",
  "extract-timeout": () =>
    "未能获取网页内容：向页面请求正文时长时间无响应（已超时）。可能原因：页面卡死或仍在加载中、页面脚本繁忙未能响应扩展消息。建议：刷新页面后重试；若反复出现，请到 chrome://extensions 点击本扩展的「重新加载」后再试。",
  "cs-extract-failed": (detail) =>
    `未能获取网页内容：页面内的正文提取脚本运行出错${detail ? `（${detail}）` : ""}。可能原因：页面结构特殊导致解析异常，或页面脚本与扩展相互冲突。建议：刷新页面后重试；若仍失败，请换一个普通文章页测试，或到 chrome://extensions 重新加载本扩展。`,
  "script-blocked": (detail) =>
    `未能获取网页内容：扩展无法在该页面注入或运行提取脚本${detail ? `（${detail}）` : ""}。可能原因：该站点禁止扩展注入脚本（如 Chrome 应用商店、浏览器内置 PDF 查看器），或扩展缺少对该站点的访问权限。建议：换一个普通文章页重试；若确需支持当前站点，请到 chrome://extensions 打开本扩展详情，将「站点访问权限」设为「在所有网站上」。`,
  "unknown": (detail) =>
    `未能获取网页内容：提取过程中出现未知错误${detail ? `（${detail}）` : ""}。可能原因：页面尚未加载完成、站点限制读取，或扩展状态异常。建议：刷新页面后重试，或换一个普通文章页；若反复出现，请到 chrome://extensions 重新加载本扩展。`,
};

/**
 * 按失败类型生成“发生了什么 + 可能原因 + 该怎么办”的中文提示，
 * 并在末尾追加环节标签（如「环节：正文提取（动态注入兜底）」）方便定位链路问题
 */
export function describeWebReadFailure(
  kind: WebReadFailureKind,
  detail?: string,
  stage?: WebReadExtractStage
): string {
  const builder =
    WEB_READ_FAILURE_GUIDANCE[kind] || WEB_READ_FAILURE_GUIDANCE.unknown;
  const base = builder(detail);
  const stageLabel = stage ? WEB_READ_STAGE_LABELS[stage] : undefined;
  return stageLabel ? `${base}（${stageLabel}）` : base;
}

/**
 * 由链路环节标记推导失败类型（stage 缺失时可退回 classifyWebReadExtractError 按文案归类）
 */
export function webReadFailureKindFromStage(
  stage: WebReadExtractStage
): WebReadFailureKind {
  switch (stage) {
    case "tab":
      return "no-active-tab";
    case "restricted":
      return "restricted-page";
    case "cs-inject":
    case "fallback-extract":
      return "script-blocked";
    case "cs-extract":
      return "cs-extract-failed";
    case "content-too-short":
      return "empty-content";
    default:
      return "unknown";
  }
}

/**
 * 将底层提取链路返回的错误文案归类为失败类型（无法改动上游文件时的兜底识别）
 */
export function classifyWebReadExtractError(
  error?: string
): WebReadFailureKind {
  if (!error) return "unknown";
  if (error.includes("活动标签页")) return "no-active-tab";
  if (
    error.includes("浏览器内置系统页面") ||
    error.includes("chrome://") ||
    error.includes("edge://") ||
    error.includes("about:")
  ) {
    return "restricted-page";
  }
  if (
    error.includes("脚本被拦截") ||
    error.includes("无法提取该网页正文") ||
    error.includes("注入") ||
    /cannot access contents|cannot access a /i.test(error)
  ) {
    return "script-blocked";
  }
  return "unknown";
}

/**
 * 按单段最大字符数计算长文的总段数（约数）
 */
export function getWebReadingSegmentCount(totalChars: number): number {
  if (!Number.isFinite(totalChars) || totalChars <= 0) return 1;
  return Math.ceil(totalChars / MAX_PAGE_CONTENT_CHARS);
}

/**
 * 构建“继续解读剩余部分”的续读 User Prompt（同一会话上下文内顺序解读，不做分块汇总）
 */
export function buildWebReadingContinuationPrompt(params: {
  title: string;
  segmentContent: string;
  /** 当前段序号（从 1 开始） */
  segmentIndex: number;
  /** 总段数（约数） */
  totalSegments: number;
}): string {
  const title = (params.title || "未知网页标题").trim();
  return `【网页标题】: ${title}
【续读进度】: 第 ${params.segmentIndex} 段 / 共约 ${params.totalSegments} 段（每段约 ${MAX_PAGE_CONTENT_CHARS} 字符）

【本段正文内容】：
\`\`\`text
${params.segmentContent}
\`\`\`

这是此前已经开始通读的网页《${title}》的后续部分。请继续按照系统提示词的四个板块（💡 一句话大白话总览、📖 核心黑话/专业术语速查表、🎯 要点与行动项提炼、💬 深度追问指引），用通俗易懂的人话解读本段内容，并注意与前文已输出的速读报告保持连贯；若这是最后一段，请在结尾补充一句对全文的整体收束。`;
}

/**
 * 按单段上限截断正文，并回报是否发生了截断
 */
function truncatePageContent(content: string): {
  content: string;
  isTruncated: boolean;
} {
  const raw = (content || "").trim();
  if (raw.length > MAX_PAGE_CONTENT_CHARS) {
    return { content: raw.slice(0, MAX_PAGE_CONTENT_CHARS), isTruncated: true };
  }
  return { content: raw, isTruncated: false };
}

/**
 * 组装网页元信息头（标题 / 来源链接 / 预估字数 / 截断提示）
 */
function buildPageHeaderInfo(
  page: WebPageMetadata,
  isTruncated: boolean,
  truncatedNote: string
): string {
  // 先 trim 再兜底：纯空白标题在 `||` 下是 truthy，若先兜底再 trim 会得到空标题
  const title = (page.title || "").trim() || "未知网页标题";
  const url = (page.url || "").trim();
  return [
    `【网页标题】: ${title}`,
    url ? `【来源链接】: ${url}` : "",
    page.wordCount ? `【原文预估字数】: 约 ${page.wordCount} 字` : "",
    isTruncated ? truncatedNote : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 构建长文人话通读的 User Prompt
 */
export function buildWebReadingUserPrompt(page: WebPageMetadata): string {
  const { content: rawContent, isTruncated } = truncatePageContent(page.content);
  const headerInfo = buildPageHeaderInfo(
    page,
    isTruncated,
    `【注】: 原文较长，已截取前 ${MAX_PAGE_CONTENT_CHARS} 字符进行深度通读。`
  );

  return `${headerInfo}

【网页正文内容】：
\`\`\`text
${rawContent}
\`\`\`

请按照系统提示词的四个板块（💡 一句话大白话总览、📖 核心黑话/专业术语速查表、🎯 要点与行动项提炼、💬 深度追问指引），用通俗易懂的人话为我生成结构化速读报告。`;
}

/**
 * 构建“网页正文作为上下文附加”的中性 Prompt。
 *
 * 与 buildWebReadingUserPrompt 的关键差别：不要求模型立刻产出速读报告，
 * 只声明正文已挂载为上下文、供后续追问引用。用户在卡片之后继续提问时，
 * 历史里出现的必须是这样一段中性背景，而不是“请生成速查表”的指令，
 * 否则模型会被带向通读报告而非用户真正问的那件事。
 */
export function buildAttachedPageContextPrompt(page: WebPageMetadata): string {
  const { content: rawContent, isTruncated } = truncatePageContent(page.content);
  const headerInfo = buildPageHeaderInfo(
    page,
    isTruncated,
    `【注】: 原文较长，已截取前 ${MAX_PAGE_CONTENT_CHARS} 字符。`
  );

  return `${headerInfo}

【网页正文内容】：
\`\`\`text
${rawContent}
\`\`\`

以上网页正文已作为背景资料附加到本次对话。请记住它，但不要主动输出摘要、速读报告或结构化解读：当用户后续的提问与它相关时，结合正文作答；只有当用户明确要求通读、总结或提炼时，才按其具体要求输出。`;
}

/**
 * 从通读结果中提取出引导性追问（用于在 UI 中渲染快捷 Pill 按钮）
 */
export function extractSuggestedQuestions(markdownText: string): string[] {
  if (!markdownText) return [];

  const questions: string[] = [];

  // 1. 尝试匹配“深度追问指引”模块之后的内容
  const sectionMatch = markdownText.match(
    /(?:###?\s*💬?\s*深度追问指引|深度追问指引)([\s\S]*)$/i
  );
  const targetText = sectionMatch ? sectionMatch[1] : markdownText;

  // 匹配行首是数字、破折号或问号的追问行
  const lines = targetText.split("\n");
  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // 清洗掉行首的前缀（如数字序号、破折号、星号、问号、emoji 等）
    trimmed = trimmed.replace(
      /^(?:\d+[\.、\)]|\-|\*|•|\?|❓|💬|问题\s*\d*[:：]?)\s*/,
      ""
    );
    // 清除首尾残留的 Markdown 加粗符号、问号或引号
    trimmed = trimmed.replace(/^[\*\#\_\s\?？“"「]+|[\*\#\_\s“"」]+$/g, "");
    // 清除双星号加粗包裹
    trimmed = trimmed
      .replace(/^\*\*(.*?)\*\*$/, "$1")
      .replace(/^__(.*?)__$/, "$1")
      .trim();

    if (
      trimmed.length >= 4 &&
      trimmed.length <= 80 &&
      (trimmed.includes("？") ||
        trimmed.includes("?") ||
        trimmed.includes("如何") ||
        trimmed.includes("怎么") ||
        trimmed.includes("什么") ||
        trimmed.includes("为什么") ||
        trimmed.includes("建议") ||
        trimmed.includes("思考") ||
        trimmed.includes("是否") ||
        trimmed.includes("局限"))
    ) {
      questions.push(trimmed);
    }
  }

  // 如果解析出的建议不足，提供兜底的通用高质量追问
  if (questions.length === 0) {
    return [
      "请用最简单的小白视角，解释文中提到的第一个核心概念",
      "这篇文章的观点是否存在局限性或未经证实的假设？",
      "针对文中的行动项，如果我现在要落地，第一步具体应该做什么？",
    ];
  }

  return questions.slice(0, 4);
}
