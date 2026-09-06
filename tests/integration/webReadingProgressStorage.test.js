import { describe, expect, test } from "bun:test";
import {
  SIDEPANEL_ACTIVE_SESSION_STORAGE_KEY,
  SIDEPANEL_SESSIONS_STORAGE_KEY,
  WEB_READING_PROGRESS_STORAGE_KEY,
  WebReadingProgressFailureGate,
  WebReadingPendingActionGate,
  WebReadingProgressStorage,
  loadWebReadingHydrationSnapshot,
  prepareWebReadingProgressCheckpoint,
} from "../../entrypoints/sidepanel/webReadingProgressStorage.ts";
import {
  WEB_READING_INTERRUPTED_MESSAGE,
  beginWebReadingSegment,
  createInitialWebReadingProgress,
  createWebReadingPageMeta,
  hydrateWebReadingProgress,
} from "../../entrypoints/shared/webReadingState.ts";
import { MAX_PAGE_CONTENT_CHARS } from "../../entrypoints/shared/webReadingPrompt.ts";
import { createMemoryBrowserStorage } from "../helpers/testEnvironment.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createProgress(overrides = {}) {
  return {
    readingRunId: "run-1",
    title: "长文章",
    url: "https://example.com/long",
    fullContent: "正文内容",
    totalSegments: 2,
    segmentIndex: 1,
    nextStart: 0,
    lastAssistantMessageId: "assistant-1",
    updatedAt: 1,
    ...overrides,
  };
}

