import { CodedError } from "./errors";

export const REQUEST_TIMEOUTS = {
  FETCH_HEADERS_MS: 20_000,
  FIRST_OUTPUT_MS: 60_000,
  THINKING_FIRST_OUTPUT_MS: 180_000,
  IDLE_MS: 60_000,
  TOTAL_MS: 10 * 60_000,
  ERROR_BODY_MS: 15_000,
  CONNECTION_TEST_MS: 15_000,
  KEEP_ALIVE_INTERVAL_MS: 25_000,
} as const;

export type RequestTimeoutStage =
  | "first-output"
  | "fetch-headers"
  | "idle"
  | "total"
  | "error-body"
  | "connection-test";

export interface RequestTimeoutPolicy {
  fetchHeadersMs: number;
  firstOutputMs: number;
  thinkingFirstOutputMs: number;
  idleMs: number;
  totalMs: number;
  errorBodyMs: number;
  connectionTestMs: number;
  keepAliveIntervalMs: number;
}

interface TimeoutClock {
  setTimeout: (
    handler: () => void,
    delay: number
  ) => ReturnType<typeof setTimeout>;
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void;
}

export interface RequestTimeoutRuntime {
  policy: RequestTimeoutPolicy;
  clock: TimeoutClock;
  keepAlive?: () => Promise<unknown> | unknown;
}

const DEFAULT_POLICY: RequestTimeoutPolicy = {
  fetchHeadersMs: REQUEST_TIMEOUTS.FETCH_HEADERS_MS,
  firstOutputMs: REQUEST_TIMEOUTS.FIRST_OUTPUT_MS,
  thinkingFirstOutputMs: REQUEST_TIMEOUTS.THINKING_FIRST_OUTPUT_MS,
  idleMs: REQUEST_TIMEOUTS.IDLE_MS,
  totalMs: REQUEST_TIMEOUTS.TOTAL_MS,
  errorBodyMs: REQUEST_TIMEOUTS.ERROR_BODY_MS,
  connectionTestMs: REQUEST_TIMEOUTS.CONNECTION_TEST_MS,
  keepAliveIntervalMs: REQUEST_TIMEOUTS.KEEP_ALIVE_INTERVAL_MS,
};

const DEFAULT_CLOCK: TimeoutClock = {
  setTimeout: (handler, delay) => setTimeout(handler, delay),
  clearTimeout: (timer) => clearTimeout(timer),
};

let testRuntime: RequestTimeoutRuntime | undefined;

function getDefaultKeepAlive(): RequestTimeoutRuntime["keepAlive"] {
  const browserApi =
    (globalThis as any).browser || (globalThis as any).chrome;
  const runtime = browserApi?.runtime;
  return typeof runtime?.getPlatformInfo === "function"
    ? () => runtime.getPlatformInfo()
    : undefined;
}

/** 仅供自动化测试注入可控时钟；传入 undefined 恢复生产策略。 */
export function setRequestTimeoutRuntimeForTests(
  runtime?: RequestTimeoutRuntime
): void {
  testRuntime = runtime;
}

export function getRequestTimeoutRuntime(): RequestTimeoutRuntime {
  return (
    testRuntime || {
      policy: DEFAULT_POLICY,
      clock: DEFAULT_CLOCK,
      keepAlive: getDefaultKeepAlive(),
    }
  );
}

function formatDuration(milliseconds: number): string {
  return milliseconds < 1000
    ? `${milliseconds} 毫秒`
    : `${Math.round(milliseconds / 1000)} 秒`;
}

export class RequestTimeoutError extends CodedError {
  readonly stage: RequestTimeoutStage;

  constructor(stage: RequestTimeoutStage, duration: number) {
    const durationText = formatDuration(duration);
    const messages: Record<RequestTimeoutStage, string> = {
      "fetch-headers": `连接 AI 服务超时（${durationText} 内未收到响应头），请检查网络或服务状态后手动重试。`,
      "first-output": `等待模型首次有效输出超时（${durationText}）。可能是网络连接缓慢或模型暂时无响应，请手动重试。`,
      idle: `模型输出空闲超时：连续 ${durationText} 未收到新的有效内容。已生成内容已保留，请手动重试。`,
      total: `本次请求总时限超时（${durationText}），已停止生成。已生成内容已保留，请手动重试。`,
      "error-body": `读取服务商错误信息超时（${durationText}），请求已停止，请手动重试。`,
      "connection-test": `API 连接测试超时（${durationText}），请检查 API 地址、网络或代理后重试。`,
    };
    super(messages[stage], "TIMEOUT", messages[stage]);
    this.name = "RequestTimeoutError";
    this.stage = stage;
  }
}

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("请求已取消", "AbortError");
  }
  const error = new Error("请求已取消");
  error.name = "AbortError";
  return error;
}

export class RequestTimeoutGuard {
  private readonly runtime: RequestTimeoutRuntime;
  private readonly terminalPromise: Promise<never>;
  private rejectTerminal!: (error: unknown) => void;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private firstOutputTimer?: ReturnType<typeof setTimeout>;
  private fetchHeadersTimer?: ReturnType<typeof setTimeout>;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private terminal = false;
  private terminalError: unknown;
  private disposed = false;
  private streamCompleted = false;

