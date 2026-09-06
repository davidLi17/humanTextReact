import { describe, expect, test } from "bun:test";
import { MAX_PAGE_CONTENT_CHARS } from "../entrypoints/shared/webReadingPrompt.ts";
import {
  WEB_READING_REPLAY_MISSING_MESSAGE,
  CHAT_INTERRUPTED_MESSAGE,
  WEB_READING_INTERRUPTED_MESSAGE,
  WEB_READING_MAX_PERSISTED_ENTRIES,
  WEB_READING_MAX_SINGLE_CONTENT_CHARS,
  WEB_READING_MAX_TOTAL_CONTENT_CHARS,
  beginWebReadingSegment,
  buildReplayableWebReadingPrompt,
  buildWebReadingHistoryPayload,
  cancelWebReadingProgressByRequest,
  createInitialWebReadingProgress,
  createWebReadingPageMeta,
  getActiveSidepanelRequestOwner,
  hasMatchingWebReadingProgress,
  invalidateActiveSidepanelRequest,
  hydrateWebReadingProgress,
  isWebReadingContinueReady,
  rewindWebReadingProgressForReplay,
  serializeWebReadingProgressMap,
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
      readingRunId: "run-1",
      now: 1,
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
      hasMatchingWebReadingProgress(new Map(), {
        ...owner,
        readingRunId: "run-1",
      })
    ).toBe(false);
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
      readingRunId: "run-other",
      now: 1,
    });
    const progressMap = new Map([
      ["session-a", makeInitial()],
      ["session-b", otherSessionProgress],
    ]);
    expect(
      hasMatchingWebReadingProgress(progressMap, {
        ...owner,
        readingRunId: "run-1",
      })
    ).toBe(true);
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
        readingRunId: "run-1",
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
        readingRunId: "run-1",
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

