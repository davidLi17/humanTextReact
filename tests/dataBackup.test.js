import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  ACTIVE_SESSION_STORAGE_KEY,
  BACKUP_APP_ID,
  BACKUP_VERSION,
  HISTORY_STORAGE_KEY,
  SESSIONS_STORAGE_KEY,
  buildBackup,
  createBackupEnvelope,
  createBackupFileName,
  formatSectionNames,
  restoreBackup,
  sanitizeSettingsForBackup,
  validateBackup,
} from "../entrypoints/shared/dataBackup.ts";
import { JARGON_STORAGE_KEY } from "../entrypoints/shared/jargonTypes.ts";
import {
  DEFAULT_SETTINGS,
  MAX_HISTORY_COUNT,
} from "../entrypoints/shared/constants/index.ts";
import { SettingsUtils } from "../entrypoints/shared/settingsUtils.ts";
import {
  WEB_READING_PROGRESS_STORAGE_KEY,
  WEB_READING_PROGRESS_VERSION,
} from "../entrypoints/shared/webReadingState.ts";
import {
  createMemoryBrowserStorage,
  preserveGlobals,
  setTestGlobal,
} from "./helpers/testEnvironment.js";

function createMockBrowser() {
  return createMemoryBrowserStorage();
}

function setupMockBrowser() {
  const mock = createMockBrowser();
  setTestGlobal("browser", mock.browser);
  return mock;
}

const restoreGlobals = preserveGlobals("browser");

// ---------- 测试数据 ----------

const historyFixture = [
  {
    original: "什么是 OKR",
    translated: "OKR 就是目标管理法……",
    reasoning: "",
    hasReasoning: false,
    timestamp: 1700000000000,
    resultSource: "jargon-vault",
  },
  {
    original: "对齐一下颗粒度",
    translated: "把细节统一一下",
    reasoning: "思考过程",
    hasReasoning: true,
    timestamp: 1700000001000,
  },
];

const jargonFixture = [
  {
    id: "jargon-1",
    term: "赋能",
    explanation: "就是给别人提供能力或支持",
    category: "大厂黑话",
    tags: ["大厂黑话"],
    isStarred: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  // 旧版字段（starred/metaphor），读取时应被归一
  {
    id: "jargon-2",
    term: "闭环",
    explanation: "事情有始有终、形成回路",
    metaphor: "像圆圈一样画满一圈",
    starred: true,
  },
];

const sessionsFixture = [
  {
    id: "session-1",
    title: "新对话",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "解释一下赋能",
        createdAt: 1700000000000,
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "赋能就是提供能力……",
        createdAt: 1700000001000,
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  },
];

const settingsFixture = {
  baseUrl: "https://api.example.com/v1/chat/completions",
  model: "test-model",
  temperature: 0.3,
  promptTemplate: "用大白话解释 {text}",
  thinkingEnabled: true,
  showSelectionToolbar: false,
  contextualSelectionEnabled: false,
  logLevel: "debug",
  theme: "dark",
  fontScalePercent: 130,
};

beforeEach(() => {
  setupMockBrowser();
});

afterEach(() => {
  restoreGlobals();
});

// ---------- 纯函数 ----------

describe("纯函数：createBackupEnvelope / sanitizeSettingsForBackup / 命名工具", () => {
  test("createBackupEnvelope 补齐缺省分区并写入应用标识与版本", () => {
    const envelope = createBackupEnvelope({}, "2026-09-06T00:00:00.000Z");
    expect(envelope.version).toBe(BACKUP_VERSION);
    expect(envelope.app).toBe(BACKUP_APP_ID);
    expect(envelope.exportedAt).toBe("2026-09-06T00:00:00.000Z");
    expect(envelope.data).toEqual({
      history: [],
      jargon: [],
      sessions: { sessions: [], activeSessionId: null },
      settings: {},
    });
  });

  test("sanitizeSettingsForBackup 强制排除 apiKey 与未知键", () => {
    const sanitized = sanitizeSettingsForBackup({
      ...settingsFixture,
      apiKey: "sk-secret-key",
      hackedKey: "oops",
    });
    expect(sanitized.apiKey).toBeUndefined();
    expect(sanitized.hackedKey).toBeUndefined();
    expect(sanitized.model).toBe("test-model");
    expect(sanitized.theme).toBe("dark");
    expect(Object.keys(sanitized).sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS)
        .filter((key) => key !== "apiKey")
        .sort()
    );
  });

  test("sanitizeSettingsForBackup 对非对象输入返回空对象", () => {
    expect(sanitizeSettingsForBackup(null)).toEqual({});
    expect(sanitizeSettingsForBackup("str")).toEqual({});
    expect(sanitizeSettingsForBackup([1, 2])).toEqual({});
  });

  test("createBackupFileName 输出含日期的默认文件名", () => {
    expect(createBackupFileName(new Date(2026, 8, 6, 15, 30))).toBe(
      "human-text-translator-backup-2026-09-06.json"
    );
  });

  test("formatSectionNames 将分区键格式化为中文标签", () => {
    expect(formatSectionNames(["history", "jargon", "sessions", "settings"])).toBe(
      "翻译历史、生词本、侧边栏会话、用户设置"
    );
  });
});

