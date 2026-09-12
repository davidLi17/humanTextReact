import { describe, expect, test } from "bun:test";
import {
  ATTACHED_PAGE_SEGMENT_CHARS,
  DEFAULT_CHAT_REQUEST_MAX_CHARS,
  MAX_ATTACHED_PAGE_CHARS,
  buildAttachedPageReplayPrompt,
  checkChatRequestBudget,
  countChatRequestChars,
  createAttachedPageMeta,
  getAttachedPageSnapshot,
  getAttachedPageSegments,
  selectAttachedPageSegments,
} from "../../entrypoints/shared/pageContext.ts";
import { buildReplayableWebReadingPrompt } from "../../entrypoints/shared/webReadingState.ts";
import {
  buildContextualSystemPrompt,
  buildContextualUserText,
  normalizeSelectionContext,
} from "../../entrypoints/shared/selectionContext.ts";

const page = (content: string, hasMoreContent = false) => ({
  title: "长文测试",
  url: "https://example.com/long",
  content,
  hasMoreContent,
});

describe("网页背景快照与段落选择", () => {
  test("保存到容量边界，保留原始采集长度与页面未加载标识", () => {
    const rawContent = "甲".repeat(MAX_ATTACHED_PAGE_CHARS + 20);
    const meta = createAttachedPageMeta(page(rawContent, true));

    expect(meta.attachedPage).toMatchObject({
      version: 1,
      capturedChars: rawContent.length,
      hasMoreContent: true,
      selectedSegments: [1],
    });
    expect(meta.attachedPage?.content).toHaveLength(MAX_ATTACHED_PAGE_CHARS);
    expect(meta.sourceContent).toHaveLength(ATTACHED_PAGE_SEGMENT_CHARS);
    expect(meta.totalSegments).toBe(Math.ceil(MAX_ATTACHED_PAGE_CHARS / ATTACHED_PAGE_SEGMENT_CHARS));
  });

  test("选中末段后重放完整选区，并且不修改原有元数据", () => {
    const content = ["首段", "中段", "末段答案"].map((text) => text.padEnd(ATTACHED_PAGE_SEGMENT_CHARS, text)).join("");
    const original = createAttachedPageMeta(page(content));
    const selected = selectAttachedPageSegments(original, [3]);
    const prompt = buildAttachedPageReplayPrompt(selected);

    expect(getAttachedPageSegments(selected)).toHaveLength(3);
    expect(getAttachedPageSegments(selected)[2]).toMatchObject({
      index: 3,
      start: ATTACHED_PAGE_SEGMENT_CHARS * 2,
      end: ATTACHED_PAGE_SEGMENT_CHARS * 3,
      selected: true,
    });
    expect(prompt).toContain("第 3 段（字符 32001-48000）");
    expect(prompt).toContain("末段答案");
    expect(prompt).not.toContain("【第 1 段（字符 1-16000）】");
    expect(original.attachedPage?.selectedSegments).toEqual([1]);
  });

  test("历史重放使用选中的末段，避免回退到兼容首段", () => {
    const content = "首段内容".padEnd(ATTACHED_PAGE_SEGMENT_CHARS, "甲") + "末段可回放答案";
    const pageMeta = selectAttachedPageSegments(createAttachedPageMeta(page(content)), [2]);
    const replay = buildReplayableWebReadingPrompt({
      id: "webpage-1",
      role: "user",
      content: "网页卡片",
      pageMeta,
      createdAt: 1,
    });

    expect(replay.success).toBe(true);
    if (replay.success) {
      expect(replay.prompt).toContain("末段可回放答案");
      expect(replay.prompt).not.toContain("首段内容");
    }
  });

  test("空选只禁用网页背景，不回退到首段原文", () => {
    const meta = selectAttachedPageSegments(createAttachedPageMeta(page("首段正文")), []);
    const prompt = buildAttachedPageReplayPrompt(meta);

    expect(meta.attachedPage?.selectedSegments).toEqual([]);
    expect(prompt).toContain("已禁用此网页背景资料");
    expect(prompt).not.toContain("首段正文");
  });

  test("旧 sourceContent 可以展示为首段，调整后带 legacyPartial 标识", () => {
    const oldMeta = {
      title: "旧网页",
      url: "https://example.com/old",
      isWebPageReading: true,
      contextOnly: true,
      sourceContent: "旧记录首段正文",
    };
    const beforeSelection = getAttachedPageSegments(oldMeta);
    const selected = selectAttachedPageSegments(oldMeta, [1, 99]);

    expect(beforeSelection).toEqual([
      expect.objectContaining({ index: 1, content: "旧记录首段正文", selected: true }),
    ]);
    expect(selected.attachedPage).toMatchObject({
      legacyPartial: true,
      selectedSegments: [1],
    });
  });

  test("非法新快照回退到有效旧首段，并将旧采集总量保留为未知", () => {
    const malformed = {
      title: "旧网页",
      url: "https://example.com/old",
      isWebPageReading: true,
      contextOnly: true,
      sourceContent: "旧记录首段正文",
      attachedPage: {
        version: 1,
        selectedSegments: 2,
        capturedChars: "未知",
        hasMoreContent: "是",
      },
    } as never;

    const snapshot = getAttachedPageSnapshot(malformed);
    expect(snapshot).toMatchObject({
      content: "旧记录首段正文",
      legacyPartial: true,
      selectedSegments: [1],
    });
    expect(snapshot?.capturedChars).toBeUndefined();
    expect(() => getAttachedPageSegments(malformed)).not.toThrow();
  });

  test("异常选段形状不会发出未选择的正文", () => {
    const malformed = {
      ...createAttachedPageMeta(page("首段公开正文".padEnd(ATTACHED_PAGE_SEGMENT_CHARS, "甲") + "不应被带入")),
      attachedPage: {
        ...createAttachedPageMeta(page("首段公开正文".padEnd(ATTACHED_PAGE_SEGMENT_CHARS, "甲") + "不应被带入")).attachedPage!,
        selectedSegments: 2,
      },
    } as never;

    expect(getAttachedPageSegments(malformed).every((segment) => !segment.selected)).toBe(true);
    expect(buildAttachedPageReplayPrompt(malformed)).toContain("已禁用此网页背景资料");
    expect(buildAttachedPageReplayPrompt(malformed)).not.toContain("不应被带入");
  });

  test("异常标题和来源字段不会阻断有效快照重放", () => {
    const malformed = {
      ...createAttachedPageMeta(page("仍应发送的正文")),
      title: 7,
      url: {},
    } as never;

    expect(() => buildAttachedPageReplayPrompt(malformed)).not.toThrow();
    const prompt = buildAttachedPageReplayPrompt(malformed);
    expect(prompt).toContain("未知网页标题");
    expect(prompt).toContain("仍应发送的正文");

    const replay = buildReplayableWebReadingPrompt({
      id: "malformed-page-meta",
      role: "user",
      content: "网页卡片",
      pageMeta: malformed,
      createdAt: 1,
    });
    expect(replay.success).toBe(true);
    if (replay.success) expect(replay.prompt).toContain("仍应发送的正文");
  });
});

