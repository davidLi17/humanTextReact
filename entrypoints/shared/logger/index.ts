import {
  LOG_LEVELS,
  MESSAGE_TYPES,
  type LogLevel,
} from "@/entrypoints/shared/constants";
import {
  DIAGNOSTIC_STATE_KEY,
  appendDiagnosticRecords,
  isDiagnosticSessionActive,
  sanitizeLogValue,
} from "./diagnostics";
import type {
  DiagnosticLogRecord,
  DiagnosticSessionState,
  LoggerContext,
  LoggerMethod,
} from "./types";

const DEBUG_NAMESPACE_PREFIX =
  (typeof globalThis !== "undefined" &&
    (globalThis as any).DEBUG_NAMESPACE_PREFIX) ||
  "human-text";
const MAX_PENDING_LOGS = 100;
const DIAGNOSTIC_BATCH_DELAY_MS = 200;

interface LogSettingsStorage {
  logLevel?: LogLevel;
  settings?: {
    logLevel?: LogLevel;
  };
  [DIAGNOSTIC_STATE_KEY]?: DiagnosticSessionState;
}

interface PendingLog {
  namespace: string;
  emoji: string;
  prefix: string;
  method: LoggerMethod;
  args: unknown[];
  timestamp: number;
}

let currentLogLevel: LogLevel = LOG_LEVELS.OFF;
let currentContext: LoggerContext = detectLoggerContext();
let currentDiagnosticState: DiagnosticSessionState | null = null;
let initialized = false;
let initializationPromise: Promise<void> | null = null;
let storageListenerRegistered = false;
let pendingLogs: PendingLog[] = [];
let diagnosticBatch: DiagnosticLogRecord[] = [];
let diagnosticBatchTimer: ReturnType<typeof setTimeout> | undefined;
let diagnosticExpirationHandled = false;
let recordSequence = 0;

function getBrowserApi(): any {
  return (globalThis as any).browser;
}

function detectLoggerContext(): LoggerContext {
  if (typeof document === "undefined") return "background";

  const protocol = globalThis.location?.protocol;
  if (protocol !== "chrome-extension:" && protocol !== "moz-extension:") {
    return "content";
  }

  const pathname = globalThis.location?.pathname || "";
  return pathname.includes("options") ? "options" : "popup";
}

function isLogLevel(value: unknown): value is LogLevel {
  return Object.values(LOG_LEVELS).includes(value as LogLevel);
}

function resolveStoredLogLevel(
  storage: LogSettingsStorage | undefined
): LogLevel | undefined {
  const value = storage?.settings?.logLevel ?? storage?.logLevel;
  return isLogLevel(value) ? value : undefined;
}

function consoleMethodFor(method: LoggerMethod): "debug" | "info" | "warn" | "error" {
  switch (method) {
    case "warn":
      return "warn";
    case "error":
      return "error";
    case "info":
    case "success":
      return "info";
    default:
      return "debug";
  }
}

function findRequestId(args: unknown[]): string | undefined {
  for (const arg of args) {
    if (
      arg &&
      typeof arg === "object" &&
      "requestId" in arg &&
      typeof (arg as any).requestId === "string"
    ) {
      return (arg as any).requestId;
    }
  }
  return undefined;
}

function createRecord(log: PendingLog): DiagnosticLogRecord {
  const sanitizedArgs = log.args.map((arg) => sanitizeLogValue(arg));
  const firstArg = sanitizedArgs[0];
  const message =
    typeof firstArg === "string" ? firstArg : `${log.emoji} ${log.namespace}`;
  const extensionVersion = getBrowserApi()?.runtime?.getManifest?.()?.version;

  recordSequence += 1;
  return {
    id: `${log.timestamp}-${recordSequence}`,
    timestamp: log.timestamp,
    level: log.method,
    context: currentContext,
    namespace: `${log.prefix}:${log.namespace}`,
    message,
    data: typeof firstArg === "string" ? sanitizedArgs.slice(1) : sanitizedArgs,
    requestId: findRequestId(log.args),
    extensionVersion,
  };
}

