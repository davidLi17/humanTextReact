import { afterEach, describe, expect, test } from "bun:test";
import { LOG_LEVELS } from "../entrypoints/shared/constants/index.ts";
import {
  isDiagnosticSessionActive,
  appendDiagnosticRecords,
  clearDiagnosticRecords,
  getDiagnosticRecords,
  normalizeDiagnosticRecord,
  sanitizeLogValue,
  startDiagnosticSession,
  stopDiagnosticSession,
  summarizeDiagnosticRecords,
  trimDiagnosticRecords,
} from "../entrypoints/shared/logger/diagnostics.ts";
import { shouldLogAtLevel } from "../entrypoints/shared/logger/index.ts";

const createRecord = (id, level = "info", message = "message") => ({
  id,
  timestamp: Number(id) || Date.now(),
  level,
  context: "background",
  namespace: "human-text:test",
  message,
  data: [],
});

afterEach(() => {
  delete globalThis.browser;
});

describe("logger levels", () => {
  test("filters methods according to the configured level", () => {
    expect(shouldLogAtLevel(LOG_LEVELS.OFF, "error")).toBe(false);
    expect(shouldLogAtLevel(LOG_LEVELS.ERROR, "error")).toBe(true);
    expect(shouldLogAtLevel(LOG_LEVELS.ERROR, "warn")).toBe(false);
    expect(shouldLogAtLevel(LOG_LEVELS.WARN, "warn")).toBe(true);
    expect(shouldLogAtLevel(LOG_LEVELS.WARN, "info")).toBe(false);
    expect(shouldLogAtLevel(LOG_LEVELS.INFO, "success")).toBe(true);
    expect(shouldLogAtLevel(LOG_LEVELS.INFO, "trace")).toBe(false);
    expect(shouldLogAtLevel(LOG_LEVELS.DEBUG, "trace")).toBe(true);
  });
});

describe("diagnostic redaction", () => {
  test("redacts secrets and private translation content recursively", () => {
    const sanitized = sanitizeLogValue({
      apiKey: "secret-key",
      headers: { Authorization: "Bearer abc123" },
      selectionText: "private source text",
      textLength: 19,
      baseUrl: "https://api.example.com/v1/chat?token=secret",
    });

    expect(sanitized.apiKey).toBe("[REDACTED]");
    expect(sanitized.headers.Authorization).toBe("[REDACTED]");
    expect(sanitized.selectionText).toBe("[REDACTED_TEXT length=19]");
    expect(sanitized.textLength).toBe(19);
    expect(sanitized.baseUrl).toBe("https://api.example.com");
  });

  test("redacts secrets embedded in free-form strings", () => {
    expect(sanitizeLogValue("Authorization: Bearer abc123")).toBe(
      "Authorization: Bearer [REDACTED]"
    );
    expect(sanitizeLogValue("apiKey=abc123")).toBe("apiKey=[REDACTED]");
  });

  test("normalizes untrusted diagnostic records", () => {
    const normalized = normalizeDiagnosticRecord({
      ...createRecord("record-1"),
      data: [{ apiKey: "secret", promptTemplate: "private prompt" }],
    });

    expect(normalized?.data).toEqual([
      {
        apiKey: "[REDACTED]",
        promptTemplate: "[REDACTED_TEXT length=14]",
      },
    ]);
    expect(normalizeDiagnosticRecord({ id: "invalid" })).toBeUndefined();
  });
});

describe("diagnostic lifecycle", () => {
  test("recognizes active and expired sessions", () => {
    const state = { enabled: true, startedAt: 100, expiresAt: 200 };
    expect(isDiagnosticSessionActive(state, 150)).toBe(true);
    expect(isDiagnosticSessionActive(state, 200)).toBe(false);
  });

  test("keeps the newest records inside count and byte limits", () => {
    const records = [
      createRecord("1"),
      createRecord("2"),
      createRecord("3"),
    ];
    expect(trimDiagnosticRecords(records, 2).map((record) => record.id)).toEqual(
      ["2", "3"]
    );

    const byteLimited = trimDiagnosticRecords(
      [
        createRecord("4", "info", "a".repeat(300)),
        createRecord("5", "error", "b".repeat(300)),
      ],
      10,
      450
    );
    expect(byteLimited.map((record) => record.id)).toEqual(["5"]);
  });

  test("summarizes totals and errors", () => {
    const summary = summarizeDiagnosticRecords([
      createRecord("10"),
      createRecord("20", "error"),
    ]);
    expect(summary).toEqual({
      total: 2,
      errors: 1,
      latestTimestamp: 20,
    });
  });

  test("stores a bounded session and keeps control state local", async () => {
    const stores = { local: {}, session: {} };
    const createStorageArea = (name) => ({
      async get(key) {
        return { [key]: stores[name][key] };
      },
      async set(values) {
        Object.assign(stores[name], values);
      },
      async remove(key) {
        delete stores[name][key];
      },
    });
    globalThis.browser = {
      storage: {
        local: createStorageArea("local"),
        session: createStorageArea("session"),
      },
    };

    const state = await startDiagnosticSession(1000);
    await appendDiagnosticRecords([
      createRecord("100"),
      createRecord("200", "error"),
    ]);

    expect(state.enabled).toBe(true);
    expect(await getDiagnosticRecords()).toHaveLength(2);
    expect(stores.local.diagnosticLogging).toEqual(state);

    await stopDiagnosticSession();
    expect(stores.local.diagnosticLogging).toBeUndefined();
    expect(await getDiagnosticRecords()).toHaveLength(2);

    await clearDiagnosticRecords();
    expect(await getDiagnosticRecords()).toEqual([]);
  });
});