  constructor(
    private readonly controller: AbortController,
    options: {
      thinkingEnabled?: boolean;
      armStreamingTimeouts?: boolean;
      runtime?: RequestTimeoutRuntime;
    } = {}
  ) {
    this.runtime = options.runtime || getRequestTimeoutRuntime();
    this.terminalPromise = new Promise<never>((_resolve, reject) => {
      this.rejectTerminal = reject;
    });
    // 终态可能发生在两个 await 之间；提前挂载拒绝处理，避免未处理 Promise。
    void this.terminalPromise.catch(() => undefined);
    this.controller.signal.addEventListener("abort", this.handleAbort, {
      once: true,
    });

    if (this.controller.signal.aborted) {
      this.handleAbort();
      return;
    }

    if (options.armStreamingTimeouts !== false) {
      const firstOutputMs = options.thinkingEnabled
        ? this.runtime.policy.thinkingFirstOutputMs
        : this.runtime.policy.firstOutputMs;
      this.firstOutputTimer = this.armTimer(
        firstOutputMs,
        "first-output"
      );
      this.armTimer(this.runtime.policy.totalMs, "total");
    }
    this.scheduleKeepAlive();
  }

  get activeTimerCount(): number {
    return this.timers.size;
  }

  async run<T>(operation: Promise<T>): Promise<T> {
    if (this.terminal) {
      void operation.catch(() => undefined);
      throw this.terminalError;
    }
    return Promise.race([operation, this.terminalPromise]);
  }

  async runStage<T>(
    operation: Promise<T>,
    stage: "error-body" | "connection-test"
  ): Promise<T> {
    if (this.terminal) {
      void operation.catch(() => undefined);
      throw this.terminalError;
    }
    const duration =
      stage === "error-body"
        ? this.runtime.policy.errorBodyMs
        : this.runtime.policy.connectionTestMs;
    const timer = this.armTimer(duration, stage);
    try {
      return await this.run(operation);
    } finally {
      this.clearTimer(timer);
    }
  }

  startFetchHeadersTimeout(): void {
    if (this.terminal || this.disposed || this.streamCompleted) return;
    this.clearTimer(this.fetchHeadersTimer);
    this.fetchHeadersTimer = this.armTimer(
      this.runtime.policy.fetchHeadersMs,
      "fetch-headers"
    );
  }

  markFetchHeadersReceived(): void {
    this.clearTimer(this.fetchHeadersTimer);
    this.fetchHeadersTimer = undefined;
  }

  markMeaningfulOutput(): void {
    if (this.terminal || this.disposed || this.streamCompleted) return;
    this.clearTimer(this.firstOutputTimer);
    this.firstOutputTimer = undefined;
    this.clearTimer(this.idleTimer);
    this.idleTimer = this.armTimer(this.runtime.policy.idleMs, "idle");
  }

  completeStream(): void {
    if (this.streamCompleted) return;
    this.streamCompleted = true;
    this.clearAllTimers();
    this.controller.signal.removeEventListener("abort", this.handleAbort);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearAllTimers();
    this.controller.signal.removeEventListener("abort", this.handleAbort);
  }

  private armTimer(
    duration: number,
    stage: RequestTimeoutStage
  ): ReturnType<typeof setTimeout> {
    const timer = this.runtime.clock.setTimeout(() => {
      this.timers.delete(timer);
      this.triggerTimeout(stage, duration);
    }, duration);
    this.timers.add(timer);
    return timer;
  }

  private clearTimer(timer?: ReturnType<typeof setTimeout>): void {
    if (timer === undefined || !this.timers.delete(timer)) return;
    this.runtime.clock.clearTimeout(timer);
  }

  private clearAllTimers(): void {
    for (const timer of this.timers) {
      this.runtime.clock.clearTimeout(timer);
    }
    this.timers.clear();
    this.firstOutputTimer = undefined;
    this.fetchHeadersTimer = undefined;
    this.idleTimer = undefined;
  }

  private scheduleKeepAlive(): void {
    if (
      !this.runtime.keepAlive ||
      this.terminal ||
      this.disposed ||
      this.streamCompleted
    ) {
      return;
    }

    const timer = this.runtime.clock.setTimeout(() => {
      this.timers.delete(timer);
      if (this.terminal || this.disposed || this.streamCompleted) return;

      try {
        void Promise.resolve(this.runtime.keepAlive?.()).catch(() => undefined);
      } catch {
        // 保活失败不改变业务请求状态，下一周期继续尝试。
      }
      if (!this.terminal && !this.disposed && !this.streamCompleted) {
        this.scheduleKeepAlive();
      }
    }, this.runtime.policy.keepAliveIntervalMs);
    this.timers.add(timer);
  }

  private triggerTimeout(stage: RequestTimeoutStage, duration: number): void {
    if (this.terminal || this.disposed || this.streamCompleted) return;
    this.terminal = true;
    this.clearAllTimers();
    this.controller.signal.removeEventListener("abort", this.handleAbort);
    this.terminalError = new RequestTimeoutError(stage, duration);
    this.rejectTerminal(this.terminalError);
    if (!this.controller.signal.aborted) {
      this.controller.abort();
    }
  }

  private handleAbort = (): void => {
    if (this.terminal || this.disposed || this.streamCompleted) return;
    this.terminal = true;
    this.terminalError = createAbortError();
    this.clearAllTimers();
    this.controller.signal.removeEventListener("abort", this.handleAbort);
    this.rejectTerminal(this.terminalError);
  };
}

export function isRequestTimeoutError(
  error: unknown
): error is RequestTimeoutError {
  return error instanceof CodedError && error.code === "TIMEOUT";
}
