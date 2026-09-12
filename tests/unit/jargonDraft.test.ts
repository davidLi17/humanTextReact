import { describe, expect, test } from "bun:test";
import {
  buildJargonFollowUpPrompt,
  createJargonDraft,
  createJargonDraftFromMessage,
} from "../../entrypoints/shared/jargonDraft";
import type { ChatSession } from "../../entrypoints/shared/chatTypes";

describe("生词本草稿构建", () => {
  test("三棱镜优先使用直白人话，并保留选区来源", () => {
    const draft = createJargonDraft({
      rawTerm: "原始长问题",
      rawExplanation: [
        "### 🍼 直白人话版",
        "先查资料再回答，就像开卷考试。",
        "### 👔 向上汇报版",
        "构建知识增强闭环。",
      ].join("\n"),
      selectionContext: {
        selectedText: "RAG",
        paragraph: "这段原句说明 RAG 会先查资料。",
        source: { title: "资料页", url: "https://example.com/rag" },
      },
    });

    expect(draft.explanationSource).toBe("vernacular");
    expect(draft.item.term).toBe("RAG");
    expect(draft.item.explanation).toContain("先查资料再回答");
    expect(draft.item.explanation).not.toContain("构建知识增强闭环");
    expect(draft.item.sourceContext).toBe("这段原句说明 RAG 会先查资料。");
    expect(draft.item.sourceUrl).toBe("https://example.com/rag");
    expect(draft.item.category).toBe("AI技术");
  });

  test("直白版为空时使用完整原译文，保留完整解释内容", () => {
    const raw = "### 🍼 直白人话版\n\n### 👔 向上汇报版\n完整输出内容";
    const draft = createJargonDraft({ rawTerm: "闭环", rawExplanation: raw });

    expect(draft.explanationSource).toBe("full");
    expect(draft.item.explanation).toBe(raw);
  });

  test("普通回答的完整原译文标记为 full", () => {
    const draft = createJargonDraft({
      rawTerm: "增长飞轮",
      rawExplanation: "通过循环积累让增长越来越快。",
    });

    expect(draft.explanationSource).toBe("full");
  });

  test("从助手消息只关联此前最近用户消息，优先复用明确选区", () => {
    const session: ChatSession = {
      id: "session-1",
      title: "会话",
      createdAt: 1,
      updatedAt: 2,
      messages: [
        {
          id: "old-user",
          role: "user",
          content: "旧问题",
          createdAt: 1,
          status: "completed",
        },
        {
          id: "target-user",
          role: "user",
          content: "请解释 RAG",
          selectionContext: {
            selectedText: "RAG",
            paragraph: "当前段落里的 RAG 会检索资料。",
            source: { url: "https://example.com/context" },
          },
          createdAt: 2,
          status: "completed",
        },
        {
          id: "target-answer",
          role: "assistant",
          content: "### 🍼 直白人话版\n先查资料再答。",
          createdAt: 3,
          status: "completed",
        },
      ],
    };

    const draft = createJargonDraftFromMessage(session.messages[2], session);
    expect(draft.item.term).toBe("RAG");
    expect(draft.item.sourceContext).toContain("当前段落里的 RAG");
    expect(draft.item.sourceUrl).toBe("https://example.com/context");
  });

  test("普通提问作为原句或提问，未知来源不猜 URL", () => {
    const session: ChatSession = {
      id: "session-2",
      title: "普通问题",
      createdAt: 1,
      updatedAt: 2,
      messages: [
        {
          id: "question",
          role: "user",
          content: "请解释增长飞轮",
          createdAt: 1,
          status: "completed",
        },
        {
          id: "answer",
          role: "assistant",
          content: "通过循环积累让增长越来越快。",
          createdAt: 2,
          status: "completed",
        },
      ],
    };

    const draft = createJargonDraftFromMessage(session.messages[1], session);
    expect(draft.item.term).toBe("增长飞轮");
    expect(draft.item.sourceContext).toBe("请解释增长飞轮");
    expect(draft.item.sourceUrl).toBeUndefined();
  });

  test("网页消息只使用该用户消息明确携带的来源快照", () => {
    const user = {
      id: "web-user",
      role: "user" as const,
      content: "解释网页术语",
      createdAt: 1,
      status: "completed" as const,
      pageMeta: {
        title: "网页",
        url: "https://example.com/article",
        excerpt: "网页中明确保存的原文摘录。",
      },
    };
    const answer = {
      id: "web-answer",
      role: "assistant" as const,
      content: "网页术语的解释。",
      createdAt: 2,
      status: "completed" as const,
    };
    const session: ChatSession = {
      id: "session-3",
      title: "网页会话",
      createdAt: 1,
      updatedAt: 2,
      messages: [user, answer],
    };

    const draft = createJargonDraftFromMessage(answer, session);
    expect(draft.item.term).toBe("网页");
    expect(draft.item.sourceContext).toBe("网页中明确保存的原文摘录。");
    expect(draft.item.sourceUrl).toBe("https://example.com/article");
  });

  test("追问提示为纯文字并过滤危险来源链接", () => {
    const prompt = buildJargonFollowUpPrompt({
      id: "item-1",
      term: "RAG",
      explanation: "先查资料再回答。",
      sourceContext: "原句：RAG 会检索资料。",
      sourceUrl: "javascript:alert(1)",
      category: "AI技术",
      tags: ["AI"],
      isStarred: false,
      createdAt: 1,
      updatedAt: 2,
    });

    expect(prompt).toContain("RAG");
    expect(prompt).toContain("先查资料再回答");
    expect(prompt).toContain("原句：RAG 会检索资料");
    expect(prompt).toContain("我的问题");
    expect(prompt).not.toContain("javascript:");
  });
});