// ---------- buildBackup ----------

describe("buildBackup 聚合四类数据", () => {
  test("从各存储层读取并生成完整 envelope，且绝不包含 apiKey", async () => {
    // 直接写入 mock 存储
    globalThis.browser.storage.local.set({
      [HISTORY_STORAGE_KEY]: historyFixture,
      [JARGON_STORAGE_KEY]: jargonFixture,
      [SESSIONS_STORAGE_KEY]: sessionsFixture,
      [ACTIVE_SESSION_STORAGE_KEY]: "session-1",
    });
    globalThis.browser.storage.sync.set({
      settings: { ...settingsFixture, apiKey: "sk-secret-key" },
    });

    const backup = await buildBackup();

    expect(backup.version).toBe(1);
    expect(backup.app).toBe("human-text-translator");
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false);

    expect(backup.data.history).toEqual(historyFixture);

    // 生词本经存储层读取后归一：旧版 starred/metaphor 映射为 isStarred/analogy
    expect(backup.data.jargon).toHaveLength(2);
    const closedLoop = backup.data.jargon.find((item) => item.term === "闭环");
    expect(closedLoop.isStarred).toBe(true);
    expect(closedLoop.analogy).toBe("像圆圈一样画满一圈");

    expect(backup.data.sessions.sessions).toEqual(sessionsFixture);
    expect(backup.data.sessions.activeSessionId).toBe("session-1");

    expect(backup.data.settings).toEqual(settingsFixture);

    const serialized = JSON.stringify(backup);
    expect(serialized.includes("sk-secret-key")).toBe(false);
  });
});

// ---------- validateBackup ----------

describe("validateBackup 合法输入", () => {
  test("完整 envelope 校验通过并返回规范化备份", () => {
    const envelope = createBackupEnvelope(
      {
        history: historyFixture,
        jargon: jargonFixture,
        sessions: { sessions: sessionsFixture, activeSessionId: "session-1" },
        settings: settingsFixture,
      },
      "2026-09-06T08:00:00.000Z"
    );

    const result = validateBackup(envelope);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.backup.data.sessions.activeSessionId).toBe("session-1");
  });

  test("activeSessionId 缺省时规范化为 null", () => {
    const envelope = createBackupEnvelope({
      history: [],
      jargon: [],
      sessions: { sessions: [], activeSessionId: undefined },
      settings: {},
    });
    // createBackupEnvelope 会补齐 null，这里手工模拟反序列化后缺字段的情况
    const parsed = JSON.parse(
      JSON.stringify({ ...envelope, data: { ...envelope.data } })
    );
    delete parsed.data.sessions.activeSessionId;
    const result = validateBackup(parsed);
    expect(result.valid).toBe(true);
    expect(result.backup.data.sessions.activeSessionId).toBeNull();
  });

  test("历史来源只保留 jargon-vault，未知值在校验规范化时丢弃", () => {
    const envelope = createBackupEnvelope({
      history: [
        {
          ...historyFixture[0],
          resultSource: "unknown-source",
        },
      ],
      jargon: [],
      sessions: { sessions: [], activeSessionId: null },
      settings: {},
    });

    const result = validateBackup(JSON.parse(JSON.stringify(envelope)));
    expect(result.valid).toBe(true);
    expect(result.backup.data.history[0].resultSource).toBeUndefined();
  });
});

