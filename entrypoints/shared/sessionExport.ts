import { ChatSession } from "./chatTypes";
import { formatDateTime } from "@/entrypoints/popup/utils/helpers";

/**
 * 将单场会话格式化为 Markdown 字符串
 */
export function formatSessionAsMarkdown(session: ChatSession): string {
  if (!session || !session.messages || session.messages.length === 0) {
    return `# 人话翻译会话: ${session?.title || "未命名会话"}\n\n(暂无对话记录)`;
  }

  const lines: string[] = [
    `# 人话翻译会话: ${session.title || "未命名会话"}`,
    `> 导出时间: ${formatDateTime(Date.now())} | 消息数: ${session.messages.length}`,
    "",
    "---",
    "",
  ];

  session.messages.forEach((msg) => {
    if (msg.role === "user") {
      lines.push(`### 👤 用户`);
      if (msg.pageMeta?.isWebPageReading) {
        lines.push(`**[网页通读]** 《${msg.pageMeta.title}》`);
        if (msg.pageMeta.url) {
          lines.push(`> 来源链接: ${msg.pageMeta.url}`);
        }
        lines.push("");
      } else {
        lines.push(msg.content);
        lines.push("");
      }
    } else if (msg.role === "assistant") {
      lines.push(`### 🤖 人话翻译器`);
      if (msg.hasReasoning && msg.reasoningContent) {
        lines.push(`> 💭 **思考过程**:`);
        msg.reasoningContent.split("\n").forEach((line) => {
          lines.push(`> ${line}`);
        });
        lines.push("");
      }
      lines.push(msg.content || "(生成中...)");
      lines.push("");
    } else {
      lines.push(`### ⚙️ 系统`);
      lines.push(msg.content);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * 将单场会话格式化为纯文本全文
 */
export function formatSessionAsPlainText(session: ChatSession): string {
  if (!session || !session.messages || session.messages.length === 0) {
    return `${session?.title || "未命名会话"}\n(暂无对话记录)`;
  }

  const lines: string[] = [
    `【会话】${session.title || "未命名会话"}`,
    `【时间】${formatDateTime(session.createdAt || Date.now())}`,
    "====================",
    "",
  ];

  session.messages.forEach((msg) => {
    const roleName =
      msg.role === "user"
        ? "用户"
        : msg.role === "assistant"
        ? "人话翻译器"
        : "系统";
    lines.push(`[${roleName}]`);
    if (msg.pageMeta?.isWebPageReading) {
      lines.push(`通读网页: 《${msg.pageMeta.title}》 (${msg.pageMeta.url})`);
    }
    if (msg.content) {
      lines.push(msg.content);
    }
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * 触发会话的 Markdown 文件下载
 */
export function downloadSessionMarkdownFile(session: ChatSession): void {
  const md = formatSessionAsMarkdown(session);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const sanitizedTitle = (session.title || "chat")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 30);
  a.href = url;
  a.download = `人话翻译-${sanitizedTitle}-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 触发会话的 JSON 文件下载
 */
export function downloadSessionJsonFile(session: ChatSession): void {
  const json = JSON.stringify(session, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const sanitizedTitle = (session.title || "chat")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 30);
  a.href = url;
  a.download = `人话翻译-${sanitizedTitle}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
