import { describe, expect, test } from "bun:test";
import {
  copyTextToClipboard,
  downloadFile,
  exportSessionAsJson,
  formatSessionToMarkdown,
  generateExportFileName,
} from "../entrypoints/shared/chatExport.ts";

describe("chat export utilities", () => {
  const sampleSession = {
    id: "session-abc-123",
    title: "通读: 大厂技术周报...",
    createdAt: 1772496000000,
    updatedAt: 1772496100000,
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "通读网页: 《微服务架构演进》",
        pageMeta: {
          title: "微服务架构演进",
          url: "https://tech.example.com/arch",
          wordCount: 3200,
          isWebPageReading: true,
        },
        createdAt: 1772496010000,
        status: "completed",
      },
      {
        id: "msg-2",
        role: "assistant",
        content:
          "## 💡 大白话总览\n\n这篇文章主要讲了系统如何从小作坊变成大流水线。",
        reasoningContent: "正在分析微服务拆分的利弊与演进路径...",
        hasReasoning: true,
        suggestedQuestions: [
          "如何评估服务拆分的颗粒度？",
          "单体架构在什么规模下才必须拆分？",
        ],
        createdAt: 1772496050000,
        status: "completed",
      },
      {
        id: "msg-3",
        role: "user",
        content: "请用大白话解释 RPC 和 HTTP 的区别",
        createdAt: 1772496080000,
        status: "completed",
      },
      {
        id: "msg-4",
        role: "assistant",
        content:
          "简单来说：HTTP 像寄快递写全了地址贴了邮票，RPC 像内部传呼机直接叫工号。",
        createdAt: 1772496100000,
        status: "completed",
      },
    ],
  };

  test("generateExportFileName creates clean file names with sanitized titles and dates", () => {
    const mdName = generateExportFileName(sampleSession, "md");
    expect(mdName).toContain("人话翻译器-通读_大厂技术周报");
    expect(mdName.endsWith(".md")).toBe(true);

    const jsonName = generateExportFileName(sampleSession, "json");
    expect(jsonName.endsWith(".json")).toBe(true);

    // Fallback title
    const fallbackName = generateExportFileName(
      { id: "1", title: "", messages: [], createdAt: 0, updatedAt: 0 },
      "md"
    );
    expect(fallbackName).toContain("人话翻译器-对话-");
  });

  test("formatSessionToMarkdown handles empty or undefined sessions gracefully", () => {
    expect(formatSessionToMarkdown(undefined)).toBe("");
    expect(
      formatSessionToMarkdown({
        id: "empty",
        title: "空",
        messages: [],
        createdAt: 0,
        updatedAt: 0,
      })
    ).toBe("");
  });

  test("formatSessionToMarkdown formats full chat including metadata, webpage card, reasoning and questions", () => {
    const markdown = formatSessionToMarkdown(sampleSession);

    // Metadata header
    expect(markdown).toContain("# 💬 人话翻译器对话记录：通读: 大厂技术周报...");
    expect(markdown).toContain("- **创建时间**：");
    expect(markdown).toContain("- **总消息数**：4 条");

    // Web reading details
    expect(markdown).toContain("📄 **网页通读**：微服务架构演进");
    expect(markdown).toContain("🔗 **网页链接**：https://tech.example.com/arch");
    expect(markdown).toContain("📊 **文章字数**：约 3200 字");

    // Reasoning content
    expect(markdown).toContain("🧠 **深度思考过程**：");
    expect(markdown).toContain("> 正在分析微服务拆分的利弊与演进路径...");

    // Assistant content
    expect(markdown).toContain("## 💡 大白话总览");
    expect(markdown).toContain(
      "HTTP 像寄快递写全了地址贴了邮票，RPC 像内部传呼机直接叫工号。"
    );

    // Suggested questions
    expect(markdown).toContain("**💡 推荐继续追问：**");
    expect(markdown).toContain("1. 如何评估服务拆分的颗粒度？");
    expect(markdown).toContain("2. 单体架构在什么规模下才必须拆分？");

    // Footer
    expect(markdown).toContain("由「人话翻译器 (Human Text Translator)」生成导出");
  });

  test("formatSessionToMarkdown supports options to toggle reasoning or metadata", () => {
    const markdownNoReasoning = formatSessionToMarkdown(sampleSession, {
      includeReasoning: false,
      includeMetadata: false,
      includeSuggestedQuestions: false,
    });

    expect(markdownNoReasoning).not.toContain("# 💬 人话翻译器对话记录");
    expect(markdownNoReasoning).not.toContain("🧠 **深度思考过程**");
    expect(markdownNoReasoning).not.toContain("**💡 推荐继续追问：**");
    expect(markdownNoReasoning).toContain("### 👤 用户");
    expect(markdownNoReasoning).toContain("### 🤖 人话翻译器");
  });

  test("exportSessionAsJson returns valid JSON string with session data", () => {
    const jsonStr = exportSessionAsJson(sampleSession);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.appName).toBe("人话翻译器");
    expect(parsed.version).toBe("1.3.0");
    expect(parsed.session.id).toBe("session-abc-123");
    expect(parsed.session.messages.length).toBe(4);
  });

  test("copyTextToClipboard works with navigator.clipboard mock", async () => {
    let copiedText = "";
    globalThis.navigator = {
      clipboard: {
        writeText: async (text) => {
          copiedText = text;
        },
      },
    };

    const res = await copyTextToClipboard("Hello Markdown");
    expect(res).toBe(true);
    expect(copiedText).toBe("Hello Markdown");
  });
});