describe("网页阅读断点存储协调器", () => {
  test("联合 hydrate 读取完成前不会写入或用空状态覆盖存储", async () => {
    const read = deferred();
    let setCalls = 0;
    const storage = {
      get: () => read.promise,
      set: async () => {
        setCalls += 1;
      },
    };

    const operation = loadWebReadingHydrationSnapshot(storage);
    await Promise.resolve();
    expect(setCalls).toBe(0);

    read.resolve({
      [SIDEPANEL_SESSIONS_STORAGE_KEY]: [{ id: "session-1" }],
      [SIDEPANEL_ACTIVE_SESSION_STORAGE_KEY]: "session-1",
      [WEB_READING_PROGRESS_STORAGE_KEY]: { version: 1, records: {} },
    });
    await expect(operation).resolves.toEqual({
      sessions: [{ id: "session-1" }],
      activeSessionId: "session-1",
      webReadingProgress: { version: 1, records: {} },
    });
    expect(setCalls).toBe(0);
  });

  test("写入严格串行，完成检查点同写 sessions 与 progress，后续删除最终胜出", async () => {
    const writes = [];
    const pendingWrites = [];
    const storage = {
      get: async () => ({}),
      set: (payload) => {
        writes.push(structuredClone(payload));
        const pending = deferred();
        pendingWrites.push(pending);
        return pending.promise;
      },
    };
    const coordinator = new WebReadingProgressStorage(storage);
    const firstSessions = [
      {
        id: "session-1",
        title: "速读",
        messages: [
          { id: "assistant-1", role: "assistant", content: "完成", status: "completed" },
        ],
        createdAt: 1,
        updatedAt: 2,
      },
    ];

    const first = coordinator.enqueueCheckpoint({
      progressMap: new Map([["session-1", createProgress()]]),
      sessions: firstSessions,
      prioritySessionId: "session-1",
    });
    const deletion = coordinator.enqueueCheckpoint({
      progressMap: new Map(),
      sessions: [],
      activeSessionId: "fresh-session",
      prioritySessionId: "session-1",
    });

    await Promise.resolve();
    expect(writes).toHaveLength(1);
    expect(writes[0][SIDEPANEL_SESSIONS_STORAGE_KEY]).toEqual(firstSessions);
    expect(
      writes[0][WEB_READING_PROGRESS_STORAGE_KEY].records["session-1"]
        .segmentIndex
    ).toBe(1);

    pendingWrites[0].resolve();
    await first;
    await Promise.resolve();
    expect(writes).toHaveLength(2);
    expect(writes[1][SIDEPANEL_SESSIONS_STORAGE_KEY]).toEqual([]);
    expect(writes[1][WEB_READING_PROGRESS_STORAGE_KEY].records).toEqual({});
    expect(writes[1][SIDEPANEL_ACTIVE_SESSION_STORAGE_KEY]).toBe(
      "fresh-session"
    );

    pendingWrites[1].resolve();
    await deletion;
  });

  test("生产编排的多段首读和续读第一笔写入就是联合可恢复快照", async () => {
    const verifyFirstWrite = async (previous, updater, sessions) => {
      const writes = [];
      const storage = {
        get: async () => ({}),
        set: async (payload) => {
          writes.push(structuredClone(payload));
        },
      };
      const coordinator = new WebReadingProgressStorage(storage);
      const checkpoint = prepareWebReadingProgressCheckpoint(
        previous,
        updater,
        sessions,
        "session-1"
      );
      expect(checkpoint).not.toBeNull();
      await coordinator.enqueueCheckpoint(checkpoint);
      expect(writes).toHaveLength(1);
      expect(writes[0][SIDEPANEL_SESSIONS_STORAGE_KEY]).toEqual(sessions);
      expect(
        writes[0][WEB_READING_PROGRESS_STORAGE_KEY].records["session-1"]
      ).toBeDefined();
      return writes[0];
    };

    const orchestrationContent = "甲".repeat(MAX_PAGE_CONTENT_CHARS + 1);
    const orchestrationPage = {
      title: "长文章",
      url: "https://example.com/long",
      content: orchestrationContent,
    };
    const initialProgress = createProgress({
      fullContent: orchestrationContent,
      pendingRequestId: "request-1",
      pendingSegmentIndex: 1,
      pendingNextStart: MAX_PAGE_CONTENT_CHARS,
      pendingAssistantMessageId: "assistant-1",
    });
    const firstSessions = [
      {
        id: "session-1",
        title: "速读",
        messages: [
          {
            id: "user-1",
            role: "user",
            content: "第一段",
            pageMeta: createWebReadingPageMeta(orchestrationPage, {
              segmentIndex: 1,
              totalSegments: 2,
              readingRunId: "run-1",
            }),
            status: "completed",
          },
          { id: "assistant-1", role: "assistant", content: "", status: "streaming" },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const firstWrite = await verifyFirstWrite(
      new Map(),
      (previous) => {
        const next = new Map(previous);
        next.set("session-1", initialProgress);
        return next;
      },
      firstSessions
    );
    expect(
      firstWrite[WEB_READING_PROGRESS_STORAGE_KEY].records["session-1"]
        .lastAssistantMessageId
    ).toBe("assistant-1");
    expect(
      hydrateWebReadingProgress(
        firstWrite[WEB_READING_PROGRESS_STORAGE_KEY],
        firstWrite[SIDEPANEL_SESSIONS_STORAGE_KEY]
      ).progressMap.has("session-1")
    ).toBe(true);

    const readyForSecond = createProgress({
      fullContent: orchestrationContent,
      segmentIndex: 2,
      nextStart: MAX_PAGE_CONTENT_CHARS,
      lastAssistantMessageId: "assistant-1",
    });
    const secondSessions = [
      {
        ...firstSessions[0],
        messages: [
          ...firstSessions[0].messages,
          {
            id: "user-2",
            role: "user",
            content: "第二段",
            pageMeta: createWebReadingPageMeta(
              {
                ...orchestrationPage,
                content: orchestrationContent.slice(MAX_PAGE_CONTENT_CHARS),
              },
              {
                segmentIndex: 2,
                totalSegments: 2,
                readingRunId: "run-1",
              }
            ),
            status: "completed",
          },
          { id: "assistant-2", role: "assistant", content: "", status: "streaming" },
        ],
        updatedAt: 2,
      },
    ];
    const secondWrite = await verifyFirstWrite(
      new Map([["session-1", readyForSecond]]),
      (previous) => {
        const next = new Map(previous);
        next.set(
          "session-1",
          beginWebReadingSegment(previous.get("session-1"), {
            requestId: "request-2",
            segmentIndex: 2,
            nextStart: MAX_PAGE_CONTENT_CHARS + 1,
            assistantMessageId: "assistant-2",
            now: 2,
          })
        );
        return next;
      },
      secondSessions
    );
    expect(
      secondWrite[WEB_READING_PROGRESS_STORAGE_KEY].records["session-1"]
        .lastAssistantMessageId
    ).toBe("assistant-2");
    expect(
      hydrateWebReadingProgress(
        secondWrite[WEB_READING_PROGRESS_STORAGE_KEY],
        secondWrite[SIDEPANEL_SESSIONS_STORAGE_KEY]
      ).progressMap.has("session-1")
    ).toBe(true);
  });

  test("连续保存失败只报告一次，成功后下一次失败可再次报告", () => {
    const gate = new WebReadingProgressFailureGate();
    expect(gate.recordFailure()).toBe(true);
    expect(gate.recordFailure()).toBe(false);
    gate.recordSuccess();
    expect(gate.recordFailure()).toBe(true);

    const pendingGate = new WebReadingPendingActionGate();
    expect(pendingGate.tryClaim(false)).toBe(false);
    expect(pendingGate.tryClaim(true)).toBe(true);
    expect(pendingGate.tryClaim(true)).toBe(false);
  });

  test("真实本地存储往返恢复当前段并持久化中断错误", async () => {
    const mock = createMemoryBrowserStorage();
    const coordinator = new WebReadingProgressStorage(mock.browser.storage.local);
    const fullContent = "甲".repeat(MAX_PAGE_CONTENT_CHARS + 5);
    const page = {
      title: "本地往返文章",
      url: "https://example.com/storage-roundtrip",
      content: fullContent,
    };
    const pageMeta = createWebReadingPageMeta(page, {
      segmentIndex: 1,
      totalSegments: 2,
      readingRunId: "run-roundtrip",
    });
    const sessions = [
      {
        id: "session-roundtrip",
        title: "速读",
        messages: [
          {
            id: "user-roundtrip",
            role: "user",
            content: "网页卡片",
            pageMeta,
            createdAt: 1,
            status: "completed",
          },
          {
            id: "assistant-roundtrip",
            role: "assistant",
            content: "部分结果",
            createdAt: 2,
            status: "streaming",
          },
        ],
        createdAt: 1,
        updatedAt: 2,
      },
    ];
    const progressMap = new Map([
      [
        "session-roundtrip",
        createInitialWebReadingProgress({
          page,
          totalSegments: 2,
          requestId: "request-roundtrip",
          assistantMessageId: "assistant-roundtrip",
          readingRunId: "run-roundtrip",
          now: 2,
        }),
      ],
    ]);

    await coordinator.enqueueCheckpoint({ progressMap, sessions });
    const snapshot = await loadWebReadingHydrationSnapshot(
      mock.browser.storage.local
    );
    const hydrated = hydrateWebReadingProgress(
      snapshot.webReadingProgress,
      snapshot.sessions,
      3
    );
    expect(hydrated.progressMap.get("session-roundtrip")).toMatchObject({
      segmentIndex: 1,
      nextStart: 0,
      readingRunId: "run-roundtrip",
    });
    expect(hydrated.sessions[0].messages[1]).toMatchObject({
      content: "部分结果",
      status: "error",
      errorMessage: WEB_READING_INTERRUPTED_MESSAGE,
    });

    await coordinator.enqueueCheckpoint({
      progressMap: hydrated.progressMap,
      sessions: hydrated.sessions,
    });
    const storedSessions = mock.stores.local[SIDEPANEL_SESSIONS_STORAGE_KEY];
    expect(storedSessions[0].messages[1].status).toBe("error");
    expect(
      mock.stores.local[WEB_READING_PROGRESS_STORAGE_KEY].records[
        "session-roundtrip"
      ].segmentIndex
    ).toBe(1);
  });
});
