import dayjs from "dayjs";
import { ChatMessage, ChatSession } from "./chatTypes";

/**
 * 导出对话配置项
 */
export interface ExportMarkdownOptions {
  /** 是否包含导出时间戳元数据，默认 true */
  includeMetadata?: boolean;
  /** 是否包含思维链思考过程，默认 true */
  includeReasoning?: boolean;
  /** 是否包含智能追问建议，默认 true */
  includeSuggestedQuestions?: boolean;
}

/**
 * 生成规范化的安全文件名
 * 例如：人话翻译器-对话-2026-09-02.md 或 人话翻译器-对话-速读网页-2026-09-02.md
 */
export function generateExportFileName(
  session: ChatSession | undefined,
  extension: "md" | "json"
): string {
  const dateStr = dayjs(session?.updatedAt || Date.now()).format("YYYY-MM-DD");
  let rawTitle = (session?.title || "对话").trim();

  // 清理文件名中的非法字符与多余空格
  rawTitle = rawTitle.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  if (!rawTitle || rawTitle === "新对话") {
    rawTitle = "对话";
  }

  // 截取前 30 个字符避免文件名过长
  if (rawTitle.length > 30) {
    rawTitle = rawTitle.slice(0, 30);
  }

  return `人话翻译器-${rawTitle}-${dateStr}.${extension}`;
}

/**
 * 将单条消息格式化为 Markdown 片段
 */
function formatMessageToMarkdown(
  message: ChatMessage,
  options: ExportMarkdownOptions = {}
): string {
  const { includeReasoning = true, includeSuggestedQuestions = true } = options;
  const timeStr = dayjs(message.createdAt).format("YYYY-MM-DD HH:mm:ss");
  const lines: string[] = [];

  if (message.role === "user") {
    lines.push(`### 👤 用户 (${timeStr})`);

    // 如果是网页长文通读
    if (message.pageMeta?.isWebPageReading) {
      lines.push(`> 📄 **网页通读**：${message.pageMeta.title}`);
      if (message.pageMeta.url) {
        lines.push(`> 🔗 **网页链接**：${message.pageMeta.url}`);
      }
      if (message.pageMeta.wordCount) {
        lines.push(`> 📊 **文章字数**：约 ${message.pageMeta.wordCount} 字`);
      }
      lines.push("");
    }

    if (message.images && message.images.length > 0) {
      lines.push(`> 🖼️ *[用户上传了 ${message.images.length} 张图片]*`);
      lines.push("");
    }

    if (message.content) {
      lines.push(message.content);
    }
  } else if (message.role === "assistant") {
    lines.push(`### 🤖 人话翻译器 (${timeStr})`);

    // 思维链深度思考过程
    if (includeReasoning && message.hasReasoning && message.reasoningContent) {
      lines.push("> 🧠 **深度思考过程**：");
      const reasoningLines = message.reasoningContent
        .split("\n")
        .map((line) => `> ${line}`);
      lines.push(reasoningLines.join("\n"));
      lines.push("");
    }

    if (message.content) {
      lines.push(message.content);
    } else if (message.status === "error") {
      lines.push(`> ⚠️ *生成出错：${message.errorMessage || "未知错误"}*`);
    }

    // 智能追问建议
    if (
      includeSuggestedQuestions &&
      message.suggestedQuestions &&
      message.suggestedQuestions.length > 0
    ) {
      lines.push("");
      lines.push("**💡 推荐继续追问：**");
      message.suggestedQuestions.forEach((q, idx) => {
        lines.push(`${idx + 1}. ${q}`);
      });
    }
  } else if (message.role === "system") {
    lines.push(`### ⚙️ 系统提示词 (${timeStr})`);
    lines.push(`> ${message.content.split("\n").join("\n> ")}`);
  }

  return lines.join("\n");
}

/**
 * 将整个 ChatSession 转换为优雅排版的 Markdown 字符串
 */
export function formatSessionToMarkdown(
  session: ChatSession | undefined,
  options: ExportMarkdownOptions = {}
): string {
  if (!session || !session.messages || session.messages.length === 0) {
    return "";
  }

  const { includeMetadata = true } = options;
  const sections: string[] = [];

  if (includeMetadata) {
    const formattedDate = dayjs(session.createdAt).format("YYYY-MM-DD HH:mm:ss");
    const updatedDate = dayjs(session.updatedAt).format("YYYY-MM-DD HH:mm:ss");

    sections.push(`# 💬 人话翻译器对话记录：${session.title || "未命名对话"}`);
    sections.push(
      `- **创建时间**：${formattedDate}\n- **最近更新**：${updatedDate}\n- **总消息数**：${session.messages.length} 条`
    );
    sections.push("---");
  }

  session.messages.forEach((msg) => {
    const formatted = formatMessageToMarkdown(msg, options);
    if (formatted) {
      sections.push(formatted);
      sections.push("---");
    }
  });

  sections.push("\n*由「人话翻译器 (Human Text Translator)」生成导出*");

  return sections.join("\n\n");
}

/**
 * 将整个 ChatSession 导出为标准的 JSON 字符串
 */
export function exportSessionAsJson(session: ChatSession | undefined): string {
  if (!session) {
    return "{}";
  }

  const exportPayload = {
    version: "1.3.0",
    appName: "人话翻译器",
    exportTime: new Date().toISOString(),
    session,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * 触发本地文件下载
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8"
): boolean {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error("下载文件失败:", error);
    return false;
  }
}

/**
 * 复制文本到系统剪贴板（包含现代 API 与降级方案）
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard.writeText 失败，尝试降级兼容方案:", err);
  }

  try {
    if (typeof document !== "undefined" && document.createElement) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return Boolean(successful);
    }
    return false;
  } catch (err) {
    console.error("降级复制失败:", err);
    return false;
  }
}