describe("请求字符预算", () => {
  test("计入正文、系统提示和选区包裹，排除图片 base64", () => {
    const selectionContext = {
      selectedText: "重点",
      paragraph: "这是包含重点的当前段落。",
      source: { title: "资料", url: "https://example.com" },
    };
    const messages = [
      { role: "user" as const, content: "请解释", selectionContext },
      {
        role: "assistant" as const,
        content: [
          { type: "image_url" as const, image_url: { url: `data:image/png;base64,${"A".repeat(20_000)}` } },
          { type: "text" as const, text: "历史回答" },
        ],
      },
    ];
    const chars = countChatRequestChars(messages, { systemPrompt: "系统规则" });

    const normalizedContext = normalizeSelectionContext(selectionContext)!;
    expect(chars).toBe(
      buildContextualSystemPrompt("系统规则").length +
        buildContextualUserText("请解释", normalizedContext).length +
        "历史回答".length
    );
  });

  test("超过默认上限时给出可执行的中文处理方式", () => {
    const result = checkChatRequestBudget(
      [{ role: "user", content: "长".repeat(DEFAULT_CHAT_REQUEST_MAX_CHARS + 1) }],
      { maxChars: DEFAULT_CHAT_REQUEST_MAX_CHARS, systemPrompt: "规" }
    );

    expect(result).toMatchObject({
      ok: false,
      chars: DEFAULT_CHAT_REQUEST_MAX_CHARS + 2,
      maxChars: DEFAULT_CHAT_REQUEST_MAX_CHARS,
    });
    expect(result.error).toContain("缩减所选网页段落或新建会话");
  });
});
