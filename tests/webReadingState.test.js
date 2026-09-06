import { describe, expect, test } from "bun:test";
import { MAX_PAGE_CONTENT_CHARS } from "../entrypoints/shared/webReadingPrompt.ts";
import {
  WEB_READING_REPLAY_MISSING_MESSAGE,
  beginWebReadingSegment,
  buildReplayableWebReadingPrompt,
  buildWebReadingHistoryPayload,
  cancelWebReadingProgressByRequest,
  createInitialWebReadingProgress,
  createWebReadingPageMeta,
  getActiveSidepanelRequestOwner,
  invalidateActiveSidepanelRequest,
  isWebReadingContinueReady,
  rewindWebReadingProgressForReplay,
  settleWebReadingSegment,
  shouldShowWebReadingContinue,
} from "../entrypoints/shared/webReadingState.ts";

const createMessage = (pageMeta) => ({
  id: "user-1",
  role: "user",
  content: "网页卡片展示文案",
  pageMeta,
  createdAt: 1,
  status: "completed",
});

describe("网页通读持久化与重放", () => {
  test("首段只保存有界原文，structuredClone 往返后仍按原文重放", () => {
    const original = `首段真实正文-${"甲".repeat(MAX_PAGE_CONTENT_CHARS + 20)}`;
    const pageMeta = createWebReadingPageMeta(
      {
        title: "测试文章",
        url: "https://example.com/article",
        content: original,
        excerpt: "保留的摘要",
        wordCount: original.length,
      },
      { segmentIndex: 1, totalSegments: 2 }
    );
    const restoredMessage = structuredClone(createMessage(pageMeta));
    const replay = buildReplayableWebReadingPrompt(restoredMessage);

    expect(restoredMessage.pageMeta.sourceContent).toHaveLength(
      MAX_PAGE_CONTENT_CHARS
    );
    expect(restoredMessage.pageMeta.excerpt).toBe("保留的摘要");
    expect(replay.success).toBe(true);
    expect(replay.prompt).toContain(restoredMessage.pageMeta.sourceContent);
    expect(replay.prompt).not.toContain("网页卡片展示文案");
  });

  test("续段往返后沿用段落提示与用户补充指令", () => {
    const pageMeta = createWebReadingPageMeta(
      {
        title: "测试文章",
        url: "https://example.com/article",
        content: "第二段真实正文",
      },
      {
        segmentIndex: 2,
        totalSegments: 3,
        userInstruction: "重点解释第二段里的成本",
      }
    );
    const replay = buildReplayableWebReadingPrompt(
      structuredClone(createMessage(pageMeta))
    );

    expect(replay.success).toBe(true);
    expect(replay.prompt).toContain("第 2 段 / 共约 3 段");
    expect(replay.prompt).toContain("第二段真实正文");
    expect(replay.prompt).toContain("重点解释第二段里的成本");

    const history = buildWebReadingHistoryPayload([
      structuredClone(createMessage(pageMeta)),
      {
        id: "assistant-2",
        role: "assistant",
        content: "第二段回答",
        createdAt: 2,
      },
    ]);
    expect(history[0].content).toContain("第 2 段 / 共约 3 段");
    expect(history[0].content).toContain("第二段真实正文");
  });

  test("旧记录缺少原文时明确要求重新通读", () => {
    const replay = buildReplayableWebReadingPrompt(
      createMessage({
        title: "旧文章",
        url: "https://example.com/old",
        excerpt: "只有摘要",
        isWebPageReading: true,
      })
    );

    expect(replay).toEqual({
      success: false,
      error: WEB_READING_REPLAY_MISSING_MESSAGE,
    });
  });
});

