import { buildHistoryPayload, type ChatMessage } from "./chatTypes";
import {
  buildWebReadingContinuationPrompt,
  buildWebReadingUserPrompt,
  MAX_PAGE_CONTENT_CHARS,
  type WebPageMetadata,
} from "./webReadingPrompt";

export const WEB_READING_REPLAY_MISSING_MESSAGE =
  "这条旧网页记录没有保存可重放的正文，请重新点击「通读当前网页」。";

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
    sourceContent,
    segmentIndex: options.segmentIndex,
    totalSegments: options.totalSegments,
    userInstruction: options.userInstruction?.trim() || undefined,
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
  const basePrompt =
    segmentIndex > 1
      ? buildWebReadingContinuationPrompt({
          title: meta.title,
          segmentContent: sourceContent,
          segmentIndex,
          totalSegments,
        })
      : buildWebReadingUserPrompt({
          title: meta.title,
          url: meta.url,
          content: sourceContent,
          wordCount: meta.wordCount,
        });
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
export function buildWebReadingHistoryPayload(messages: ChatMessage[]) {
  return buildHistoryPayload(
    messages.map((message) => {
      if (message.role !== "user" || !message.pageMeta?.isWebPageReading) {
        return message;
      }
      const replay = buildReplayableWebReadingPrompt(message);
      return replay.success ? { ...message, content: replay.prompt } : message;
    })
  );
}

export interface WebReadingProgressState {
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
}

export interface ActiveSidepanelRequest {
  requestId: string;
  sessionId: string;
  assistantMessageId: string;
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
}): WebReadingProgressState {
  return {
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
  }
): WebReadingProgressState {
  if (params.segmentIndex !== progress.segmentIndex) return progress;
  return {
    ...progress,
    pendingRequestId: params.requestId,
    pendingSegmentIndex: params.segmentIndex,
    pendingNextStart: params.nextStart,
    pendingAssistantMessageId: params.assistantMessageId,
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
  }
): WebReadingProgressState {
  if (
    progress.title !== params.title ||
    progress.url !== params.url ||
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
  response?: WebReadingResponse
): WebReadingProgressState | null {
  if (progress.pendingRequestId !== requestId) return progress;

  const pendingSegmentIndex = progress.pendingSegmentIndex;
  const base: WebReadingProgressState = {
    ...progress,
    lastAssistantMessageId:
      progress.pendingAssistantMessageId ?? progress.lastAssistantMessageId,
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
