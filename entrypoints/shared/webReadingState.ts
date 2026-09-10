import {
  buildHistoryPayload,
  type ChatMessage,
  type ChatSession,
} from "./chatTypes";
import {
  buildAttachedPageContextPrompt,
  buildWebReadingContinuationPrompt,
  buildWebReadingUserPrompt,
  getWebReadingSegmentCount,
  MAX_PAGE_CONTENT_CHARS,
  type WebPageMetadata,
} from "./webReadingPrompt";

export const WEB_READING_REPLAY_MISSING_MESSAGE =
  "这条旧网页记录没有保存可重放的正文，请重新点击「通读当前网页」。";
export const WEB_READING_INTERRUPTED_MESSAGE =
  "上次生成因侧边栏关闭或扩展重载中断，可点击重试当前分段。";
export const CHAT_INTERRUPTED_MESSAGE =
  "上次生成因侧边栏关闭或扩展重载中断，可点击重试。";
export const WEB_READING_PROGRESS_VERSION = 1 as const;
export const WEB_READING_PROGRESS_STORAGE_KEY =
  "sidepanel_web_reading_progress_v1";
export const WEB_READING_MAX_SINGLE_CONTENT_CHARS = 1_000_000;
export const WEB_READING_MAX_TOTAL_CONTENT_CHARS = 2_000_000;
export const WEB_READING_MAX_PERSISTED_ENTRIES = 10;

type WebReadingPageMeta = NonNullable<ChatMessage["pageMeta"]>;

/**
 * 保存一段有界原文供编辑、重试使用；excerpt 继续表示摘要，不承担正文重放职责。
 */
export function createWebReadingPageMeta(
  page: WebPageMetadata,
  options: {
    segmentIndex: number;
    totalSegments: number;
    userInstruction?: string;
    readingRunId?: string;
    /** true 表示只附加正文作上下文，不要求模型产出速读报告。 */
    contextOnly?: boolean;
  }
): WebReadingPageMeta {
  const sourceContent = (page.content || "").slice(
    0,
    MAX_PAGE_CONTENT_CHARS
  );
  return {
    title: page.title,
    url: page.url,
    wordCount: page.wordCount,
    excerpt:
      page.excerpt ?? sourceContent.replace(/\s+/g, " ").trim().slice(0, 180),
    isWebPageReading: true,
    contextOnly: options.contextOnly || undefined,
    sourceContent,
    segmentIndex: options.segmentIndex,
    totalSegments: options.totalSegments,
    userInstruction: options.userInstruction?.trim() || undefined,
    readingRunId: options.readingRunId,
  };
}

export type ReplayableWebReadingPromptResult =
  | { success: true; prompt: string }
  | { success: false; error: string };

/**
 * 从消息自身保存的原文重建首段或续段 Prompt，避免把标题卡片或编辑文案误当正文。
 */
export function buildReplayableWebReadingPrompt(
  message: ChatMessage,
  userInstruction = message.pageMeta?.userInstruction
): ReplayableWebReadingPromptResult {
  const meta = message.pageMeta;
  const sourceContent = meta?.sourceContent?.trim();
  if (!meta?.isWebPageReading || !sourceContent) {
    return { success: false, error: WEB_READING_REPLAY_MISSING_MESSAGE };
  }

  const segmentIndex = Math.max(1, meta.segmentIndex || 1);
  const totalSegments = Math.max(segmentIndex, meta.totalSegments || 1);
  const page: WebPageMetadata = {
    title: meta.title,
    url: meta.url,
    content: sourceContent,
    wordCount: meta.wordCount,
  };
  let basePrompt: string;
  if (meta.contextOnly) {
    // 仅附加正文：重放中性背景，避免把“请生成速读报告”重新塞回历史
    basePrompt = buildAttachedPageContextPrompt(page);
  } else if (segmentIndex > 1) {
    basePrompt = buildWebReadingContinuationPrompt({
      title: meta.title,
      segmentContent: sourceContent,
      segmentIndex,
      totalSegments,
    });
  } else {
    basePrompt = buildWebReadingUserPrompt(page);
  }
  const instruction = userInstruction?.trim();
  return {
    success: true,
    prompt: instruction
      ? `${basePrompt}\n\n【用户补充指令】\n${instruction}`
      : basePrompt,
  };
}

/**
 * 网页对话历史仍统一走 buildHistoryPayload，同时把可重放的网页卡片恢复为真实段落 Prompt。
 */
