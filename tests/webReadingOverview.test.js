import { describe, expect, test } from "bun:test";
import {
  WEB_READING_OVERVIEW_MAX_INPUT_CHARS,
  WEB_READING_OVERVIEW_STALE_MESSAGE,
  WEB_READING_OVERVIEW_SYSTEM_PROMPT,
  WEB_READING_OVERVIEW_TOO_LONG_MESSAGE,
  deriveCompletedReadingRun,
  getWebReadingOverviewActions,
  prepareWebReadingOverviewRequest,
} from "../entrypoints/shared/webReadingOverview.ts";

function segment(runId, index, total, options = {}) {
  const title = options.title ?? "长文章";
  const url = options.url ?? "https://example.com/article";
  const user = {
    id: `user-${runId}-${index}`,
    role: "user",
    content: `第 ${index} 段`,
    pageMeta: {
      title,
      url,
      isWebPageReading: true,
      readingRunId: runId,
      segmentIndex: index,
      totalSegments: total,
      sourceContent: options.sourceContent ?? `原文-${runId}-${index}`,
    },
    createdAt: index * 2,
    status: "completed",
  };
  const assistant = {
    id: options.assistantId ?? `assistant-${runId}-${index}`,
    role: "assistant",
    content: options.assistantContent ?? `解读-${runId}-${index}`,
    createdAt: index * 2 + 1,
    status: options.status ?? "completed",
    errorMessage: options.errorMessage,
  };
  return [user, assistant];
}

