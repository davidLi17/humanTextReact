import type {
  ChatMessage,
  ChatPayloadMessage,
  WebReadingOverviewMeta,
} from "./chatTypes";

export const WEB_READING_OVERVIEW_MAX_INPUT_CHARS = 48_000;
export const WEB_READING_OVERVIEW_TOO_LONG_MESSAGE =
  "全部分段解读结果超过 48,000 字符，当前无法在保证全文覆盖的前提下生成总览。";
export const WEB_READING_OVERVIEW_STALE_MESSAGE =
  "分段解读结果已经变化，这份总览无法继续重试，请重新点击「生成全文总览」。";

export const WEB_READING_OVERVIEW_SYSTEM_PROMPT = `你正在综合一篇网页的全部分段解读结果。
只能依据用户提供的分段解读，不补造原文事实，不把推测写成事实。若各段存在矛盾、口径差异或信息缺口，必须明确指出。
请合并重复信息并统一上下文中的术语，严格按以下四部分输出：
一、全文主线
二、关键事实与结论
三、因果关系与分歧
四、核心术语统一解释
开头注明：本总览基于各段已完成的解读结果生成。`;

export interface CompletedReadingSegment {
  segmentIndex: number;
  sourceContent: string;
  assistantMessageId: string;
  assistantContent: string;
}

export interface CompletedReadingRun {
  readingRunId: string;
  title: string;
  url: string;
  totalSegments: number;
  lastAssistantMessageId: string;
  segments: CompletedReadingSegment[];
  sourceFingerprint: string;
}

export type CompletedReadingRunResult =
  | { success: true; run: CompletedReadingRun }
  | {
      success: false;
      reason:
        | "missing-run"
        | "invalid-metadata"
        | "inconsistent-metadata"
        | "duplicate-segment"
        | "missing-segment"
        | "missing-source"
        | "missing-assistant"
        | "incomplete-assistant";
    };