export function buildWebReadingHistoryPayload(
  messages: ChatMessage[],
  currentMessage?: Parameters<typeof buildHistoryPayload>[1]
) {
  return buildHistoryPayload(
    messages.map((message) => {
      if (message.role !== "user" || !message.pageMeta?.isWebPageReading) {
        return message;
      }
      const replay = buildReplayableWebReadingPrompt(message);
      return replay.success ? { ...message, content: replay.prompt } : message;
    }),
    currentMessage
  );
}

export interface WebReadingProgressState {
  readingRunId: string;
  title: string;
  url: string;
  wordCount?: number;
  fullContent: string;
  totalSegments: number;
  /** 当前尚未成功完成的段序号，从 1 开始。 */
  segmentIndex: number;
  /** 当前尚未成功完成的段起始下标。 */
  nextStart: number;
  /** 最近成功完成或当前首次生成对应的助手消息。 */
  lastAssistantMessageId: string;
  pendingRequestId?: string;
  pendingSegmentIndex?: number;
  pendingNextStart?: number;
  pendingAssistantMessageId?: string;
  updatedAt: number;
}

export interface PersistedWebReadingProgress {
  sessionId: string;
  readingRunId: string;
  title: string;
  url: string;
  wordCount?: number;
  fullContent: string;
  totalSegments: number;
  segmentIndex: number;
  nextStart: number;
  lastAssistantMessageId: string;
  updatedAt: number;
}

export interface PersistedWebReadingProgressStore {
  version: typeof WEB_READING_PROGRESS_VERSION;
  records: Record<string, PersistedWebReadingProgress>;
}

export interface SerializedWebReadingProgress {
  store: PersistedWebReadingProgressStore;
  persistedSessionIds: string[];
  omittedSessionIds: string[];
}

