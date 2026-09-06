import {
  serializeWebReadingProgressMap,
  WEB_READING_PROGRESS_STORAGE_KEY,
  type SerializedWebReadingProgress,
  type WebReadingProgressState,
} from "@/entrypoints/shared/webReadingState";
import type { ChatSession } from "@/entrypoints/shared/chatTypes";

export const SIDEPANEL_SESSIONS_STORAGE_KEY = "sidepanel_chat_sessions";
export const SIDEPANEL_ACTIVE_SESSION_STORAGE_KEY =
  "sidepanel_active_session_id";
export { WEB_READING_PROGRESS_STORAGE_KEY };

export interface WebReadingHydrationSnapshot {
  sessions: unknown;
  activeSessionId: unknown;
  webReadingProgress: unknown;
}

export interface WebReadingProgressWriteResult
  extends SerializedWebReadingProgress {
  success: true;
}

export interface PreparedWebReadingProgressCheckpoint {
  progressMap: Map<string, WebReadingProgressState>;
  sessions: ChatSession[];
  prioritySessionId?: string;
}

/**
 * 生产编排使用的首写快照：先纯计算 next，再由调用方同步更新 ref/React，
 * 最终只入队一份同时含 sessions 与 progress 的可恢复检查点。
 */
export function prepareWebReadingProgressCheckpoint(
  previous: Map<string, WebReadingProgressState>,
  updater: (
    current: Map<string, WebReadingProgressState>
  ) => Map<string, WebReadingProgressState>,
  sessions: ChatSession[],
  prioritySessionId?: string
): PreparedWebReadingProgressCheckpoint | null {
  const progressMap = updater(previous);
  return progressMap === previous
    ? null
    : { progressMap, sessions, prioritySessionId };
}

/** 同一连续保存失败周期只提示一次，任一成功写入后解除抑制。 */
export class WebReadingProgressFailureGate {
  private failureReported = false;

  recordFailure(): boolean {
    if (this.failureReported) return false;
    this.failureReported = true;
    return true;
  }

  recordSuccess(): void {
    this.failureReported = false;
  }
}

/** hydrate 前拒绝消费待办；hydrate 后整个挂载周期最多领取一次。 */
export class WebReadingPendingActionGate {
  private claimed = false;

  tryClaim(hydrated: boolean): boolean {
    if (!hydrated || this.claimed) return false;
    this.claimed = true;
    return true;
  }
}

interface StorageArea {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

function getLocalStorageArea(): StorageArea | null {
  const globalObject = globalThis as any;
  return (
    globalObject.browser?.storage?.local ||
    globalObject.chrome?.storage?.local ||
    null
  );
}

/** 一次读取 sessions、activeSessionId 与独立进度键，期间绝不写存储。 */
export async function loadWebReadingHydrationSnapshot(
  storage = getLocalStorageArea()
): Promise<WebReadingHydrationSnapshot> {
  if (!storage) throw new Error("当前环境没有可用的本地存储");
  const stored = await storage.get([
    SIDEPANEL_SESSIONS_STORAGE_KEY,
    SIDEPANEL_ACTIVE_SESSION_STORAGE_KEY,
    WEB_READING_PROGRESS_STORAGE_KEY,
  ]);
  return {
    sessions: stored[SIDEPANEL_SESSIONS_STORAGE_KEY],
    activeSessionId: stored[SIDEPANEL_ACTIVE_SESSION_STORAGE_KEY],
    webReadingProgress: stored[WEB_READING_PROGRESS_STORAGE_KEY],
  };
}

/**
 * 独立进度键的单写队列。每次入队时先生成不可变快照，写入严格串行，
 * 因此后入队的推进或删除一定最终胜出，旧写不会复活已删除记录。
 */
export class WebReadingProgressStorage {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: StorageArea | null = getLocalStorageArea()) {}

  enqueueWrite(
    progressMap: Map<string, WebReadingProgressState>,
    prioritySessionId?: string
  ): Promise<WebReadingProgressWriteResult> {
    return this.enqueueCheckpoint({ progressMap, prioritySessionId });
  }

  enqueueCheckpoint(params: {
    progressMap: Map<string, WebReadingProgressState>;
    sessions?: ChatSession[];
    activeSessionId?: string;
    prioritySessionId?: string;
  }): Promise<WebReadingProgressWriteResult> {
    const serialized = serializeWebReadingProgressMap(
      params.progressMap,
      params.prioritySessionId
    );
    const sessionsSnapshot = params.sessions
      ? structuredClone(params.sessions)
      : undefined;
    const operation = this.writeQueue.then(async () => {
      if (!this.storage) throw new Error("当前环境没有可用的本地存储");
      const payload: Record<string, unknown> = {
        [WEB_READING_PROGRESS_STORAGE_KEY]: serialized.store,
      };
      if (sessionsSnapshot) {
        payload[SIDEPANEL_SESSIONS_STORAGE_KEY] = sessionsSnapshot;
      }
      if (params.activeSessionId !== undefined) {
        payload[SIDEPANEL_ACTIVE_SESSION_STORAGE_KEY] =
          params.activeSessionId;
      }
      await this.storage.set(payload);
      return { success: true as const, ...serialized };
    });
    this.writeQueue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }
}