describe("网页全文总览", () => {
  test("只在同一 readingRunId 的 1..N 段全部成功后开放末段入口", () => {
    const messages = [
      ...segment("run-a", 1, 3),
      { id: "normal-u", role: "user", content: "普通追问", createdAt: 7, status: "completed" },
      { id: "normal-a", role: "assistant", content: "普通回答", createdAt: 8, status: "completed" },
      ...segment("run-a", 2, 3),
      ...segment("run-a", 3, 3),
    ];
    const completed = deriveCompletedReadingRun(messages, "run-a");
    expect(completed.success).toBe(true);
    expect(completed.run.segments.map((item) => item.segmentIndex)).toEqual([1, 2, 3]);
    expect(getWebReadingOverviewActions(messages).get("assistant-run-a-3")?.label).toBe("生成全文总览");
    expect(getWebReadingOverviewActions(messages).has("assistant-run-a-2")).toBe(false);
  });

  test("缺段、重复段、空原文和未完成助手都不能冒充完整阅读", () => {
    expect(deriveCompletedReadingRun([...segment("missing", 1, 2)], "missing").success).toBe(false);
    expect(deriveCompletedReadingRun([...segment("dup", 1, 1), ...segment("dup", 1, 1)], "dup").success).toBe(false);
    expect(deriveCompletedReadingRun([...segment("empty", 1, 1, { sourceContent: " " })], "empty").success).toBe(false);
    expect(deriveCompletedReadingRun([...segment("pending", 1, 1, { status: "streaming" })], "pending").success).toBe(false);

    const inconsistent = [
      ...segment("mixed", 1, 2),
      ...segment("mixed", 2, 2, { title: "另一个标题" }),
    ];
    expect(deriveCompletedReadingRun(inconsistent, "mixed").success).toBe(false);
    expect(
      deriveCompletedReadingRun(
        [...segment("url", 1, 1, { url: " " })],
        "url"
      ).success
    ).toBe(false);
  });

  test("恢复数据中的非字符串标题、原文或回答不会让自动资格扫描崩溃", () => {
    const invalidTitle = segment("title", 1, 1);
    invalidTitle[0].pageMeta.title = null;
    const invalidSource = segment("source", 1, 1);
    invalidSource[0].pageMeta.sourceContent = { bad: true };
    const invalidAnswer = segment("answer", 1, 1);
    invalidAnswer[1].content = ["bad"];
    const invalidRun = segment("run", 1, 1);
    invalidRun[0].pageMeta.readingRunId = { bad: true };
    const invalidOverviewAnswer = [
      ...segment("overview", 1, 1),
      {
        id: "overview-user",
        role: "user",
        content: "生成全文总览",
        overviewMeta: {
          readingRunId: "overview",
          sourceFingerprint: "old",
        },
        createdAt: 3,
        status: "completed",
      },
      {
        id: "overview-answer",
        role: "assistant",
        content: { bad: true },
        createdAt: 4,
        status: "completed",
      },
    ];

    expect(() => getWebReadingOverviewActions(invalidTitle)).not.toThrow();
    expect(() => getWebReadingOverviewActions(invalidSource)).not.toThrow();
    expect(() => getWebReadingOverviewActions(invalidAnswer)).not.toThrow();
    expect(() => getWebReadingOverviewActions(invalidRun)).not.toThrow();
    expect(() =>
      getWebReadingOverviewActions(invalidOverviewAnswer)
    ).not.toThrow();
    expect(getWebReadingOverviewActions(invalidTitle).size).toBe(0);
    expect(getWebReadingOverviewActions(invalidSource).size).toBe(0);
    expect(getWebReadingOverviewActions(invalidAnswer).size).toBe(0);
    expect(getWebReadingOverviewActions(invalidRun).size).toBe(0);
  });

  test("同 URL 的多次阅读按 readingRunId 隔离，旧版无 run 消息不参与", () => {
    const messages = [
      ...segment("run-a", 1, 1, { assistantContent: "第一次" }),
      ...segment("run-b", 1, 1, { assistantContent: "第二次" }),
      {
        ...segment("legacy", 1, 1)[0],
        id: "legacy-user",
        pageMeta: {
          ...segment("legacy", 1, 1)[0].pageMeta,
          readingRunId: undefined,
        },
      },
      { id: "legacy-assistant", role: "assistant", content: "旧回答", createdAt: 20, status: "completed" },
    ];
    const first = deriveCompletedReadingRun(messages, "run-a");
    const second = deriveCompletedReadingRun(messages, "run-b");
    expect(first.success && first.run.segments[0].assistantContent).toBe("第一次");
    expect(second.success && second.run.segments[0].assistantContent).toBe("第二次");
    expect(getWebReadingOverviewActions(messages).size).toBe(2);
  });

  test("专用请求只有静态 system 和一条按段排序的 user，不携带原文与普通历史", () => {
    const messages = [
      ...segment("run", 2, 2, { sourceContent: "绝密原文二", assistantContent: "结果二" }),
      ...segment("run", 1, 2, { sourceContent: "绝密原文一", assistantContent: "结果一" }),
      { id: "chat-u", role: "user", content: "别的追问", createdAt: 30, status: "completed" },
      { id: "chat-a", role: "assistant", content: "别的回答", createdAt: 31, status: "completed" },
    ];
    const request = prepareWebReadingOverviewRequest(messages, "run");
    expect(request.success).toBe(true);
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].content).toBe(WEB_READING_OVERVIEW_SYSTEM_PROMPT);
    const payload = request.messages[1].content;
    expect(payload.indexOf("结果一")).toBeLessThan(payload.indexOf("结果二"));
    expect(payload).not.toContain("绝密原文");
    expect(payload).not.toContain("别的追问");
    expect(payload).not.toContain("别的回答");
  });

  test("48,000 字符硬上限包含 system 和段标签，超出后不截断且不返回请求", () => {
    const overheadRequest = prepareWebReadingOverviewRequest(
      [...segment("small", 1, 1, { assistantContent: "x" })],
      "small"
    );
    expect(overheadRequest.success).toBe(true);
    const overhead = overheadRequest.inputChars - 1;
    const exact = prepareWebReadingOverviewRequest(
      [...segment("exact", 1, 1, { assistantContent: "x".repeat(WEB_READING_OVERVIEW_MAX_INPUT_CHARS - overhead) })],
      "exact"
    );
    expect(exact.success).toBe(true);
    expect(exact.inputChars).toBe(WEB_READING_OVERVIEW_MAX_INPUT_CHARS);

    const tooLong = prepareWebReadingOverviewRequest(
      [...segment("long", 1, 1, { assistantContent: "x".repeat(WEB_READING_OVERVIEW_MAX_INPUT_CHARS - overhead + 1) })],
      "long"
    );
    expect(tooLong).toEqual({ success: false, error: WEB_READING_OVERVIEW_TOO_LONG_MESSAGE });
  });

  test("分段内容或助手 ID 变化会使旧 fingerprint 失效，专用重试被拒绝", () => {
    const original = [...segment("run", 1, 1)];
    const prepared = prepareWebReadingOverviewRequest(original, "run");
    expect(prepared.success).toBe(true);
    const changed = original.map((message) =>
      message.role === "assistant" ? { ...message, id: "assistant-new", content: "新结果" } : message
    );
    expect(
      prepareWebReadingOverviewRequest(changed, "run", prepared.meta.sourceFingerprint)
    ).toEqual({ success: false, error: WEB_READING_OVERVIEW_STALE_MESSAGE });
  });

  test("资格计算只返回动作数据，不产生总览消息或自动请求副作用", () => {
    const messages = [...segment("run", 1, 1)];
    const snapshot = JSON.stringify(messages);
    const actions = getWebReadingOverviewActions(messages);
    expect(actions.size).toBe(1);
    expect(JSON.stringify(messages)).toBe(snapshot);
    expect(messages.some((message) => message.overviewMeta)).toBe(false);
  });
});
