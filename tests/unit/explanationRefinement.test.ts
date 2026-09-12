import { describe, expect, test } from "bun:test";
import {
  buildExplanationRefinementPrompt,
  createExplanationRefinementMeta,
  getExplanationRefinementLabel,
  materializeExplanationRefinementMessage,
  normalizeExplanationRefinementMeta,
} from "../../entrypoints/shared/explanationRefinement";
import { buildWebReadingHistoryPayload } from "../../entrypoints/shared/webReadingState";

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
    const materialized = materializeExplanationRefinementMessage(message, [
      {
        id: "user-2",
        role: "user",
        content: "请解释证据",
      },
      {
        id: "assistant-2",
        role: "assistant",
        content: "原文片段：先收集证据，再下结论。",
      },
    ]);
    expect(message.content).toBe("这里没看懂：按原文逐句讲");
    expect(materialized.content).toContain("原文片段：先收集证据");
    expect(materialized.content).toContain("当前会话");
    expect(materialized.selectionContext).toEqual(message.selectionContext);
  });

  test("仅物化指向同会话此前助手的用户补讲消息", () => {
    const meta = createExplanationRefinementMeta({
      mode: "simpler",
      targetAssistantMessageId: "assistant-1",
      sourceUserMessageId: "user-1",
      targetExcerpt: "需要补讲的回答",
    })!;
    const preceding = [
      { id: "user-1", role: "user" as const, content: "原问题" },
      {
        id: "assistant-1",
        role: "assistant" as const,
        content: "需要补讲的回答",
      },
    ];
    const userMessage = {
      id: "refinement-user",
      role: "user" as const,
      content: "这里没看懂：再白一点",
      refinementMeta: meta,
    };

    expect(
      materializeExplanationRefinementMessage(userMessage, preceding).content
    ).toContain("需要补讲的回答");
    expect(
      materializeExplanationRefinementMessage(
        { ...userMessage, role: "assistant" as const },
        preceding
      ).content
    ).toBe("这里没看懂：再白一点");
    expect(
      materializeExplanationRefinementMessage(userMessage, []).content
    ).toBe("这里没看懂：再白一点");
    expect(
      materializeExplanationRefinementMessage(userMessage, [
        ...preceding,
        { id: "later-target", role: "assistant" as const, content: "稍后回答" },
      ].filter((message) => message.id !== "assistant-1")).content
    ).toBe("这里没看懂：再白一点");
  });

  test("来源用户必须位于目标助手之前且属于同一段历史", () => {
    const message = {
      role: "user" as const,
      content: "这里没看懂：按原文逐句讲",
      refinementMeta: createExplanationRefinementMeta({
        mode: "source-walkthrough",
        targetAssistantMessageId: "assistant-1",
        sourceUserMessageId: "missing-user",
        targetExcerpt: "回答",
      }),
    };
    expect(
      materializeExplanationRefinementMessage(message, [
        { id: "assistant-1", role: "assistant" as const, content: "回答" },
      ]).content
    ).toBe("这里没看懂：按原文逐句讲");
  });

  test("首次 currentMessage 与刷新后的历史消息使用相同关系校验", () => {
    const targetHistory = [
      {
        id: "source-user",
        role: "user" as const,
        content: "解释原资料",
        createdAt: 1,
      },
      {
        id: "source-answer",
        role: "assistant" as const,
        content: "原回答",
        createdAt: 2,
      },
    ];
    const meta = createExplanationRefinementMeta({
      mode: "context-example",
      targetAssistantMessageId: "source-answer",
      sourceUserMessageId: "source-user",
      targetExcerpt: "原回答",
    })!;
    const currentPayload = buildWebReadingHistoryPayload(targetHistory, {
      role: "user",
      content: "这里没看懂：换个贴合本文的例子",
      refinementMeta: meta,
    });
    const replayPayload = buildWebReadingHistoryPayload([
      ...targetHistory,
      {
        id: "refinement-user",
        role: "user" as const,
        content: "这里没看懂：换个贴合本文的例子",
        refinementMeta: meta,
        createdAt: 3,
      },
    ]);

    expect(currentPayload.at(-1)?.content).toBe(replayPayload.at(-1)?.content);
    expect(String(currentPayload.at(-1)?.content)).toContain("原回答");

    const invalidCurrent = buildWebReadingHistoryPayload([], {
      role: "user",
      content: "保留普通消息",
      refinementMeta: meta,
    });
    expect(invalidCurrent.at(-1)?.content).toBe("保留普通消息");
  });

  test("拒绝超长消息 ID，并在规范化前限制超大片段的扫描范围", () => {
    expect(
      normalizeExplanationRefinementMeta({
        version: 1,
        mode: "simpler",
        targetAssistantMessageId: "a".repeat(129),
        targetExcerpt: "回答",
      })
    ).toBeUndefined();
    expect(
      normalizeExplanationRefinementMeta({
        version: 1,
        mode: "simpler",
        targetAssistantMessageId: "assistant-1",
        sourceUserMessageId: "u".repeat(129),
        targetExcerpt: "回答",
      })
    ).toBeUndefined();
  });
});
