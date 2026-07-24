import type {
  DiagnosticLogRecord,
  DiagnosticLogSummary,
  DiagnosticSessionState,
  LoggerContext,
  LoggerMethod,
} from "./types";

export const DIAGNOSTIC_STATE_KEY = "diagnosticLogging";
export const DIAGNOSTIC_LOGS_KEY = "diagnosticLogs";
export const DIAGNOSTIC_DURATION_MS = 30 * 60 * 1000;
export const MAX_DIAGNOSTIC_RECORDS = 500;
export const MAX_DIAGNOSTIC_BYTES = 512 * 1024;

const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(api.?key|authorization|token|cookie|password|secret)/i;
const PRIVATE_TEXT_KEY_PATTERN =
  /(selection.?text|text.?preview|prompt.?template|reasoning.?content|image.?data|base64)/i;
const LOGGER_METHODS = new Set<LoggerMethod>([
  "log",
  "info",
  "warn",
  "error",
  "success",
  "trace",
]);
const LOGGER_CONTEXTS = new Set<LoggerContext>([
  "background",
  "content",
  "popup",
  "options",
]);

function getBrowserApi(): any {
  return (globalThis as any).browser;
}

function summarizeString(value: string): string {
  return `[REDACTED_TEXT length=${value.length}]`;
}

function redactSecretsInString(value: string): string {
  return value
    .replace(/(bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(
      /(api[\s_-]?key\s*[:=]\s*)[^\s,;]+/gi,
      "$1[REDACTED]"
    );
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return summarizeString(value);
  }
}

export function sanitizeLogValue(
  value: unknown,
  key = "",
  seen = new WeakSet<object>(),
  depth = 0
): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED_VALUE;
  }
  if (typeof value === "string" && PRIVATE_TEXT_KEY_PATTERN.test(key)) {
    return summarizeString(value);
  }
  if (typeof value === "string" && /url/i.test(key)) {
    return sanitizeUrl(value);
  }
  if (
    value === null ||
    typeof value === "undefined" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "string") {
    const redacted = redactSecretsInString(value);
    return redacted.length > 1000
      ? `${redacted.slice(0, 1000)}...[truncated]`
      : redacted;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.slice(0, 4000),
    };
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if (depth >= 6) {
    return "[MaxDepth]";
  }
  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);
  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) => sanitizeLogValue(item, key, seen, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    sanitized[entryKey] = sanitizeLogValue(
      entryValue,
      entryKey,
      seen,
      depth + 1
    );
  }
  return sanitized;
}

export function isDiagnosticSessionActive(
  state: DiagnosticSessionState | null | undefined,
  now = Date.now()
): state is DiagnosticSessionState {
  return Boolean(state?.enabled && state.expiresAt > now);
}

export function trimDiagnosticRecords(
  records: DiagnosticLogRecord[],
  maxRecords = MAX_DIAGNOSTIC_RECORDS,
  maxBytes = MAX_DIAGNOSTIC_BYTES
): DiagnosticLogRecord[] {
  const trimmed = records.slice(-maxRecords);

  while (
    trimmed.length > 0 &&
    new TextEncoder().encode(JSON.stringify(trimmed)).byteLength > maxBytes
  ) {
    trimmed.shift();
  }

  return trimmed;
}

export function summarizeDiagnosticRecords(
  records: DiagnosticLogRecord[]
): DiagnosticLogSummary {
  return {
    total: records.length,
    errors: records.filter((record) => record.level === "error").length,
    latestTimestamp: records.at(-1)?.timestamp,
  };
}

export function normalizeDiagnosticRecord(
  value: unknown
): DiagnosticLogRecord | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Partial<DiagnosticLogRecord>;
  if (
    typeof record.id !== "string" ||
    typeof record.timestamp !== "number" ||
    !LOGGER_METHODS.has(record.level as LoggerMethod) ||
    !LOGGER_CONTEXTS.has(record.context as LoggerContext) ||
    typeof record.namespace !== "string" ||
    typeof record.message !== "string"
  ) {
    return undefined;
  }

  return {
    id: record.id.slice(0, 120),
    timestamp: record.timestamp,
    level: record.level as LoggerMethod,
    context: record.context as LoggerContext,
    namespace: record.namespace.slice(0, 160),
    message: String(sanitizeLogValue(record.message)).slice(0, 1200),
    data: Array.isArray(record.data)
      ? record.data.slice(0, 20).map((item) => sanitizeLogValue(item))
      : [],
    requestId:
      typeof record.requestId === "string"
        ? record.requestId.slice(0, 120)
        : undefined,
    extensionVersion:
      typeof record.extensionVersion === "string"
        ? record.extensionVersion.slice(0, 40)
        : undefined,
  };
}

let storageWriteQueue: Promise<void> = Promise.resolve();

export function appendDiagnosticRecords(
  records: DiagnosticLogRecord[]
): Promise<void> {
  if (records.length === 0) return Promise.resolve();

  storageWriteQueue = storageWriteQueue.catch(() => undefined).then(async () => {
    const browserApi = getBrowserApi();
    if (!browserApi?.storage?.session) return;

    const stored = await browserApi.storage.session.get(DIAGNOSTIC_LOGS_KEY);
    const current = Array.isArray(stored?.[DIAGNOSTIC_LOGS_KEY])
      ? (stored[DIAGNOSTIC_LOGS_KEY] as DiagnosticLogRecord[])
      : [];
    const next = trimDiagnosticRecords([...current, ...records]);
    await browserApi.storage.session.set({ [DIAGNOSTIC_LOGS_KEY]: next });
  });

  return storageWriteQueue;
}

export async function getDiagnosticRecords(): Promise<DiagnosticLogRecord[]> {
  await storageWriteQueue.catch(() => undefined);
  const browserApi = getBrowserApi();
  if (!browserApi?.storage?.session) return [];

  const stored = await browserApi.storage.session.get(DIAGNOSTIC_LOGS_KEY);
  return Array.isArray(stored?.[DIAGNOSTIC_LOGS_KEY])
    ? stored[DIAGNOSTIC_LOGS_KEY]
    : [];
}

export async function clearDiagnosticRecords(): Promise<void> {
  const browserApi = getBrowserApi();
  storageWriteQueue = storageWriteQueue
    .catch(() => undefined)
    .then(() => browserApi?.storage?.session?.remove(DIAGNOSTIC_LOGS_KEY));
  await storageWriteQueue;
}

export async function getDiagnosticSummary(): Promise<DiagnosticLogSummary> {
  const records = await getDiagnosticRecords();
  return summarizeDiagnosticRecords(records);
}

export async function startDiagnosticSession(
  durationMs = DIAGNOSTIC_DURATION_MS
): Promise<DiagnosticSessionState> {
  const browserApi = getBrowserApi();
  const startedAt = Date.now();
  const state: DiagnosticSessionState = {
    enabled: true,
    startedAt,
    expiresAt: startedAt + durationMs,
  };

  await clearDiagnosticRecords();
  await browserApi.storage.local.set({ [DIAGNOSTIC_STATE_KEY]: state });
  return state;
}

export async function stopDiagnosticSession(): Promise<void> {
  const browserApi = getBrowserApi();
  await browserApi.storage.local.remove(DIAGNOSTIC_STATE_KEY);
}
