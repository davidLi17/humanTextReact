import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { ApiService } from "../../entrypoints/background/apiService.ts";
import { HistoryManager } from "../../entrypoints/background/historyManager.ts";
import { MessageUtils } from "../../entrypoints/background/messageUtils.ts";
import { RequestManager } from "../../entrypoints/background/requestManager.ts";
import { TranslationService } from "../../entrypoints/background/translationService.ts";
import { formatPopupTranslationError } from "../../entrypoints/content/popupManager.ts";
import { CodedError } from "../../entrypoints/shared/errors.ts";
import {
  RequestTimeoutGuard,
  setRequestTimeoutRuntimeForTests,
} from "../../entrypoints/shared/requestTimeout.ts";
import { createSidepanelTarget } from "../../entrypoints/shared/requestProtocol.ts";
import { SettingsUtils } from "../../entrypoints/shared/settingsUtils.ts";
import {
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

class ManualClock {
  now = 0;
  nextId = 1;
  timers = new Map();

  setTimeout = (handler, delay) => {
    const id = this.nextId++;
    this.timers.set(id, { handler, at: this.now + delay });
    return id;
  };

  clearTimeout = (id) => {
    this.timers.delete(id);
  };

  advanceBy(milliseconds) {
    const target = this.now + milliseconds;
    while (true) {
      const next = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      const [id, timer] = next;
      this.timers.delete(id);
      this.now = timer.at;
      timer.handler();
    }
    this.now = target;
  }

  get size() {
    return this.timers.size;
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createControlledReader({ cancelHangs = false } = {}) {
  const queuedReads = [];
  const readWaiters = [];
  let cancelCalls = 0;
  let releaseCalls = 0;

  const reader = {
    read() {
      const pending = deferred();
      const waiter = readWaiters.shift();
      if (waiter) waiter(pending);
      else queuedReads.push(pending);
      return pending.promise;
    },
    cancel() {
      cancelCalls += 1;
      return cancelHangs ? new Promise(() => {}) : Promise.resolve();
    },
    releaseLock() {
      releaseCalls += 1;
    },
  };

  return {
    reader,
    nextRead() {
      const queued = queuedReads.shift();
      if (queued) return Promise.resolve(queued);
      return new Promise((resolve) => readWaiters.push(resolve));
    },
    get cancelCalls() {
      return cancelCalls;
    },
    get releaseCalls() {
      return releaseCalls;
    },
  };
}

function sse(delta) {
  return new TextEncoder().encode(
    `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`
  );
}

function doneSse(delta = {}) {
  return new TextEncoder().encode(
    `data: ${JSON.stringify({ choices: [{ delta }] })}\n\ndata: [DONE]\n\n`
  );
}

const TEST_POLICY = {
  fetchHeadersMs: 4,
  firstOutputMs: 10,
  thinkingFirstOutputMs: 30,
  idleMs: 10,
  totalMs: 50,
  errorBodyMs: 5,
  connectionTestMs: 5,
  keepAliveIntervalMs: 3,
};

const restoreGlobals = preserveGlobals("fetch");
const originalGetSettings = SettingsUtils.getSettings;
const originalSendRuntimeMessage = MessageUtils.sendRuntimeMessage;
const originalSaveHistory = HistoryManager.saveTranslationHistory;

let clock;
let sentMessages;
let savedHistory;
let requestCounter = 0;
const requestIds = new Set();

function createTranslationRequest(sessionId = "timeout-session") {
  const requestId = `timeout-request-${++requestCounter}`;
  requestIds.add(requestId);
  RequestManager.createRequest(requestId, createSidepanelTarget(sessionId));
  const context = RequestManager.claimRequest(requestId);
  if (!context) throw new Error("测试请求未成功领取");
  return { requestId, context };
}

function responseWithReader(reader) {
  return {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
  };
}

beforeEach(() => {
  clock = new ManualClock();
  sentMessages = [];
  savedHistory = [];
  setRequestTimeoutRuntimeForTests({ policy: TEST_POLICY, clock });
  SettingsUtils.getSettings = async () => ({
    apiKey: "test-key",
    baseUrl: "https://example.com/chat",
    model: "test-model",
    temperature: 0,
    promptTemplate: "测试提示词",
    thinkingEnabled: false,
    showSelectionToolbar: true,
    contextualSelectionEnabled: false,
    logLevel: "off",
    theme: "system",
  });
  MessageUtils.sendRuntimeMessage = async (message) => {
    sentMessages.push(message);
    return true;
  };
  HistoryManager.saveTranslationHistory = async (...args) => {
    savedHistory.push(args);
  };
});

afterEach(() => {
  restoreGlobals();
  SettingsUtils.getSettings = originalGetSettings;
  MessageUtils.sendRuntimeMessage = originalSendRuntimeMessage;
  HistoryManager.saveTranslationHistory = originalSaveHistory;
  setRequestTimeoutRuntimeForTests(undefined);
  for (const requestId of requestIds) {
    RequestManager.cleanupRequest(requestId);
  }
  requestIds.clear();
});

describe("RequestTimeoutGuard", () => {
  test("content popup preserves every staged translation timeout message", () => {
    for (const message of [
      "连接 AI 服务超时（20 秒内未收到响应头）",
      "等待模型首次有效输出超时（60 秒）",
      "模型输出空闲超时：连续 60 秒未收到新的有效内容",
      "本次请求总时限超时（600 秒）",
      "读取服务商错误信息超时（15 秒）",
    ]) {
      expect(formatPopupTranslationError(message)).toBe(`翻译失败：${message}`);
    }
  });

  test("deep thinking uses the longer first-output deadline and clears timers", async () => {
    const controller = new AbortController();
    const guard = new RequestTimeoutGuard(controller, {
      thinkingEnabled: true,
      runtime: {
        clock,
        policy: { ...TEST_POLICY, totalMs: 50 },
      },
    });
    const operation = guard.run(new Promise(() => {}));

    clock.advanceBy(29);
    expect(controller.signal.aborted).toBe(false);
    clock.advanceBy(1);
    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "first-output",
    });
    expect(guard.activeTimerCount).toBe(0);
    expect(clock.size).toBe(0);
    await expect(guard.run(Promise.resolve("late success"))).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "first-output",
    });
    await expect(
      guard.run(Promise.reject(new Error("late failure")))
    ).rejects.toMatchObject({ code: "TIMEOUT", stage: "first-output" });
    guard.dispose();
  });

  test("an already-aborted guard rejects later completed operations", async () => {
    const controller = new AbortController();
    const guard = new RequestTimeoutGuard(controller, {
      runtime: {
        clock,
        policy: { ...TEST_POLICY, totalMs: 25 },
      },
    });
    controller.abort();

    await expect(guard.run(Promise.resolve("late success"))).rejects.toMatchObject({
      name: "AbortError",
    });
    await expect(
      guard.runStage(Promise.resolve("late body"), "error-body")
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(clock.size).toBe(0);
    guard.dispose();
  });

  test("keepalive does not extend output deadlines and stops at timeout", async () => {
    const controller = new AbortController();
    let keepAliveCalls = 0;
    const guard = new RequestTimeoutGuard(controller, {
      runtime: {
        clock,
        policy: TEST_POLICY,
        keepAlive: () => {
          keepAliveCalls += 1;
        },
      },
    });
    const operation = guard.run(new Promise(() => {}));

    clock.advanceBy(3);
    await Promise.resolve();
    await Promise.resolve();
    clock.advanceBy(3);
    await Promise.resolve();
    await Promise.resolve();
    clock.advanceBy(3);
    await Promise.resolve();
    await Promise.resolve();
    clock.advanceBy(1);

    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "first-output",
    });
    expect(keepAliveCalls).toBe(3);
    expect(clock.size).toBe(0);
  });

  test("an in-flight keepalive cannot rearm after dispose", async () => {
    const controller = new AbortController();
    const keepAlivePending = deferred();
    const guard = new RequestTimeoutGuard(controller, {
      runtime: {
        clock,
        policy: TEST_POLICY,
        keepAlive: () => keepAlivePending.promise,
      },
    });

    clock.advanceBy(3);
    expect(clock.size).toBe(3);
    guard.dispose();
    keepAlivePending.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(clock.size).toBe(0);
    expect(guard.activeTimerCount).toBe(0);
  });

  test("stream completion removes keepalive before its first tick", () => {
    const controller = new AbortController();
    let keepAliveCalls = 0;
    const guard = new RequestTimeoutGuard(controller, {
      runtime: {
        clock,
        policy: TEST_POLICY,
        keepAlive: () => {
          keepAliveCalls += 1;
        },
      },
    });

    guard.completeStream();
    clock.advanceBy(100);

    expect(keepAliveCalls).toBe(0);
    expect(clock.size).toBe(0);
  });

  test("total deadline wins even when meaningful output resets idle", async () => {
    const controller = new AbortController();
    const guard = new RequestTimeoutGuard(controller, {
      runtime: {
        clock,
        policy: { ...TEST_POLICY, totalMs: 25 },
      },
    });
    const operation = guard.run(new Promise(() => {}));

    guard.markMeaningfulOutput();
    clock.advanceBy(9);
    guard.markMeaningfulOutput();
    clock.advanceBy(9);
    guard.markMeaningfulOutput();
    clock.advanceBy(7);

    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "total",
    });
    expect(clock.size).toBe(0);
  });
});