export interface HydratedWebReadingProgress {
  progressMap: Map<string, WebReadingProgressState>;
  sessions: ChatSession[];
  sessionsChanged: boolean;
  progressNeedsRewrite: boolean;
  droppedSessionIds: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 把运行时 Map 转成独立存储 DTO。pending 字段只存在内存；容量不足时
 * 优先保留本次变更的会话，再按更新时间保留较新的完整正文，绝不截断正文。
 */
export function serializeWebReadingProgressMap(
  progressMap: Map<string, WebReadingProgressState>,
  prioritySessionId?: string
): SerializedWebReadingProgress {
  const candidates = Array.from(progressMap.entries())
    .map(([sessionId, progress]) => ({ sessionId, progress }))
    .sort((left, right) => {
      if (left.sessionId === prioritySessionId) return -1;
      if (right.sessionId === prioritySessionId) return 1;
      return right.progress.updatedAt - left.progress.updatedAt;
    });
  const records: Record<string, PersistedWebReadingProgress> = {};
  const persistedSessionIds: string[] = [];
  const omittedSessionIds: string[] = [];
  let totalChars = 0;

  for (const { sessionId, progress } of candidates) {
    const contentLength = progress.fullContent.length;
    const validIdentity = Boolean(
      sessionId && progress.readingRunId && progress.lastAssistantMessageId
    );
    const exceedsCapacity =
      contentLength === 0 ||
      contentLength > WEB_READING_MAX_SINGLE_CONTENT_CHARS ||
      persistedSessionIds.length >= WEB_READING_MAX_PERSISTED_ENTRIES ||
      totalChars + contentLength > WEB_READING_MAX_TOTAL_CONTENT_CHARS;

    if (!validIdentity || exceedsCapacity) {
      omittedSessionIds.push(sessionId);
      continue;
    }

    records[sessionId] = {
      sessionId,
      readingRunId: progress.readingRunId,
      title: progress.title,
      url: progress.url,
      wordCount: progress.wordCount,
      fullContent: progress.fullContent,
      totalSegments: progress.totalSegments,
      segmentIndex: progress.segmentIndex,
      nextStart: progress.nextStart,
      lastAssistantMessageId:
        progress.pendingAssistantMessageId ?? progress.lastAssistantMessageId,
      updatedAt: progress.updatedAt,
    };
    persistedSessionIds.push(sessionId);
    totalChars += contentLength;
  }

  return {
    store: { version: WEB_READING_PROGRESS_VERSION, records },
    persistedSessionIds,
    omittedSessionIds,
  };
}

function normalizePersistedProgress(
  raw: unknown,
  session: ChatSession
): WebReadingProgressState | null {
  if (!isPlainObject(raw)) return null;
  const {
    sessionId,
    readingRunId,
    title,
    url,
    wordCount,
    fullContent,
    totalSegments,
    segmentIndex,
    nextStart,
    lastAssistantMessageId,
    updatedAt,
  } = raw;
  if (
    sessionId !== session.id ||
    typeof readingRunId !== "string" ||
    !readingRunId ||
    typeof title !== "string" ||
    typeof url !== "string" ||
    typeof fullContent !== "string" ||
    !fullContent.trim() ||
    fullContent.length > WEB_READING_MAX_SINGLE_CONTENT_CHARS ||
    typeof totalSegments !== "number" ||
    totalSegments !== getWebReadingSegmentCount(fullContent.length) ||
    typeof segmentIndex !== "number" ||
    !Number.isInteger(segmentIndex) ||
    segmentIndex < 1 ||
    segmentIndex > totalSegments ||
    typeof nextStart !== "number" ||
    nextStart !== (segmentIndex - 1) * MAX_PAGE_CONTENT_CHARS ||
    typeof lastAssistantMessageId !== "string" ||
    !lastAssistantMessageId ||
    typeof updatedAt !== "number" ||
    !Number.isFinite(updatedAt) ||
    updatedAt <= 0 ||
    (wordCount !== undefined && typeof wordCount !== "number")
  ) {
    return null;
  }

  const userMessageIndex = session.messages.findLastIndex(
    (message) =>
      message.role === "user" &&
      message.pageMeta?.isWebPageReading === true &&
      message.pageMeta.readingRunId === readingRunId
  );
  const assistantMessageIndex = session.messages.findIndex(
    (message) =>
      message.role === "assistant" && message.id === lastAssistantMessageId
  );
  const pageMeta = session.messages[userMessageIndex]?.pageMeta;
  const messageSegmentIndex = pageMeta?.segmentIndex;
  const expectedSourceContent =
    typeof messageSegmentIndex === "number"
      ? fullContent.slice(
          (messageSegmentIndex - 1) * MAX_PAGE_CONTENT_CHARS,
          messageSegmentIndex * MAX_PAGE_CONTENT_CHARS
        )
      : undefined;
  if (
    userMessageIndex < 0 ||
    assistantMessageIndex <= userMessageIndex ||
    !pageMeta ||
    pageMeta.title !== title ||
    pageMeta.url !== url ||
    pageMeta.totalSegments !== totalSegments ||
    pageMeta.sourceContent !== expectedSourceContent ||
    (messageSegmentIndex !== segmentIndex &&
      messageSegmentIndex !== Math.max(1, segmentIndex - 1))
  ) {
    return null;
  }

  return {
    readingRunId,
    title,
    url,
    wordCount: typeof wordCount === "number" ? wordCount : undefined,
    fullContent,
    totalSegments,
    segmentIndex,
    nextStart,
    lastAssistantMessageId,
    updatedAt,
  };
}

function recoverInterruptedAssistantMessages(
  sessions: ChatSession[],
  now: number
): { sessions: ChatSession[]; changed: boolean } {
  let changed = false;
  const recovered = sessions.map((session) => {
    let sessionChanged = false;
    const messages = session.messages.map((message, index) => {
      if (
        message.role !== "assistant" ||
        (message.status !== "streaming" && message.status !== "pending")
      ) {
        return message;
      }
      sessionChanged = true;
      changed = true;
      const precedingUserMessage = session.messages[index - 1];
      const isWebReading =
        precedingUserMessage?.role === "user" &&
        precedingUserMessage.pageMeta?.isWebPageReading === true;
      return {
        ...message,
        status: "error" as const,
        errorMessage: isWebReading
          ? WEB_READING_INTERRUPTED_MESSAGE
          : CHAT_INTERRUPTED_MESSAGE,
      };
    });
    return sessionChanged ? { ...session, messages, updatedAt: now } : session;
  });
  return { sessions: recovered, changed };
}

/**
 * 联合会话快照恢复阅读断点。无效、孤儿、页面身份不匹配及超容量记录均丢弃；
 * 旧 pending 助手改成可重试错误态，不自动抓网页或发起模型请求。
 */
export function hydrateWebReadingProgress(
  rawStore: unknown,
  sessions: ChatSession[],
  now = Date.now(),
  prioritySessionId?: string
): HydratedWebReadingProgress {
  const recoveredSessions = recoverInterruptedAssistantMessages(sessions, now);
  if (
    !isPlainObject(rawStore) ||
    rawStore.version !== WEB_READING_PROGRESS_VERSION ||
    !isPlainObject(rawStore.records)
  ) {
    return {
      progressMap: new Map(),
      sessions: recoveredSessions.sessions,
      sessionsChanged: recoveredSessions.changed,
      progressNeedsRewrite: rawStore !== undefined,
      droppedSessionIds: [],
    };
  }

  const sessionsById = new Map(
    recoveredSessions.sessions.map((session) => [session.id, session])
  );
  const validProgress = new Map<string, WebReadingProgressState>();
  const droppedSessionIds: string[] = [];

  for (const [sessionId, rawProgress] of Object.entries(rawStore.records)) {
    const session = sessionsById.get(sessionId);
    const normalized = session
      ? normalizePersistedProgress(rawProgress, session)
      : null;
    if (!normalized) {
      droppedSessionIds.push(sessionId);
      continue;
    }
    validProgress.set(sessionId, normalized);
  }

  const capacityResult = serializeWebReadingProgressMap(
    validProgress,
    prioritySessionId
  );
  for (const omitted of capacityResult.omittedSessionIds) {
    validProgress.delete(omitted);
    if (!droppedSessionIds.includes(omitted)) droppedSessionIds.push(omitted);
  }

  const canonicalStore = serializeWebReadingProgressMap(
    validProgress,
    prioritySessionId
  ).store;

  return {
    progressMap: validProgress,
    sessions: recoveredSessions.sessions,
    sessionsChanged: recoveredSessions.changed,
    progressNeedsRewrite:
      JSON.stringify(rawStore) !== JSON.stringify(canonicalStore),
    droppedSessionIds,
  };
}

export interface ActiveSidepanelRequest {
  requestId: string;
  sessionId: string;
  assistantMessageId: string;
  readingRunId?: string;
}

/** 只有当前确实存在同会话、同阅读运行的进度时，才延迟 sessions 到联合检查点。 */
export function hasMatchingWebReadingProgress(
  progressBySession: Map<string, WebReadingProgressState>,
  owner?: ActiveSidepanelRequest
): boolean {
  if (!owner?.readingRunId) return false;
  return (
    progressBySession.get(owner.sessionId)?.readingRunId === owner.readingRunId
  );
}

export function getActiveSidepanelRequestOwner(
  requestId: string | undefined,
  owner: ActiveSidepanelRequest | undefined
): ActiveSidepanelRequest | undefined {
  return requestId && owner?.requestId === requestId ? owner : undefined;
}

export function invalidateActiveSidepanelRequest(
  state: {
    activeRequestId?: string;
    owner?: ActiveSidepanelRequest;
  },
  requestId: string
): {
  activeRequestId?: string;
  owner?: ActiveSidepanelRequest;
  invalidated: boolean;
  invalidatedOwner?: ActiveSidepanelRequest;
} {
  if (state.activeRequestId !== requestId) {
    return { ...state, invalidated: false };
  }
  return {
    activeRequestId: undefined,
    owner: state.owner?.requestId === requestId ? undefined : state.owner,
    invalidated: true,
    invalidatedOwner: getActiveSidepanelRequestOwner(requestId, state.owner),
  };
}

export interface WebReadingResponse {
  success?: boolean;
  result?: unknown;
  error?: string;
}

export function isSuccessfulWebReadingResponse(
  response?: WebReadingResponse
): boolean {
  return (
    response?.success === true &&
    typeof response.result === "string" &&
    response.result.trim().length > 0
  );
}

/** pending 未结算或首段尚未成功时，不允许展示或触发续读。 */
export function isWebReadingContinueReady(
  progress?: WebReadingProgressState
): progress is WebReadingProgressState {
  return Boolean(
    progress &&
      !progress.pendingRequestId &&
      progress.segmentIndex > 1 &&
      progress.segmentIndex <= progress.totalSegments
  );
}

export function shouldShowWebReadingContinue(
  progress: WebReadingProgressState | undefined,
  assistant: { id: string; status?: ChatMessage["status"] }
): boolean {
  return Boolean(
    isWebReadingContinueReady(progress) &&
      progress?.lastAssistantMessageId === assistant.id &&
      assistant.status === "completed"
  );
}

export function createInitialWebReadingProgress(params: {
  page: WebPageMetadata;
  totalSegments: number;
  requestId: string;
  assistantMessageId: string;
  readingRunId: string;
  now?: number;
}): WebReadingProgressState {
  return {
    readingRunId: params.readingRunId,
    title: params.page.title,
    url: params.page.url,
    wordCount: params.page.wordCount,
    fullContent: params.page.content,
    totalSegments: params.totalSegments,
    segmentIndex: 1,
    nextStart: 0,
    lastAssistantMessageId: params.assistantMessageId,
    pendingRequestId: params.requestId,
    pendingSegmentIndex: 1,
    pendingNextStart: Math.min(
      MAX_PAGE_CONTENT_CHARS,
      params.page.content.length
    ),
    pendingAssistantMessageId: params.assistantMessageId,
    updatedAt: params.now ?? Date.now(),
  };
}

/** 标记某一段开始请求。实际进度仍停留在当前段，等待业务响应确认。 */
export function beginWebReadingSegment(
  progress: WebReadingProgressState,
  params: {
    requestId: string;
    segmentIndex: number;
    nextStart: number;
    assistantMessageId: string;
    now?: number;
  }
): WebReadingProgressState {
  if (params.segmentIndex !== progress.segmentIndex) return progress;
  return {
    ...progress,
    pendingRequestId: params.requestId,
    pendingSegmentIndex: params.segmentIndex,
    pendingNextStart: params.nextStart,
    pendingAssistantMessageId: params.assistantMessageId,
    updatedAt: params.now ?? Date.now(),
  };
}

/**
 * 编辑或重新生成较早网页段时，将该网页的待读位置回退到目标段并绑定新请求。
 * 标题或 URL 不一致时保持原进度，避免改动同会话中的其他网页任务。
 */
export function rewindWebReadingProgressForReplay(
  progress: WebReadingProgressState,
  params: {
    title: string;
    url: string;
    segmentIndex: number;
    requestId: string;
    assistantMessageId: string;
    readingRunId?: string;
    now?: number;
  }
): WebReadingProgressState {
  if (
    progress.title !== params.title ||
    progress.url !== params.url ||
    progress.readingRunId !== params.readingRunId ||
    params.segmentIndex < 1 ||
    params.segmentIndex > progress.totalSegments
  ) {
    return progress;
  }

  const segmentStart = Math.min(
    (params.segmentIndex - 1) * MAX_PAGE_CONTENT_CHARS,
    progress.fullContent.length
  );
  const segmentEnd = Math.min(
    segmentStart + MAX_PAGE_CONTENT_CHARS,
    progress.fullContent.length
  );
  return {
    ...progress,
    segmentIndex: params.segmentIndex,
    nextStart: segmentStart,
    lastAssistantMessageId: params.assistantMessageId,
    pendingRequestId: params.requestId,
    pendingSegmentIndex: params.segmentIndex,
    pendingNextStart: segmentEnd,
    pendingAssistantMessageId: params.assistantMessageId,
    updatedAt: params.now ?? Date.now(),
  };
}

/** 取消只失效与 requestId 对应的 pending，不提交任何阅读进度。 */
export function cancelWebReadingRequest(
  progress: WebReadingProgressState,
  requestId: string
): WebReadingProgressState {
  return settleWebReadingSegment(progress, requestId) || progress;
}

/** 按 pendingRequestId 定位会话，避免切换会话后取消到当前可见会话的其他任务。 */
export function cancelWebReadingProgressByRequest(
  progressBySession: Map<string, WebReadingProgressState>,
  requestId: string
): Map<string, WebReadingProgressState> {
  let next: Map<string, WebReadingProgressState> | undefined;
  for (const [sessionId, progress] of progressBySession) {
    if (progress.pendingRequestId !== requestId) continue;
    next ||= new Map(progressBySession);
    next.set(sessionId, cancelWebReadingRequest(progress, requestId));
  }
  return next || progressBySession;
}

/**
 * 只接受同一 requestId 的成功且非空响应。失败、取消、空结果均保留当前段；末段成功后清理进度。
 */
export function settleWebReadingSegment(
  progress: WebReadingProgressState,
  requestId: string,
  response?: WebReadingResponse,
  now = Date.now(),
  readingRunId?: string
): WebReadingProgressState | null {
  if (
    progress.pendingRequestId !== requestId ||
    (readingRunId !== undefined && progress.readingRunId !== readingRunId)
  ) {
    return progress;
  }

  const pendingSegmentIndex = progress.pendingSegmentIndex;
  const base: WebReadingProgressState = {
    ...progress,
    lastAssistantMessageId:
      progress.pendingAssistantMessageId ?? progress.lastAssistantMessageId,
    updatedAt: now,
  };
  delete base.pendingRequestId;
  delete base.pendingSegmentIndex;
  delete base.pendingNextStart;
  delete base.pendingAssistantMessageId;

  const completed = isSuccessfulWebReadingResponse(response);
  if (!completed || !pendingSegmentIndex) return base;
  if (pendingSegmentIndex >= progress.totalSegments) return null;

  return {
    ...base,
    segmentIndex: pendingSegmentIndex + 1,
    nextStart: progress.pendingNextStart ?? progress.nextStart,
    lastAssistantMessageId:
      progress.pendingAssistantMessageId ?? progress.lastAssistantMessageId,
  };
}
