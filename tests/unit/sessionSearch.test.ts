import { describe, expect, test } from "bun:test";
import {
  createSessionSearchIndex,
  searchSessionMessages,
} from "../../entrypoints/shared/sessionSearch.ts";
import type { ChatSession } from "../../entrypoints/shared/chatTypes.ts";

function session(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: "session-1",
    title: "浏览器扩展性能优化",
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_010_000,
    messages: [
      {
        id: "message-1",
        role: "user",
        content: "如何降低浏览器扩展的启动耗时？",
        createdAt: 1_700_000_001_000,
      },
      {
        id: "message-2",
        role: "assistant",
        content: "可以延迟加载低频模块，并减少首屏需要解析的代码。",
        createdAt: 1_700_000_002_000,
      },
    ],
    ...overrides,
  };
}

describe("session search core", () => {
  test("仅回答出现关键词时也返回带稳定消息 ID 的回答命中", () => {
    const index = createSessionSearchIndex([
      session({
        title: "一个不相关的标题",
        messages: [
          {
            id: "answer-1",
            role: "assistant",
            content: "答案里解释了 hydration：它会把服务端 HTML 接回客户端交互。",
            createdAt: 1_700_000_002_000,
          },
        ],
      }),
    ]);

    const hits = searchSessionMessages(index, "hydration");

    expect(hits[0]).toMatchObject({
      sessionId: "session-1",
      messageId: "answer-1",
      role: "assistant",
    });
    expect(hits[0]?.snippet).toContain("hydration");
  });

  test("助手隐藏引用块不参与会话搜索或结果摘要", () => {
    const rawAnswer = [
      "可见结论：本周先修复支付失败率。",
      "<!-- human-text-evidence:v1",
      '{"citations":[{"id":"E1","segmentIndex":2,"quote":"协议内唯一搜索词如何处理"}]}',
      "-->",
    ].join("\n");
    const index = createSessionSearchIndex([
      session({
        messages: [
          {
            id: "grounded-answer",
            role: "assistant",
            content: rawAnswer,
            createdAt: 1_700_000_002_000,
          },
        ],
      }),
    ]);

    const visibleHits = searchSessionMessages(index, "支付失败率");
    expect(visibleHits[0]?.snippet).toContain("可见结论");
    expect(visibleHits[0]?.snippet).not.toContain("human-text-evidence:v1");
    expect(searchSessionMessages(index, "协议内唯一搜索词")).toEqual([]);
    expect(searchSessionMessages(index, "citations")).toEqual([]);
  });

  test("每个会话标题只生成一个标题命中，消息标题不会重复参与索引", () => {
    const index = createSessionSearchIndex([
      session({
        title: "React 性能排查",
        messages: [
          {
            id: "m1",
            role: "user",
            content: "React 性能排查第一步做什么？",
            createdAt: 1_700_000_001_000,
          },
          {
            id: "m2",
            role: "assistant",
            content: "React 性能排查可以先看渲染次数。",
            createdAt: 1_700_000_002_000,
          },
        ],
      }),
    ]);

    const hits = searchSessionMessages(index, "React 性能排查");

    expect(hits.filter((hit) => hit.role === "title")).toHaveLength(1);
    expect(hits.filter((hit) => hit.role !== "title")).toHaveLength(2);
  });

  test("关键词位于长回答后部时，片段仍围绕命中位置生成", () => {
    const tailKeyword = "tail-marker-稳定命中";
    const content = `${"前置说明。".repeat(40)} ${tailKeyword}。这是关键词之后的补充。`;
    const index = createSessionSearchIndex([
      session({
        messages: [
          {
            id: "long-answer",
            role: "assistant",
            content,
            createdAt: 1_700_000_002_000,
          },
        ],
      }),
    ]);

    const [hit] = searchSessionMessages(index, tailKeyword);

    expect(hit?.snippet).toContain(tailKeyword);
    expect(hit?.snippet.length).toBeLessThanOrEqual(138);
  });

  test("长回答内重复关键词相距很远时，片段仍包含真实命中", () => {
    const keyword = "needle-重复命中";
    const content = `${keyword}${"中间内容。".repeat(120)}${keyword}`;
    const index = createSessionSearchIndex([
      session({
        messages: [
          {
            id: "repeated-answer",
            role: "assistant",
            content,
            createdAt: 1_700_000_002_000,
          },
        ],
      }),
    ]);

    const [hit] = searchSessionMessages(index, keyword);

    expect(hit?.messageId).toBe("repeated-answer");
    expect(hit?.snippet).toContain(keyword);
    expect(hit?.snippet.length).toBeLessThanOrEqual(138);
  });

  test("前文只有零散查询字符时，片段优先定位后文完整关键词", () => {
    const keyword = "needle";
    const content = `n e e d l e ${"前文。".repeat(80)}${keyword} 完整命中后的说明。`;
    const index = createSessionSearchIndex([
      session({
        messages: [
          {
            id: "scattered-before-exact",
            role: "assistant",
            content,
            createdAt: 1_700_000_002_000,
          },
        ],
      }),
    ]);

    const [hit] = searchSessionMessages(index, "NEEDLE");

    expect(hit?.messageId).toBe("scattered-before-exact");
    expect(hit?.snippet).toContain(keyword);
    expect(hit?.snippet).not.toContain("n e e d l e");
    expect(hit?.snippet.length).toBeLessThanOrEqual(138);
  });

  test("空白查询返回空结果", () => {
    const index = createSessionSearchIndex([session()]);

    expect(searchSessionMessages(index, "   \n\t")).toEqual([]);
  });

  test("限制数量，并安全跳过重复、异常、非字符串和图片数据", () => {
    const valid = session({
      messages: [
        {
          id: "same-message",
          role: "user",
          content: "duplicate keyword",
          createdAt: 1_700_000_001_000,
        },
        {
          id: "image-message",
          role: "assistant",
          content: "data:image/png;base64,AAAAABBBBBCCCCCDDDD",
          createdAt: 1_700_000_002_000,
        },
      ],
    });
    const malformed = {
      ...valid,
      title: 42,
      messages: [
        ...(valid.messages ?? []),
        null,
        { id: "bad-content", role: "assistant", content: { text: "keyword" } },
      ],
    } as unknown as ChatSession;

    const index = createSessionSearchIndex([valid, malformed]);
    const hits = searchSessionMessages(index, "keyword", 1);

    expect(hits).toHaveLength(1);
    expect(hits[0]).toEqual({
      sessionId: "session-1",
      sessionTitle: "浏览器扩展性能优化",
      messageId: "same-message",
      role: "user",
      snippet: "duplicate keyword",
      updatedAt: 1_700_000_010_000,
    });
    expect(searchSessionMessages(index, "AAAAABBBBB")).toEqual([]);
  });
});