describe("网页续读进度提交", () => {
  const makeInitial = () =>
    createInitialWebReadingProgress({
      page: {
        title: "长文章",
        url: "https://example.com/long",
        content: "长".repeat(MAX_PAGE_CONTENT_CHARS * 2 + 10),
      },
      totalSegments: 3,
      requestId: "request-1",
      assistantMessageId: "assistant-1",
    });

  test.each([
    ["业务失败", { success: false, result: "失败" }],
    ["取消或 reject", undefined],
    ["空结果", { success: true, result: "   " }],
  ])("%s 不推进首段", (_label, response) => {
    const settled = settleWebReadingSegment(
      makeInitial(),
      "request-1",
      response
    );

    expect(settled.segmentIndex).toBe(1);
    expect(settled.nextStart).toBe(0);
    expect(settled.pendingRequestId).toBeUndefined();
  });

  test("失败后重试成功推进，末段成功后清理", () => {
    const failed = settleWebReadingSegment(makeInitial(), "request-1", {
      success: false,
    });
    const retried = beginWebReadingSegment(failed, {
      requestId: "request-retry",
      segmentIndex: 1,
      nextStart: MAX_PAGE_CONTENT_CHARS,
      assistantMessageId: "assistant-1",
    });
    const afterFirst = settleWebReadingSegment(retried, "request-retry", {
      success: true,
      result: "首段成功结果",
    });
    expect(afterFirst.segmentIndex).toBe(2);

    const secondPending = beginWebReadingSegment(afterFirst, {
      requestId: "request-2",
      segmentIndex: 2,
      nextStart: MAX_PAGE_CONTENT_CHARS * 2,
      assistantMessageId: "assistant-2",
    });
    const afterSecond = settleWebReadingSegment(secondPending, "request-2", {
      success: true,
      result: "第二段成功结果",
    });
    expect(afterSecond.segmentIndex).toBe(3);
    expect(afterSecond.lastAssistantMessageId).toBe("assistant-2");

    const lastPending = beginWebReadingSegment(afterSecond, {
      requestId: "request-3",
      segmentIndex: 3,
      nextStart: afterSecond.fullContent.length,
      assistantMessageId: "assistant-3",
    });
    expect(
      settleWebReadingSegment(lastPending, "request-3", {
        success: true,
        result: "末段成功结果",
      })
    ).toBeNull();
  });

  test("迟到的旧请求响应不能改写新请求进度", () => {
    const current = beginWebReadingSegment(
      settleWebReadingSegment(makeInitial(), "request-1", { success: false }),
      {
        requestId: "request-new",
        segmentIndex: 1,
        nextStart: MAX_PAGE_CONTENT_CHARS,
        assistantMessageId: "assistant-new",
      }
    );

    expect(
      settleWebReadingSegment(current, "request-old", {
        success: true,
        result: "迟到结果",
      })
    ).toBe(current);
  });

  test("取消先失效旧 pending，受控旧成功响应晚到后不推进新请求", async () => {
    let resolveOldResponse;
    const oldResponsePromise = new Promise((resolve) => {
      resolveOldResponse = resolve;
    });
    const owner = {
      requestId: "request-1",
      sessionId: "session-a",
      assistantMessageId: "assistant-1",
    };
    expect(getActiveSidepanelRequestOwner("request-1", owner)).toEqual(owner);
    expect(
      invalidateActiveSidepanelRequest(
        {
          activeRequestId: "request-new",
          owner: { ...owner, requestId: "request-new" },
        },
        "request-1"
      )
    ).toMatchObject({
      activeRequestId: "request-new",
      invalidated: false,
    });
    const otherSessionProgress = createInitialWebReadingProgress({
      page: {
        title: "另一篇长文章",
        url: "https://example.com/other",
        content: "另".repeat(MAX_PAGE_CONTENT_CHARS + 1),
      },
      totalSegments: 2,
      requestId: "request-other",
      assistantMessageId: "assistant-other",
    });
    const progressMap = new Map([
      ["session-a", makeInitial()],
      ["session-b", otherSessionProgress],
    ]);
    const cancelledMap = cancelWebReadingProgressByRequest(
      progressMap,
      "request-1"
    );
    const cancelled = cancelledMap.get("session-a");
    expect(cancelled.lastAssistantMessageId).toBe("assistant-1");
    const current = beginWebReadingSegment(cancelled, {
      requestId: "request-new",
      segmentIndex: 1,
      nextStart: MAX_PAGE_CONTENT_CHARS,
      assistantMessageId: "assistant-new",
    });

    resolveOldResponse({ success: true, result: "旧请求迟到的成功结果" });
    const afterOldResponse = settleWebReadingSegment(
      current,
      "request-1",
      await oldResponsePromise
    );

    expect(afterOldResponse).toBe(current);
    expect(afterOldResponse.segmentIndex).toBe(1);
    expect(afterOldResponse.pendingRequestId).toBe("request-new");
    expect(cancelledMap.get("session-b")).toBe(otherSessionProgress);
  });

  test("done 先到但 response 未结算时继续入口与处理门禁都保持关闭", () => {
    const pending = makeInitial();
    const completedAssistant = { id: "assistant-1", status: "completed" };

    expect(isWebReadingContinueReady(pending)).toBe(false);
    expect(
      shouldShowWebReadingContinue(pending, completedAssistant)
    ).toBe(false);

    const settled = settleWebReadingSegment(pending, "request-1", {
      success: true,
      result: "首段有效结果",
    });
    expect(isWebReadingContinueReady(settled)).toBe(true);
    expect(
      shouldShowWebReadingContinue(settled, completedAssistant)
    ).toBe(true);
  });

  test("已读第二段后重放第一段：成功回到第二段，失败保留第一段", () => {
    const afterFirst = settleWebReadingSegment(makeInitial(), "request-1", {
      success: true,
      result: "第一段完成",
    });
    const secondPending = beginWebReadingSegment(afterFirst, {
      requestId: "request-2",
      segmentIndex: 2,
      nextStart: MAX_PAGE_CONTENT_CHARS * 2,
      assistantMessageId: "assistant-2",
    });
    const afterSecond = settleWebReadingSegment(secondPending, "request-2", {
      success: true,
      result: "第二段完成",
    });

    const rewind = (requestId) =>
      rewindWebReadingProgressForReplay(afterSecond, {
        title: "长文章",
        url: "https://example.com/long",
        segmentIndex: 1,
        requestId,
        assistantMessageId: `assistant-${requestId}`,
      });
    const succeeded = settleWebReadingSegment(rewind("edit-success"), "edit-success", {
      success: true,
      result: "编辑后第一段成功",
    });
    const failed = settleWebReadingSegment(rewind("edit-failure"), "edit-failure", {
      success: false,
    });

    expect(succeeded.segmentIndex).toBe(2);
    expect(succeeded.nextStart).toBe(MAX_PAGE_CONTENT_CHARS);
    expect(succeeded.lastAssistantMessageId).toBe("assistant-edit-success");
    expect(failed.segmentIndex).toBe(1);
    expect(failed.nextStart).toBe(0);
    expect(failed.lastAssistantMessageId).toBe("assistant-edit-failure");
    expect(
      rewindWebReadingProgressForReplay(afterSecond, {
        title: "另一篇文章",
        url: "https://example.com/other",
        segmentIndex: 1,
        requestId: "other-edit",
        assistantMessageId: "other-assistant",
      })
    ).toBe(afterSecond);
  });

  test("续段失败绑定失败卡片，上一成功卡片不再展示重复续读入口", () => {
    const afterFirst = settleWebReadingSegment(makeInitial(), "request-1", {
      success: true,
      result: "第一段完成",
    });
    const secondPending = beginWebReadingSegment(afterFirst, {
      requestId: "request-2-failure",
      segmentIndex: 2,
      nextStart: MAX_PAGE_CONTENT_CHARS * 2,
      assistantMessageId: "assistant-2-failure",
    });
    const failed = settleWebReadingSegment(
      secondPending,
      "request-2-failure",
      { success: false }
    );

    expect(failed.segmentIndex).toBe(2);
    expect(failed.lastAssistantMessageId).toBe("assistant-2-failure");
    expect(
      shouldShowWebReadingContinue(failed, {
        id: "assistant-1",
        status: "completed",
      })
    ).toBe(false);
    expect(
      shouldShowWebReadingContinue(failed, {
        id: "assistant-2-failure",
        status: "error",
      })
    ).toBe(false);
  });
});
