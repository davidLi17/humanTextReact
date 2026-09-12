import { describe, expect, test } from "bun:test";
import type { ChatMessage } from "../../entrypoints/shared/chatTypes";
import {
  ATTACHED_PAGE_SEGMENT_CHARS,
  createAttachedPageMeta,
  selectAttachedPageSegments,
} from "../../entrypoints/shared/pageContext";
import {
  normalizeGroundedGoalMeta,
  parseGroundedGoalResult,
  prepareGroundedGoalRequest,
  stripGroundedEvidenceBlock,
} from "../../entrypoints/shared/groundedGoal";

const FIRST_SEGMENT = "第一段不应进入请求。".padEnd(
  ATTACHED_PAGE_SEGMENT_CHARS,
  "甲"
);
const SECOND_SEGMENT =
  "第二段：团队本季度应优先修复支付失败率，并在九月底前完成灰度。";

function pageMessage(selectedSegments: number[] = [2]): ChatMessage {
  const initialMeta = createAttachedPageMeta({
    title: "季度规划",
    url: "https://example.com/plan",
    content: FIRST_SEGMENT + SECOND_SEGMENT,
  });
  return {
    id: "page-1",
    role: "user",
    content: "已附加网页",
    pageMeta: selectAttachedPageSegments(initialMeta, selectedSegments),
    createdAt: 1,
    status: "completed",
  };
}

function evidenceBlock(citations: unknown): string {
  return `<!-- human-text-evidence:v1\n${JSON.stringify({ citations })}\n-->`;
}

