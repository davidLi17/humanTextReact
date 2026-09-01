/**
 * 网页长文一键通读 - 结构化 Prompt 与相关工具
 */

export interface WebPageMetadata {
  title: string;
  url: string;
  content: string;
  excerpt?: string;
  wordCount?: number;
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
 * 构建长文人话通读的 User Prompt
 */
export function buildWebReadingUserPrompt(page: WebPageMetadata): string {
  const title = (page.title || "未知网页标题").trim();
  const url = (page.url || "").trim();
  let rawContent = (page.content || "").trim();

  let isTruncated = false;
  if (rawContent.length > MAX_PAGE_CONTENT_CHARS) {
    rawContent = rawContent.slice(0, MAX_PAGE_CONTENT_CHARS);
    isTruncated = true;
  }

  const headerInfo = [
    `【网页标题】: ${title}`,
    url ? `【来源链接】: ${url}` : "",
    page.wordCount ? `【原文预估字数】: 约 ${page.wordCount} 字` : "",
    isTruncated ? `【注】: 原文较长，已截取前 ${MAX_PAGE_CONTENT_CHARS} 字符进行深度通读。` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${headerInfo}

【网页正文内容】：
\`\`\`text
${rawContent}
\`\`\`

请按照系统提示词的四个板块（💡 一句话大白话总览、📖 核心黑话/专业术语速查表、🎯 要点与行动项提炼、💬 深度追问指引），用通俗易懂的人话为我生成结构化速读报告。`;
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
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 匹配如: "1. 如果我是新手，该如何落地？" 或 "- 这篇文章的观点有什么局限？" 或 "• 怎么看待..."
    const questionMatch = trimmed.match(
      /^(?:\d+[\.、\)]|\-|\*|•|\?|❓|💬)\s*(?:[“"「]?)(.+?)(?:[”"」]?)$/
    );

    if (questionMatch && questionMatch[1]) {
      let q = questionMatch[1].trim();
      // 移除尾部可能多余的标记
      q = q.replace(/^[\*\#\_\s]+|[\*\#\_\s]+$/g, "");
      if (q.length >= 4 && q.length <= 80 && (q.includes("？") || q.includes("?") || q.includes("如何") || q.includes("怎么") || q.includes("什么") || q.includes("为什么") || q.includes("建议") || q.includes("思考"))) {
        questions.push(q);
      }
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