describe("TranslationService timeout integration", () => {
  test("the headers deadline wins before first-output when fetch hangs", async () => {
    const started = deferred();
    setTestGlobal("fetch",  () => {
      started.resolve();
      return new Promise(() => {});
    });
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    await started.promise;
    clock.advanceBy(4);
    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "fetch-headers",
    });
    expect(sentMessages.at(-1).error).toContain("连接 AI 服务超时");
    expect(sentMessages.at(-1).error).toContain("手动重试");
    expect(savedHistory).toHaveLength(0);
    expect(clock.size).toBe(0);
  });

  test("headers, heartbeats and role-only chunks do not extend first output", async () => {
    const controlled = createControlledReader();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    const first = await controlled.nextRead();
    clock.advanceBy(4);
    first.resolve({
      value: new TextEncoder().encode(": keep-alive\n\n"),
      done: false,
    });
    const second = await controlled.nextRead();
    clock.advanceBy(4);
    second.resolve({ value: sse({ role: "assistant" }), done: false });
    await controlled.nextRead();
    clock.advanceBy(2);

    await expect(operation).rejects.toThrow("首次有效输出超时");
    expect(savedHistory).toHaveLength(0);
  });

  test("times out after headers when the first stream read has no content", async () => {
    const controlled = createControlledReader();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    await controlled.nextRead();
    clock.advanceBy(10);

    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "first-output",
    });
    expect(sentMessages.at(-1).error).toContain("首次有效输出超时");
  });

  test("headers do not replace the longer thinking first-output deadline", async () => {
    const controlled = createControlledReader();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText(
      { text: "测试", thinkingEnabled: true },
      context
    );

    await controlled.nextRead();
    clock.advanceBy(29);
    expect(context.controller.signal.aborted).toBe(false);
    clock.advanceBy(1);

    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "first-output",
    });
  });

  test("keeps partial content visible when the stream becomes idle", async () => {
    const controlled = createControlledReader();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    const first = await controlled.nextRead();
    first.resolve({ value: sse({ content: "已生成部分" }), done: false });
    await controlled.nextRead();
    clock.advanceBy(10);

    await expect(operation).rejects.toThrow("模型输出空闲超时");
    expect(sentMessages[0].content).toBe("已生成部分");
    expect(sentMessages.at(-1).error).toContain("已生成内容已保留");
    expect(savedHistory).toHaveLength(0);
    expect(controlled.cancelCalls).toBe(1);
    expect(controlled.releaseCalls).toBe(1);
  });

  test("reasoning-only output starts the idle phase", async () => {
    const controlled = createControlledReader();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText(
      { text: "测试", thinkingEnabled: true },
      context
    );

    const first = await controlled.nextRead();
    first.resolve({
      value: sse({ reasoning_content: "正在分析" }),
      done: false,
    });
    await controlled.nextRead();
    clock.advanceBy(10);

    await expect(operation).rejects.toThrow("模型输出空闲超时");
    expect(sentMessages[0].reasoningContent).toBe("正在分析");
  });

  test("the total deadline stops a stream that stays active", async () => {
    let keepAliveCalls = 0;
    setRequestTimeoutRuntimeForTests({
      clock,
      policy: { ...TEST_POLICY, totalMs: 25 },
      keepAlive: () => {
        keepAliveCalls += 1;
      },
    });
    const controlled = createControlledReader();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    const first = await controlled.nextRead();
    first.resolve({ value: sse({ content: "一" }), done: false });
    const second = await controlled.nextRead();
    clock.advanceBy(9);
    second.resolve({ value: sse({ content: "二" }), done: false });
    const third = await controlled.nextRead();
    clock.advanceBy(9);
    third.resolve({ value: sse({ content: "三" }), done: false });
    await controlled.nextRead();
    clock.advanceBy(7);

    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "total",
    });
    expect(sentMessages.at(-1).error).toContain("总时限");
    expect(savedHistory).toHaveLength(0);
    expect(keepAliveCalls).toBeGreaterThan(0);
    expect(clock.size).toBe(0);
  });

  test("timeout while delivering an update includes the latest accumulated output", async () => {
    const controlled = createControlledReader();
    const deliveryStarted = deferred();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    MessageUtils.sendRuntimeMessage = (message) => {
      sentMessages.push(message);
      if (!message.error) {
        deliveryStarted.resolve();
        return new Promise(() => {});
      }
      return Promise.resolve(true);
    };
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText(
      { text: "测试", thinkingEnabled: true },
      context
    );

    const first = await controlled.nextRead();
    first.resolve({
      value: sse({ content: "最新正文", reasoning_content: "最新思考" }),
      done: false,
    });
    await deliveryStarted.promise;
    clock.advanceBy(10);

    await expect(operation).rejects.toMatchObject({
      code: "TIMEOUT",
      stage: "idle",
    });
    expect(sentMessages.at(-1)).toMatchObject({
      error: expect.stringContaining("输出空闲超时"),
      content: "最新正文",
      reasoningContent: "最新思考",
      hasReasoning: true,
      done: true,
    });
    expect(savedHistory).toHaveLength(0);
    expect(controlled.cancelCalls).toBe(1);
    expect(clock.size).toBe(0);
  });

  test("user cancellation stays silent and clears every timer", async () => {
    const started = deferred();
    setTestGlobal("fetch",  () => {
      started.resolve();
      return new Promise(() => {});
    });
    const { requestId, context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    await started.promise;
    RequestManager.cleanupRequest(requestId);
    await expect(operation).resolves.toBeUndefined();
    expect(sentMessages).toHaveLength(0);
    expect(clock.size).toBe(0);
  });

  test("a replacement aborts only the old request and cannot be polluted later", async () => {
    const oldStarted = deferred();
    const successfulReader = createControlledReader({ cancelHangs: true });
    let fetchCount = 0;
    setTestGlobal("fetch",  () => {
      fetchCount += 1;
      if (fetchCount === 1) {
        oldStarted.resolve();
        return new Promise(() => {});
      }
      return Promise.resolve(responseWithReader(successfulReader.reader));
    });

    const target = createSidepanelTarget("shared-target");
    const oldId = `timeout-request-${++requestCounter}`;
    requestIds.add(oldId);
    RequestManager.createRequest(oldId, target);
    const oldContext = RequestManager.claimRequest(oldId);
    const oldOperation = TranslationService.translateText(
      { text: "旧请求" },
      oldContext
    );
    await oldStarted.promise;

    const newId = `timeout-request-${++requestCounter}`;
    requestIds.add(newId);
    RequestManager.createRequest(newId, target);
    const newContext = RequestManager.claimRequest(newId);
    const newOperation = TranslationService.translateText(
      { text: "新请求" },
      newContext
    );
    await expect(oldOperation).resolves.toBeUndefined();

    const read = await successfulReader.nextRead();
    read.resolve({ value: doneSse({ content: "新结果" }), done: false });
    await expect(newOperation).resolves.toBe("新结果");
    clock.advanceBy(100);

    expect(sentMessages.some((message) => message.error)).toBe(false);
    expect(successfulReader.cancelCalls).toBe(1);
    expect(clock.size).toBe(0);
  });

  test("normal EOF completes, saves history and clears timers", async () => {
    const controlled = createControlledReader();
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    const first = await controlled.nextRead();
    first.resolve({ value: sse({ content: "完整结果" }), done: false });
    const second = await controlled.nextRead();
    second.resolve({ value: undefined, done: true });

    await expect(operation).resolves.toBe("完整结果");
    expect(sentMessages.at(-1)).toMatchObject({ content: "完整结果", done: true });
    expect(savedHistory).toHaveLength(1);
    expect(controlled.cancelCalls).toBe(0);
    expect(controlled.releaseCalls).toBe(1);
    expect(clock.size).toBe(0);
  });

  test("DONE is terminal even when reader.cancel never settles", async () => {
    const controlled = createControlledReader({ cancelHangs: true });
    setTestGlobal("fetch",  async () => responseWithReader(controlled.reader));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    const first = await controlled.nextRead();
    first.resolve({ value: doneSse({ content: "完成" }), done: false });

    await expect(operation).resolves.toBe("完成");
    expect(controlled.cancelCalls).toBe(1);
    expect(controlled.releaseCalls).toBe(1);
    expect(savedHistory).toHaveLength(1);
    expect(clock.size).toBe(0);
  });

  test("a hanging non-2xx error body has its own timeout", async () => {
    const bodyStarted = deferred();
    setTestGlobal("fetch",  async () => ({
      ok: false,
      status: 500,
      text: () => {
        bodyStarted.resolve();
        return new Promise(() => {});
      },
    }));
    const { context } = createTranslationRequest();
    const operation = TranslationService.translateText({ text: "测试" }, context);

    await bodyStarted.promise;
    clock.advanceBy(5);
    await expect(operation).rejects.toThrow("读取服务商错误信息超时");
    expect(sentMessages.at(-1).error).toContain("手动重试");
    expect(clock.size).toBe(0);
  });

  test("a completed non-2xx body keeps the existing provider error", async () => {
    setTestGlobal("fetch",  async () => ({
      ok: false,
      status: 500,
      text: async () => '{"message":"模型过载"}',
    }));
    const { context } = createTranslationRequest();

    await expect(
      TranslationService.translateText({ text: "测试" }, context)
    ).rejects.toThrow("API 请求失败: 500 - 模型过载");
    expect(sentMessages.at(-1).error).toContain("模型过载");
    expect(savedHistory).toHaveLength(0);
    expect(clock.size).toBe(0);
  });
});

