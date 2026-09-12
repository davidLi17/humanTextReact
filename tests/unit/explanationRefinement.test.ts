import { describe, expect, test } from "bun:test";
import {
  buildExplanationRefinementPrompt,
  createExplanationRefinementMeta,
  getExplanationRefinementLabel,
  materializeExplanationRefinementMessage,
  normalizeExplanationRefinementMeta,
} from "../../entrypoints/shared/explanationRefinement";

describe("定向补讲元数据与请求物化", () => {
  test("三种补讲方式都有稳定标签和可读机器指令", () => {
    for (const mode of ["simpler", "source-walkthrough", "context-example"] as const) {
      const meta = createExplanationRefinementMeta({
        mode,
        targetAssistantMessageId: "assistant-1",
        targetExcerpt: "这是一段回答片段。",
      });
      expect(meta).toBeTruthy();
      expect(getExplanationRefinementLabel(mode)).toBeTruthy();
      const prompt = buildExplanationRefinementPrompt(meta!);
      expect(prompt).toContain("assistant-1");
      expect(prompt).toContain("这是一段回答片段");
      expect(prompt).toContain("当前会话");
      expect(prompt).toContain("无法确认");
    }
  });

  test("非法元数据与空片段降级为普通消息，片段有界到 1000 字", () => {
    expect(normalizeExplanationRefinementMeta({ mode: "unknown" })).toBeUndefined();
    expect(
      createExplanationRefinementMeta({
        mode: "simpler",
        targetAssistantMessageId: "",
        targetExcerpt: "回答",
      })
    ).toBeUndefined();
    const meta = createExplanationRefinementMeta({
      mode: "simpler",
      targetAssistantMessageId: "assistant-1",
      targetExcerpt: `  ${"很长的回答。".repeat(400)}  `,
    });
    expect(meta?.targetExcerpt.length).toBe(1000);
    expect(
      materializeExplanationRefinementMessage({
        role: "user" as const,
        content: "这里没看懂：再白一点",
        refinementMeta: { mode: "unknown" },
      })
    ).toEqual({
      role: "user",
      content: "这里没看懂：再白一点",
      refinementMeta: { mode: "unknown" },
    });
  });

  test("物化只改变发送时正文，持久化短文案和网页上下文仍独立", () => {
    const meta = createExplanationRefinementMeta({
      mode: "source-walkthrough",
      targetAssistantMessageId: "assistant-2",
      sourceUserMessageId: "user-2",
      targetExcerpt: "原文片段：先收集证据，再下结论。",
    })!;
    const message = {
      id: "refinement-user",
      role: "user" as const,
      content: "这里没看懂：按原文逐句讲",
      refinementMeta: meta,
      createdAt: 1,
      status: "completed" as const,
      selectionContext: {
        selectedText: "证据",
        paragraph: "当前段落",
      },
    };
    const materialized = materializeExplanationRefinementMessage(message);
    expect(message.content).toBe("这里没看懂：按原文逐句讲");
    expect(materialized.content).toContain("原文片段：先收集证据");
    expect(materialized.content).toContain("当前会话");
    expect(materialized.selectionContext).toEqual(message.selectionContext);
  });
});