describe("基于单页选段提取目标信息", () => {
  test("首次请求冻结后段，并只构造 system、选中原文和目标", () => {
    const page = pageMessage([2]);
    const result = prepareGroundedGoalRequest(
      [page, { id: "noise", role: "assistant", content: "其他历史回答", createdAt: 2 }],
      page.id,
      "  找出本季度最急的行动  "
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.messages).toHaveLength(2);
    expect(result.messages.map((message) => message.role)).toEqual(["system", "user"]);
    expect(result.messages[1].content).toContain("找出本季度最急的行动");
    expect(result.messages[1].content).toContain(SECOND_SEGMENT);
    expect(result.messages[1].content).not.toContain("第一段不应进入请求");
    expect(result.messages[1].content).not.toContain("其他历史回答");
    expect(result.meta).toMatchObject({
      version: 1,
      goal: "找出本季度最急的行动",
      sourcePageMessageId: "page-1",
      selectedSegments: [
        {
          index: 2,
          start: ATTACHED_PAGE_SEGMENT_CHARS,
          end: ATTACHED_PAGE_SEGMENT_CHARS + SECOND_SEGMENT.length,
        },
      ],
    });
    expect("content" in result.meta.selectedSegments[0]).toBe(false);
  });

  test("重试使用已冻结范围，忽略网页卡片后来改过的勾选", () => {
    const original = pageMessage([2]);
    const first = prepareGroundedGoalRequest([original], original.id, "找行动");
    expect(first.success).toBe(true);
    if (!first.success) return;

    const changedSelection: ChatMessage = {
      ...original,
      pageMeta: selectAttachedPageSegments(original.pageMeta!, [1]),
    };
    const retry = prepareGroundedGoalRequest(
      [changedSelection],
      original.id,
      "找行动",
      first.meta
    );

    expect(retry.success).toBe(true);
    if (!retry.success) return;
    expect(retry.messages[1].content).toContain(SECOND_SEGMENT);
    expect(retry.messages[1].content).not.toContain("第一段不应进入请求");
    expect(retry.meta.selectedSegments).toEqual(first.meta.selectedSegments);
  });

  test("拒绝无来源、非背景网页、无选段和超长目标", () => {
    expect(
      prepareGroundedGoalRequest([], "missing", "找行动")
    ).toMatchObject({ success: false });

    const nonContext = pageMessage([2]);
    nonContext.pageMeta = { ...nonContext.pageMeta!, contextOnly: false };
    expect(
      prepareGroundedGoalRequest([nonContext], nonContext.id, "找行动")
    ).toMatchObject({ success: false });

    const empty = pageMessage([]);
    expect(
      prepareGroundedGoalRequest([empty], empty.id, "找行动")
    ).toMatchObject({ success: false });
    expect(
      prepareGroundedGoalRequest([pageMessage()], "page-1", "目".repeat(501))
    ).toMatchObject({ success: false });
  });

  test("重试时原文快照变化会使冻结来源失效", () => {
    const original = pageMessage([2]);
    const first = prepareGroundedGoalRequest([original], original.id, "找行动");
    expect(first.success).toBe(true);
    if (!first.success) return;

    const changed = structuredClone(original);
    changed.pageMeta!.attachedPage!.content += "后来追加的内容";
    expect(
      prepareGroundedGoalRequest([changed], changed.id, "找行动", first.meta)
    ).toEqual(expect.objectContaining({ success: false }));
  });

  test("normalize 拒绝非法、重复和越界元数据", () => {
    const valid = prepareGroundedGoalRequest([pageMessage()], "page-1", "找行动");
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(normalizeGroundedGoalMeta(valid.meta)).toEqual(valid.meta);

    expect(normalizeGroundedGoalMeta({ ...valid.meta, goal: "目".repeat(501) })).toBeUndefined();
    expect(
      normalizeGroundedGoalMeta({
        ...valid.meta,
        sourcePageMessageId: "x".repeat(129),
      })
    ).toBeUndefined();
    expect(
      normalizeGroundedGoalMeta({
        ...valid.meta,
        selectedSegments: [
          valid.meta.selectedSegments[0],
          valid.meta.selectedSegments[0],
        ],
      })
    ).toBeUndefined();
    expect(
      normalizeGroundedGoalMeta({
        ...valid.meta,
        selectedSegments: [{ ...valid.meta.selectedSegments[0], index: 999 }],
      })
    ).toBeUndefined();
  });

  test("只核实选中段内的逐字引文，并统计伪造、非选段和非法 ID", () => {
    const page = pageMessage([2]);
    const prepared = prepareGroundedGoalRequest([page], page.id, "找行动");
    expect(prepared.success).toBe(true);
    if (!prepared.success) return;

    const raw = [
      "建议优先处理支付问题。[依据:E1]",
      "",
      evidenceBlock([
        { id: "E1", segmentIndex: 2, quote: "应优先修复支付失败率" },
        { id: "E2", segmentIndex: 1, quote: "第一段不应进入请求" },
        { id: "E3", segmentIndex: 2, quote: "原文里并不存在" },
        { id: "DROP", segmentIndex: 2, quote: "九月底前完成灰度" },
        { id: "E4", segmentIndex: 2, quote: "短" },
      ]),
    ].join("\n");
    const parsed = parseGroundedGoalResult(raw, prepared.meta, [page]);

    expect(parsed.content).toBe("建议优先处理支付问题。[依据:E1]");
    expect(parsed.citations).toEqual([
      expect.objectContaining({
        id: "E1",
        segmentIndex: 2,
        quote: "应优先修复支付失败率",
        startOffset: SECOND_SEGMENT.indexOf("应优先修复支付失败率"),
        segmentContent: SECOND_SEGMENT,
      }),
    ]);
    expect(parsed.citations[0].endOffset).toBe(
      parsed.citations[0].startOffset + parsed.citations[0].quote.length
    );
    expect(parsed.source).toEqual({
      title: "季度规划",
      url: "https://example.com/plan",
    });
    expect(parsed.unverifiedCount).toBe(4);
  });

  test("来源快照变化后不再返回核实入口", () => {
    const page = pageMessage([2]);
    const prepared = prepareGroundedGoalRequest([page], page.id, "找行动");
    expect(prepared.success).toBe(true);
    if (!prepared.success) return;
    const changed = structuredClone(page);
    changed.pageMeta!.attachedPage!.content += "变更";

    const parsed = parseGroundedGoalResult(
      `回答\n${evidenceBlock([{ id: "E1", segmentIndex: 2, quote: "应优先修复支付失败率" }])}`,
      prepared.meta,
      [changed]
    );
    expect(parsed.content).toBe("回答");
    expect(parsed.citations).toEqual([]);
    expect(parsed.source).toBeUndefined();
    expect(parsed.unverifiedCount).toBe(1);
  });

  test("非法 meta、损坏 JSON 和未闭合尾块都不会泄露内部协议", () => {
    const page = pageMessage([2]);
    const unclosed = "可读回答\n<!-- human-text-evidence:v1\n{坏掉的 JSON";
    expect(stripGroundedEvidenceBlock(unclosed)).toBe("可读回答");
    expect(stripGroundedEvidenceBlock(`可读回答\n${evidenceBlock([])}`)).toBe(
      "可读回答"
    );

    expect(parseGroundedGoalResult(unclosed, {}, [page])).toEqual({
      content: "可读回答",
      citations: [],
      unverifiedCount: 0,
    });
  });

  test("没有隐藏引用块时保留普通内容原字符串", () => {
    const ordinary = "普通回答末尾空白\n  ";
    expect(stripGroundedEvidenceBlock(ordinary)).toBe(ordinary);
  });
});