describe("validateBackup 非法输入", () => {
  const validEnvelope = () =>
    createBackupEnvelope(
      {
        history: historyFixture,
        jargon: jargonFixture,
        sessions: { sessions: sessionsFixture, activeSessionId: "session-1" },
        settings: settingsFixture,
      },
      "2026-09-06T08:00:00.000Z"
    );

  test("根节点不是对象时拒绝", () => {
    for (const bad of [null, "string", 42, [validEnvelope()]]) {
      const result = validateBackup(bad);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("根节点必须是一个 JSON 对象");
    }
  });

  test("app 标识不匹配时拒绝", () => {
    const result = validateBackup({ ...validEnvelope(), app: "other-app" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("不是「人话翻译器」的备份文件");
  });

  test("版本号不受支持时拒绝", () => {
    const result = validateBackup({ ...validEnvelope(), version: 99 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("版本不受支持");
  });

  test("缺少导出时间时拒绝", () => {
    const envelope = validEnvelope();
    delete envelope.exportedAt;
    const result = validateBackup(envelope);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("导出时间");
  });

  test("缺少 data 时拒绝", () => {
    const envelope = validEnvelope();
    delete envelope.data;
    const result = validateBackup(envelope);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("缺少数据部分");
  });

  test("逐类校验：历史/生词本/会话/设置的各类非法结构都能给出中文原因", () => {
    const cases = [
      {
        mutate: (data) => {
          data.history = "not-an-array";
        },
        expected: "翻译历史",
      },
      {
        mutate: (data) => {
          data.history[1] = { original: "缺少译文" };
        },
        expected: "翻译历史数据格式不正确：第 2 条",
      },
      {
        mutate: (data) => {
          data.jargon = [];
          data.jargon.push({ term: "缺少解释" });
        },
        expected: "生词本数据格式不正确：第 1 条",
      },
      {
        mutate: (data) => {
          data.sessions = { sessions: "nope" };
        },
        expected: "侧边栏会话数据格式不正确：sessions 必须是数组",
      },
      {
        mutate: (data) => {
          data.sessions.sessions[0].messages = undefined;
        },
        expected: "侧边栏会话数据格式不正确：第 1 个会话",
      },
      {
        mutate: (data) => {
          data.sessions.activeSessionId = 123;
        },
        expected: "activeSessionId 必须是字符串或 null",
      },
      {
        mutate: (data) => {
          data.settings = ["not", "an", "object"];
        },
        expected: "用户设置",
      },
      {
        mutate: (data) => {
          delete data.jargon;
        },
        expected: "缺少「生词本」数据",
      },
    ];

    for (const { mutate, expected } of cases) {
      const envelope = validEnvelope();
      mutate(envelope.data);
      const result = validateBackup(envelope);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(expected);
    }
  });

  test("多个错误会被逐类收集并以「；」连接", () => {
    const envelope = validEnvelope();
    envelope.data.history = "bad";
    envelope.data.settings = 123;
    const result = validateBackup(envelope);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("；");
    expect(result.error).toContain("翻译历史");
    expect(result.error).toContain("用户设置");
  });
});

// ---------- restoreBackup 与 round-trip ----------

describe("restoreBackup 与备份往返（round-trip）", () => {
  test("构建 → 序列化 → 校验 → 恢复到全新存储后数据一致，且 apiKey 不被覆盖", async () => {
    // 1. 在源环境准备数据并构建备份
    const source = createMockBrowser();
    setTestGlobal("browser", source.browser);
    source.stores.local[HISTORY_STORAGE_KEY] = historyFixture;
    source.stores.local[JARGON_STORAGE_KEY] = jargonFixture;
    source.stores.local[SESSIONS_STORAGE_KEY] = sessionsFixture;
    source.stores.local[ACTIVE_SESSION_STORAGE_KEY] = "session-1";
    source.stores.sync.settings = { ...settingsFixture, apiKey: "sk-secret-key" };
    source.stores.local.settings = { ...settingsFixture, apiKey: "sk-secret-key" };
    source.stores.local.fontScalePercent = 130;

    const backup = await buildBackup();
    const serialized = JSON.stringify(backup, null, 2);
    expect(backup.data.history[0].resultSource).toBe("jargon-vault");
    expect(serialized).toContain('"resultSource": "jargon-vault"');

    // 2. 在全新目标环境反序列化、校验并恢复
    const target = createMockBrowser();
    setTestGlobal("browser", target.browser);
    const targetLocalWrites = [];
    const originalTargetLocalSet = target.browser.storage.local.set;
    target.browser.storage.local.set = async (items) => {
      targetLocalWrites.push(structuredClone(items));
      await originalTargetLocalSet(items);
    };
    // 目标环境已有的数据与 API Key 应被「覆盖/保留」
    target.stores.local[HISTORY_STORAGE_KEY] = [
      { original: "旧历史", translated: "会被覆盖", timestamp: 1 },
    ];
    target.stores.local.settings = { apiKey: "sk-existing-key" };
    target.stores.sync.settings = { apiKey: "sk-existing-key" };
    target.stores.local.fontScalePercent = 90;
    target.stores.sync.fontScalePercent = 90;
    target.stores.local[WEB_READING_PROGRESS_STORAGE_KEY] = {
      version: WEB_READING_PROGRESS_VERSION,
      records: { stale: { fullContent: "旧断点" } },
    };

    const parsed = JSON.parse(serialized);
    const validation = validateBackup(parsed);
    expect(validation.valid).toBe(true);

    const restoreResult = await restoreBackup(validation.backup);
    expect(restoreResult.failed).toEqual([]);
    expect(restoreResult.restored).toEqual([
      "history",
      "jargon",
      "sessions",
      "settings",
    ]);

    // 3. 校验目标存储中的四类数据
    expect(target.stores.local[HISTORY_STORAGE_KEY]).toEqual(historyFixture);
    expect(
      target.stores.local[HISTORY_STORAGE_KEY][0].resultSource
    ).toBe("jargon-vault");
    expect(target.stores.local[SESSIONS_STORAGE_KEY]).toEqual(sessionsFixture);
    expect(target.stores.local[ACTIVE_SESSION_STORAGE_KEY]).toBe("session-1");
    expect(target.stores.local[WEB_READING_PROGRESS_STORAGE_KEY]).toEqual({
      version: WEB_READING_PROGRESS_VERSION,
      records: {},
    });
    const sessionsCheckpoint = targetLocalWrites.find(
      (items) => SESSIONS_STORAGE_KEY in items
    );
    expect(sessionsCheckpoint).toHaveProperty(
      WEB_READING_PROGRESS_STORAGE_KEY
    );

    const restoredJargon = target.stores.local[JARGON_STORAGE_KEY];
    expect(restoredJargon).toHaveLength(2);
    expect(
      restoredJargon.find((item) => item.term === "闭环").isStarred
    ).toBe(true);

    // 设置已覆盖（sync + local 双写），但 apiKey 保留目标环境原值
    for (const store of [target.stores.sync, target.stores.local]) {
      expect(store.settings.model).toBe("test-model");
      expect(store.settings.thinkingEnabled).toBe(true);
      expect(store.settings.theme).toBe("dark");
      expect(store.settings.apiKey).toBe("sk-existing-key");
    }
    expect(target.stores.local.fontScalePercent).toBe(130);
    expect(target.stores.sync.fontScalePercent).toBe(130);
    expect((await SettingsUtils.getSettings()).fontScalePercent).toBe(130);
    expect(serialized.includes("sk-secret-key")).toBe(false);
  });

  test("超过上限的历史会被截断到 MAX_HISTORY_COUNT", async () => {
    const oversized = Array.from({ length: MAX_HISTORY_COUNT + 20 }, (_, i) => ({
      original: `原文 ${i}`,
      translated: `译文 ${i}`,
      reasoning: "",
      hasReasoning: false,
      timestamp: 1700000000000 + i,
    }));
    const envelope = createBackupEnvelope({
      history: oversized,
      jargon: [],
      sessions: { sessions: [], activeSessionId: null },
      settings: {},
    });

    const mock = setupMockBrowser();
    const result = await restoreBackup(envelope);
    expect(result.failed).toEqual([]);
    expect(mock.stores.local[HISTORY_STORAGE_KEY]).toHaveLength(
      MAX_HISTORY_COUNT
    );
  });

  test("激活会话 ID 无效时回落到第一个会话", async () => {
    const envelope = createBackupEnvelope({
      history: [],
      jargon: [],
      sessions: { sessions: sessionsFixture, activeSessionId: "not-exist" },
      settings: {},
    });

    const mock = setupMockBrowser();
    const result = await restoreBackup(envelope);
    expect(result.failed).toEqual([]);
    expect(mock.stores.local[ACTIVE_SESSION_STORAGE_KEY]).toBe("session-1");
  });

  test("校验失败的备份会抛出错误且不写入任何数据", async () => {
    const mock = setupMockBrowser();
    expect(
      restoreBackup({ version: 1, app: "wrong", exportedAt: "", data: {} })
    ).rejects.toThrow("不是「人话翻译器」的备份文件");
    expect(Object.keys(mock.stores.local)).toEqual([]);
  });

  test("单一分区写入失败时其余分区照常恢复并逐分区汇报", async () => {
    const mock = createMockBrowser();
    // 仅让「设置」写入失败（sync 全挂 + local 拒绝 settings 键），其余分区照常
    mock.browser.storage.sync.set = async () => {
      throw new Error("quota exceeded");
    };
    mock.browser.storage.sync.get = async () => ({});
    mock.browser.storage.local.set = async (items) => {
      if ("settings" in items) {
        throw new Error("quota exceeded");
      }
      Object.assign(mock.stores.local, items);
    };
    setTestGlobal("browser", mock.browser);

    const envelope = createBackupEnvelope({
      history: historyFixture,
      jargon: [],
      sessions: { sessions: [], activeSessionId: null },
      settings: settingsFixture,
    });

    const result = await restoreBackup(envelope);
    expect(result.restored).toEqual(["history", "jargon", "sessions"]);
    expect(result.failed).toEqual(["settings"]);
    expect(result.errors?.[0]).toContain("「用户设置」恢复失败");
    expect(mock.stores.local[HISTORY_STORAGE_KEY]).toEqual(historyFixture);
  });
});