function appendFingerprintPart(current: number, value: string): number {
  let hash = current;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 根据真实原文、助手消息身份和结果内容生成稳定摘要，用于拒绝过期总览。 */
export function computeReadingRunFingerprint(
  run: Omit<CompletedReadingRun, "sourceFingerprint">
): string {
  let left = 2166136261;
  let right = 2246822507;
  const parts = [
    run.readingRunId,
    run.title,
    run.url,
    String(run.totalSegments),
    ...run.segments.flatMap((segment) => [
      String(segment.segmentIndex),
      segment.sourceContent,
      segment.assistantMessageId,
      segment.assistantContent,
    ]),
  ];
  for (const part of parts) {
    left = appendFingerprintPart(left, `${part.length}:`);
    left = appendFingerprintPart(left, part);
    right = appendFingerprintPart(right, part);
    right = appendFingerprintPart(right, `:${part.length}`);
  }
  return `v1-${left.toString(16).padStart(8, "0")}${right
    .toString(16)
    .padStart(8, "0")}`;
}

/**
 * 只从当前会话重新证明某次阅读的 1..N 段全部成功。
 * 普通追问、其他 readingRunId 和旧版无 readingRunId 消息均不会被混入。
 */
export function deriveCompletedReadingRun(
  messages: ChatMessage[],
  readingRunId: string
): CompletedReadingRunResult {
  if (typeof readingRunId !== "string" || !readingRunId.trim()) {
    return { success: false, reason: "missing-run" };
  }

  const candidates = messages
    .map((message, messageIndex) => ({ message, messageIndex }))
    .filter(
      ({ message }) =>
        message.role === "user" &&
        message.pageMeta?.isWebPageReading === true &&
        message.pageMeta.readingRunId === readingRunId
    );
  if (candidates.length === 0) {
    return { success: false, reason: "missing-run" };
  }

  const firstMeta = candidates[0].message.pageMeta!;
  if (
    typeof firstMeta.title !== "string" ||
    !firstMeta.title.trim() ||
    typeof firstMeta.url !== "string" ||
    !firstMeta.url.trim() ||
    !Number.isInteger(firstMeta.totalSegments) ||
    (firstMeta.totalSegments || 0) < 1
  ) {
    return { success: false, reason: "invalid-metadata" };
  }
  const totalSegments = firstMeta.totalSegments!;
  const segmentsByIndex = new Map<number, CompletedReadingSegment>();

  for (const { message, messageIndex } of candidates) {
    const meta = message.pageMeta!;
    if (
      meta.title !== firstMeta.title ||
      meta.url !== firstMeta.url ||
      meta.totalSegments !== totalSegments ||
      meta.readingRunId !== readingRunId
    ) {
      return { success: false, reason: "inconsistent-metadata" };
    }
    if (
      !Number.isInteger(meta.segmentIndex) ||
      (meta.segmentIndex || 0) < 1 ||
      meta.segmentIndex! > totalSegments
    ) {
      return { success: false, reason: "invalid-metadata" };
    }
    if (segmentsByIndex.has(meta.segmentIndex!)) {
      return { success: false, reason: "duplicate-segment" };
    }
    if (
      typeof meta.sourceContent !== "string" ||
      !meta.sourceContent.trim()
    ) {
      return { success: false, reason: "missing-source" };
    }

    const pairedAssistant = messages[messageIndex + 1];
    if (pairedAssistant?.role !== "assistant") {
      return { success: false, reason: "missing-assistant" };
    }
    if (
      pairedAssistant.status !== "completed" ||
      typeof pairedAssistant.id !== "string" ||
      !pairedAssistant.id ||
      typeof pairedAssistant.content !== "string" ||
      !pairedAssistant.content.trim() ||
      Boolean(pairedAssistant.errorMessage)
    ) {
      return { success: false, reason: "incomplete-assistant" };
    }

    segmentsByIndex.set(meta.segmentIndex!, {
      segmentIndex: meta.segmentIndex!,
      sourceContent: meta.sourceContent,
      assistantMessageId: pairedAssistant.id,
      assistantContent: pairedAssistant.content,
    });
  }

  if (segmentsByIndex.size !== totalSegments) {
    return { success: false, reason: "missing-segment" };
  }
  const segments: CompletedReadingSegment[] = [];
  for (let segmentIndex = 1; segmentIndex <= totalSegments; segmentIndex += 1) {
    const segment = segmentsByIndex.get(segmentIndex);
    if (!segment) return { success: false, reason: "missing-segment" };
    segments.push(segment);
  }

  const baseRun = {
    readingRunId,
    title: firstMeta.title,
    url: firstMeta.url,
    totalSegments,
    lastAssistantMessageId: segments[segments.length - 1].assistantMessageId,
    segments,
  };
  return {
    success: true,
    run: {
      ...baseRun,
      sourceFingerprint: computeReadingRunFingerprint(baseRun),
    },
  };
}

function buildOverviewUserContent(run: CompletedReadingRun): string {
  return run.segments
    .map(
      (segment) =>
        `【第 ${segment.segmentIndex}/${run.totalSegments} 段已读结果】\n${segment.assistantContent}\n【第 ${segment.segmentIndex}/${run.totalSegments} 段结束】`
    )
    .join("\n\n");
}

export type WebReadingOverviewRequestResult =
  | {
      success: true;
      run: CompletedReadingRun;
      meta: WebReadingOverviewMeta;
      messages: ChatPayloadMessage[];
      inputChars: number;
    }
  | { success: false; error: string };

/** 构造专用的 system + 单条 user 请求；超过硬上限时完整阻止，不截断。 */
export function prepareWebReadingOverviewRequest(
  messages: ChatMessage[],
  readingRunId: string,
  expectedFingerprint?: string
): WebReadingOverviewRequestResult {
  const completed = deriveCompletedReadingRun(messages, readingRunId);
  if (!completed.success) {
    return {
      success: false,
      error: "网页分段尚未全部成功完成，暂时无法生成全文总览。",
    };
  }
  if (
    expectedFingerprint &&
    expectedFingerprint !== completed.run.sourceFingerprint
  ) {
    return { success: false, error: WEB_READING_OVERVIEW_STALE_MESSAGE };
  }

  const userContent = buildOverviewUserContent(completed.run);
  const inputChars =
    WEB_READING_OVERVIEW_SYSTEM_PROMPT.length + userContent.length;
  if (inputChars > WEB_READING_OVERVIEW_MAX_INPUT_CHARS) {
    return { success: false, error: WEB_READING_OVERVIEW_TOO_LONG_MESSAGE };
  }

  const meta: WebReadingOverviewMeta = {
    kind: "web-reading-overview",
    version: 1,
    readingRunId,
    sourceFingerprint: completed.run.sourceFingerprint,
    title: completed.run.title,
    url: completed.run.url,
    totalSegments: completed.run.totalSegments,
    requestChars: inputChars,
    sourceAssistantMessageIds: completed.run.segments.map(
      (segment) => segment.assistantMessageId
    ),
  };
  return {
    success: true,
    run: completed.run,
    meta,
    inputChars,
    messages: [
      { role: "system", content: WEB_READING_OVERVIEW_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  };
}

export interface WebReadingOverviewAction {
  readingRunId: string;
  sourceFingerprint: string;
  label: "生成全文总览" | "重新生成全文总览";
}

/** 只把完整阅读运行的末段助手映射为可点击入口，本函数本身不会发起请求。 */
export function getWebReadingOverviewActions(
  messages: ChatMessage[]
): Map<string, WebReadingOverviewAction> {
  const readingRunIds = new Set<string>();
  for (const message of messages) {
    const runId = message.pageMeta?.readingRunId;
    if (
      message.pageMeta?.isWebPageReading &&
      typeof runId === "string" &&
      runId
    ) {
      readingRunIds.add(runId);
    }
  }

  const actions = new Map<string, WebReadingOverviewAction>();
  for (const readingRunId of readingRunIds) {
    const completed = deriveCompletedReadingRun(messages, readingRunId);
    if (!completed.success) continue;
    const hasCurrentOverview = messages.some((message, index) => {
      const assistant = messages[index + 1];
      return (
        message.role === "user" &&
        message.overviewMeta?.readingRunId === readingRunId &&
        message.overviewMeta.sourceFingerprint ===
          completed.run.sourceFingerprint &&
        assistant?.role === "assistant" &&
        assistant.status === "completed" &&
        typeof assistant.content === "string" &&
        Boolean(assistant.content.trim()) &&
        !assistant.errorMessage
      );
    });
    actions.set(completed.run.lastAssistantMessageId, {
      readingRunId,
      sourceFingerprint: completed.run.sourceFingerprint,
      label: hasCurrentOverview
        ? "重新生成全文总览"
        : "生成全文总览",
    });
  }
  return actions;
}

export function isWebReadingOverviewCurrent(
  messages: ChatMessage[],
  meta: WebReadingOverviewMeta
): boolean {
  const completed = deriveCompletedReadingRun(messages, meta.readingRunId);
  return (
    completed.success &&
    completed.run.sourceFingerprint === meta.sourceFingerprint
  );
}