function writeToConsole(log: PendingLog, record: DiagnosticLogRecord): void {
  const method = consoleMethodFor(log.method);
  const label = `[${record.namespace}][${record.context}][${log.method}]`;
  const args = record.data.length > 0 ? record.data : [];
  console[method](`${label} ${log.emoji} ${record.message}`, ...args);
}

function isDiagnosticsActive(): boolean {
  const active = isDiagnosticSessionActive(currentDiagnosticState);
  if (!active && currentDiagnosticState?.enabled && !diagnosticExpirationHandled) {
    diagnosticExpirationHandled = true;
    currentDiagnosticState = null;
    void getBrowserApi()?.storage?.local
      ?.remove(DIAGNOSTIC_STATE_KEY)
      .catch(() => undefined);
  }
  return active;
}

async function flushDiagnosticBatch(): Promise<void> {
  if (diagnosticBatchTimer) {
    clearTimeout(diagnosticBatchTimer);
    diagnosticBatchTimer = undefined;
  }

  const records = diagnosticBatch;
  diagnosticBatch = [];
  if (records.length === 0) return;

  try {
    if (currentContext === "background") {
      await appendDiagnosticRecords(records);
      return;
    }

    await getBrowserApi()?.runtime?.sendMessage({
      action: MESSAGE_TYPES.APPEND_DIAGNOSTIC_LOGS,
      records,
    });
  } catch (error) {
    console.error("[human-text:logger] 诊断日志写入失败", error);
  }
}

function queueDiagnosticRecord(
  record: DiagnosticLogRecord,
  flushImmediately = false
): void {
  diagnosticBatch.push(record);

  if (flushImmediately) {
    void flushDiagnosticBatch();
    return;
  }
  if (!diagnosticBatchTimer) {
    diagnosticBatchTimer = setTimeout(
      () => void flushDiagnosticBatch(),
      DIAGNOSTIC_BATCH_DELAY_MS
    );
  }
}

function processLog(log: PendingLog): void {
  const diagnosticsActive = isDiagnosticsActive();
  if (!diagnosticsActive && !shouldLog(log.method)) return;

  const record = createRecord(log);
  writeToConsole(log, record);
  if (diagnosticsActive) {
    queueDiagnosticRecord(record, log.method === "error");
  }
}

function emitLog(log: PendingLog): void {
  if (!initialized) {
    pendingLogs.push(log);
    if (pendingLogs.length > MAX_PENDING_LOGS) pendingLogs.shift();
    return;
  }
  processLog(log);
}

function applyDiagnosticState(value: unknown): void {
  currentDiagnosticState =
    value && typeof value === "object"
      ? (value as DiagnosticSessionState)
      : null;
  diagnosticExpirationHandled = false;
}

function registerStorageListener(): void {
  if (storageListenerRegistered) return;

  const browserApi = getBrowserApi();
  if (!browserApi?.storage?.onChanged) return;

  browserApi.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName === "sync" || areaName === "local") {
      const nextSettings = changes.settings?.newValue;
      const nextLegacyLevel = changes.logLevel?.newValue;
      const nextLevel = nextSettings?.logLevel ?? nextLegacyLevel;
      if (isLogLevel(nextLevel)) currentLogLevel = nextLevel;
    }

    if (areaName === "local" && changes[DIAGNOSTIC_STATE_KEY]) {
      applyDiagnosticState(changes[DIAGNOSTIC_STATE_KEY].newValue);
    }
  });
  storageListenerRegistered = true;
}