describe("ApiService connection timeout", () => {
  test("returns success and clears its connection-test timer", async () => {
    setTestGlobal("fetch",  async () => ({ ok: true, status: 200 }));
    await expect(
      ApiService.testApiConnection(
        "test-key",
        "https://example.com/chat",
        "test-model"
      )
    ).resolves.toBe(true);
    expect(clock.size).toBe(0);
  });

  test("bounds a connection test even when fetch ignores abort", async () => {
    const started = deferred();
    let keepAliveCalls = 0;
    setRequestTimeoutRuntimeForTests({
      clock,
      policy: TEST_POLICY,
      keepAlive: () => {
        keepAliveCalls += 1;
      },
    });
    setTestGlobal("fetch",  () => {
      started.resolve();
      return new Promise(() => {});
    });
    const operation = ApiService.testApiConnection(
      "test-key",
      "https://example.com/chat",
      "test-model"
    );

    await started.promise;
    clock.advanceBy(3);
    await Promise.resolve();
    await Promise.resolve();
    clock.advanceBy(2);
    let caught;
    try {
      await operation;
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CodedError);
    expect(caught.code).toBe("TIMEOUT");
    expect(caught.message).toContain("连接测试超时");
    expect(keepAliveCalls).toBe(1);
    expect(clock.size).toBe(0);
  });
});