describe("网页阅读断点序列化与恢复", () => {
  const fullContent = `第一段-${"甲".repeat(
    MAX_PAGE_CONTENT_CHARS
  )}第二段结尾`;
  const page = {
    title: "可恢复长文章",
    url: "https://example.com/resume",
    content: fullContent,
    wordCount: fullContent.length,
  };

  function createResumeSession({
    webStatus = "streaming",
    webContent = "已经收到的部分内容",
    sourceContent,
  } = {}) {
    const pageMeta = createWebReadingPageMeta(page, {
      segmentIndex: 1,
      totalSegments: 2,
      readingRunId: "run-resume",
    });
    if (sourceContent !== undefined) pageMeta.sourceContent = sourceContent;
    return {
      id: "session-resume",
      title: "速读: 可恢复长文章",
      messages: [
        createMessage(pageMeta),
        {
          id: "assistant-resume",
          role: "assistant",
          content: webContent,
          reasoningContent: "部分思考",
          createdAt: 2,
          status: webStatus,
        },
        {
          id: "user-normal",
          role: "user",
          content: "普通问题",
          createdAt: 3,
          status: "completed",
        },
        {
          id: "assistant-normal",
          role: "assistant",
          content: "普通回答的部分内容",
          createdAt: 4,
          status: "pending",
        },
      ],
      createdAt: 1,
      updatedAt: 4,
    };
  }

  function createPersistedStore() {
    const pending = createInitialWebReadingProgress({
      page,
      totalSegments: 2,
      requestId: "request-resume",
      assistantMessageId: "assistant-resume",
      readingRunId: "run-resume",
      now: 10,
    });
    return serializeWebReadingProgressMap(
      new Map([["session-resume", pending]])
    ).store;
  }

  test("真实存储往返清除 pending，并把网页与普通残留生成改成可重试错误", () => {
    const stored = structuredClone(createPersistedStore());
    expect(stored.records["session-resume"].pendingRequestId).toBeUndefined();
    expect(stored.records["session-resume"].segmentIndex).toBe(1);
    expect(stored.records["session-resume"].nextStart).toBe(0);

    const hydrated = hydrateWebReadingProgress(
      stored,
      [createResumeSession()],
      100
    );
    const restored = hydrated.progressMap.get("session-resume");
    expect(restored.pendingRequestId).toBeUndefined();
    expect(restored.segmentIndex).toBe(1);
    expect(restored.fullContent).toBe(fullContent);

    const messages = hydrated.sessions[0].messages;
    expect(messages[1]).toMatchObject({
      content: "已经收到的部分内容",
      reasoningContent: "部分思考",
      status: "error",
      errorMessage: WEB_READING_INTERRUPTED_MESSAGE,
    });
    expect(messages[3]).toMatchObject({
      content: "普通回答的部分内容",
      status: "error",
      errorMessage: CHAT_INTERRUPTED_MESSAGE,
    });
    expect(hydrated.sessionsChanged).toBe(true);
  });

  test("没有新进度键时也修复历史 pending，且不会凭空创建断点", () => {
    const hydrated = hydrateWebReadingProgress(undefined, [createResumeSession()]);
    expect(hydrated.progressMap.size).toBe(0);
    expect(hydrated.progressNeedsRewrite).toBe(false);
    expect(hydrated.sessions[0].messages[1].status).toBe("error");
    expect(hydrated.sessions[0].messages[3].status).toBe("error");
  });

  test("正文分段、runId、页面或助手不匹配时丢弃断点但仍修复卡片", () => {
    const cases = [
      (store, session) => {
        session.messages[0].pageMeta.sourceContent = "另一份正文";
      },
      (store) => {
        store.records["session-resume"].readingRunId = "run-other";
      },
      (store) => {
        store.records["session-resume"].url = "https://example.com/other";
      },
      (store) => {
        store.records["session-resume"].lastAssistantMessageId = "missing";
      },
    ];

    for (const mutate of cases) {
      const store = structuredClone(createPersistedStore());
      const session = createResumeSession();
      mutate(store, session);
      const hydrated = hydrateWebReadingProgress(store, [session]);
      expect(hydrated.progressMap.size).toBe(0);
      expect(hydrated.droppedSessionIds).toEqual(["session-resume"]);
      expect(hydrated.sessions[0].messages[1].status).toBe("error");
    }

    const orphaned = hydrateWebReadingProgress(createPersistedStore(), []);
    expect(orphaned.progressMap.size).toBe(0);
    expect(orphaned.droppedSessionIds).toEqual(["session-resume"]);

    const unknownVersion = createPersistedStore();
    unknownVersion.version = 99;
    const incompatible = hydrateWebReadingProgress(unknownVersion, [
      createResumeSession(),
    ]);
    expect(incompatible.progressMap.size).toBe(0);
    expect(incompatible.progressNeedsRewrite).toBe(true);
    expect(incompatible.sessions[0].messages[1].status).toBe("error");
  });

  test("旧 readingRun 的迟到结算不能推进新运行", () => {
    const current = createInitialWebReadingProgress({
      page,
      totalSegments: 2,
      requestId: "request-current",
      assistantMessageId: "assistant-resume",
      readingRunId: "run-current",
      now: 1,
    });
    expect(
      settleWebReadingSegment(
        current,
        "request-current",
        { success: true, result: "旧运行结果" },
        2,
        "run-old"
      )
    ).toBe(current);
  });

  test("容量限制优先保留当前断点，不截断正文，并最多保存十条", () => {
    const createProgress = (id, length, updatedAt) => ({
      readingRunId: `run-${id}`,
      title: id,
      url: `https://example.com/${id}`,
      fullContent: id.repeat(Math.ceil(length / id.length)).slice(0, length),
      totalSegments: Math.ceil(length / MAX_PAGE_CONTENT_CHARS),
      segmentIndex: 1,
      nextStart: 0,
      lastAssistantMessageId: `assistant-${id}`,
      updatedAt,
    });

    const tooLarge = createProgress(
      "large",
      WEB_READING_MAX_SINGLE_CONTENT_CHARS + 1,
      1
    );
    const oversized = serializeWebReadingProgressMap(
      new Map([["large", tooLarge]]),
      "large"
    );
    expect(oversized.persistedSessionIds).toEqual([]);
    expect(oversized.omittedSessionIds).toEqual(["large"]);
    expect(tooLarge.fullContent).toHaveLength(
      WEB_READING_MAX_SINGLE_CONTENT_CHARS + 1
    );

    const perArticle = Math.floor(
      WEB_READING_MAX_TOTAL_CONTENT_CHARS / 2
    );
    const totalLimited = serializeWebReadingProgressMap(
      new Map([
        ["old-priority", createProgress("p", perArticle, 1)],
        ["new-1", createProgress("n", perArticle, 3)],
        ["new-2", createProgress("m", perArticle, 2)],
      ]),
      "old-priority"
    );
    expect(totalLimited.persistedSessionIds).toContain("old-priority");
    expect(totalLimited.persistedSessionIds).toHaveLength(2);
    expect(totalLimited.omittedSessionIds).toHaveLength(1);

    const eleven = new Map(
      Array.from({ length: WEB_READING_MAX_PERSISTED_ENTRIES + 1 }, (_, index) => [
        `session-${index}`,
        createProgress(`s${index}`, 10, index + 1),
      ])
    );
    expect(
      serializeWebReadingProgressMap(eleven).persistedSessionIds
    ).toHaveLength(WEB_READING_MAX_PERSISTED_ENTRIES);
  });
});
