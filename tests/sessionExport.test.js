import { describe, expect, test } from "bun:test";
import {
  formatSessionAsMarkdown,
  formatSessionAsPlainText,
} from "../entrypoints/shared/sessionExport.ts";

describe("Session Export Utilities", () => {
  const mockSession = {
    id: "session-123",
    title: "什么是 OKR 与 KPI",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "什么是 OKR？",
        createdAt: 1700000000000,
        status: "completed",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "OKR 就是目标与关键成果，大白话就是这季度的大目标。",
        reasoningContent: "先分析用户痛点，再举通俗比喻",
        hasReasoning: true,
        createdAt: 1700000001000,
        status: "completed",
      },
      {
        id: "msg-3",
        role: "user",
        content: "通读网页: 《架构演进》",
        pageMeta: {
          title: "架构演进",
          url: "https://example.com/arch",
          wordCount: 1500,
          isWebPageReading: true,
        },
        createdAt: 1700000002000,
        status: "completed",
      },
    ],
  };

  test("formats session as structured markdown", () => {
    const md = formatSessionAsMarkdown(mockSession);
    expect(md).toContain("# 人话翻译会话: 什么是 OKR 与 KPI");
    expect(md).toContain("### 👤 用户");
    expect(md).toContain("### 🤖 人话翻译器");
    expect(md).toContain("💭 **思考过程**:");
    expect(md).toContain("先分析用户痛点，再举通俗比喻");
    expect(md).toContain("OKR 就是目标与关键成果");
    expect(md).toContain("[网页通读]");
    expect(md).toContain("https://example.com/arch");
  });

  test("formats session as plain text", () => {
    const text = formatSessionAsPlainText(mockSession);
    expect(text).toContain("【会话】什么是 OKR 与 KPI");
    expect(text).toContain("[用户]");
    expect(text).toContain("什么是 OKR？");
    expect(text).toContain("[人话翻译器]");
    expect(text).toContain("OKR 就是目标与关键成果");
  });

  test("handles empty session gracefully", () => {
    const emptySession = {
      id: "empty",
      title: "空会话",
      messages: [],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const md = formatSessionAsMarkdown(emptySession);
    expect(md).toContain("(暂无对话记录)");

    const text = formatSessionAsPlainText(emptySession);
    expect(text).toContain("(暂无对话记录)");
  });
});