async function loadRuntimeState(): Promise<void> {
  const browserApi = getBrowserApi();
  if (!browserApi?.storage) {
    currentLogLevel = LOG_LEVELS.OFF;
    currentDiagnosticState = null;
    return;
  }

  const [syncResult, localResult] = (await Promise.all([
    browserApi.storage.sync.get(["logLevel", "settings"]),
    browserApi.storage.local.get([
      "logLevel",
      "settings",
      DIAGNOSTIC_STATE_KEY,
    ]),
  ])) as [LogSettingsStorage, LogSettingsStorage];

  currentLogLevel =
    resolveStoredLogLevel(syncResult) ??
    resolveStoredLogLevel(localResult) ??
    LOG_LEVELS.OFF;
  applyDiagnosticState(localResult?.[DIAGNOSTIC_STATE_KEY]);
}

export class Logger {
  private emoji: string;
  private namespace: string;
  private prefix: string;

  constructor(namespace: string, emoji = "🔧", prefix?: string) {
    this.namespace = namespace;
    this.prefix = prefix || DEBUG_NAMESPACE_PREFIX;
    this.emoji = emoji;
  }

  private emit(method: LoggerMethod, args: unknown[]): void {
    emitLog({
      namespace: this.namespace,
      emoji: this.emoji,
      prefix: this.prefix,
      method,
      args,
      timestamp: Date.now(),
    });
  }

  log(...args: unknown[]) {
    this.emit("log", args);
  }

  info(...args: unknown[]) {
    this.emit("info", args);
  }

  warn(...args: unknown[]) {
    this.emit("warn", args);
  }

  error(...args: unknown[]) {
    this.emit("error", args);
  }

  success(...args: unknown[]) {
    this.emit("success", args);
  }

  trace(...args: unknown[]) {
    this.emit("trace", args);
  }

  getNamespace(): string {
    return this.namespace;
  }

  getFullNamespace(): string {
    return `${this.prefix}:${this.namespace}`;
  }

  child(childNamespace: string, childEmoji?: string): Logger {
    return new Logger(
      `${this.namespace}:${childNamespace}`,
      childEmoji || this.emoji,
      this.prefix
    );
  }

  updateConfig(emoji?: string, prefix?: string): void {
    if (emoji) this.emoji = emoji;
    if (prefix) this.prefix = prefix;
  }
}

export function createLogger(
  namespace: string,
  emoji?: string,
  prefix?: string
): Logger {
  return new Logger(namespace, emoji, prefix);
}

export async function initializeLogger(
  context: LoggerContext = detectLoggerContext()
): Promise<void> {
  currentContext = context;
  registerStorageListener();

  if (!initializationPromise) {
    initializationPromise = loadRuntimeState()
      .catch((error) => {
        currentLogLevel = LOG_LEVELS.OFF;
        currentDiagnosticState = null;
        console.error("[human-text:logger] 初始化日志系统失败", error);
      })
      .finally(() => {
        initialized = true;
        const queuedLogs = pendingLogs;
        pendingLogs = [];
        queuedLogs.forEach(processLog);
        initializationPromise = null;
      });
  }

  await initializationPromise;
}

export function shouldLog(logType: LoggerMethod): boolean {
  return shouldLogAtLevel(currentLogLevel, logType);
}

export function shouldLogAtLevel(
  level: LogLevel,
  logType: LoggerMethod
): boolean {
  if (level === LOG_LEVELS.OFF) return false;

  switch (level) {
    case LOG_LEVELS.ERROR:
      return logType === "error";
    case LOG_LEVELS.WARN:
      return logType === "error" || logType === "warn";
    case LOG_LEVELS.INFO:
      return ["error", "warn", "info", "success"].includes(logType);
    case LOG_LEVELS.DEBUG:
      return true;
    default:
      return false;
  }
}

export const backgroundLogger = createLogger("background", "🔙");
export const contentLogger = createLogger("content", "📄");
export const popupLogger = createLogger("popup", "🔽");
export const optionsLogger = createLogger("options", "⚙️");
export const translationLogger = createLogger("translation", "🌐");
export const messageLogger = createLogger("message", "📨");
export const settingsLogger = createLogger("settings", "⚙️");

export type {
  DiagnosticLogRecord,
  DiagnosticLogSummary,
  DiagnosticSessionState,
  LoggerContext,
  LoggerMethod,
} from "./types";
