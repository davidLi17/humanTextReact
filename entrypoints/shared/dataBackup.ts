/**
 * 全量数据备份与恢复（v1 备份格式）
 *
 * 聚合以下四类数据，形成单一 JSON 备份文件（envelope）：
 * - 翻译历史：storage.local 的 "translationHistory"（结构镜像
 *   entrypoints/background/historyManager.ts 的 HistoryItem）
 * - 生词本：storage.local 的 JARGON_STORAGE_KEY（经 jargonStorage 存储层读写）
 * - 侧边栏会话：storage.local 的 "sidepanel_chat_sessions" 与
 *   "sidepanel_active_session_id"（与 entrypoints/sidepanel/App.tsx 保持一致，
 *   本模块只做聚合读写，不改变其数据格式）
 * - 用户设置：经 settingsUtils 存储层读写；导出时强制排除 apiKey（安全第一），
 *   恢复时同样剥离 apiKey，绝不覆盖用户现有密钥。
 *
 * 备份 envelope 结构：
 * {
 *   version: 1,
 *   exportedAt: "<ISO 时间字符串>",
 *   app: "human-text-translator",
 *   data: { history, jargon, sessions, settings }
 * }
 */
import { DEFAULT_SETTINGS, MAX_HISTORY_COUNT } from "./constants";
import { createLogger } from "./logger";
import { getJargonList, normalizeJargonItem } from "./jargonStorage";
import { JARGON_STORAGE_KEY, type JargonItem } from "./jargonTypes";
import type { ChatSession } from "./chatTypes";
import {
  JARGON_VAULT_RESULT_SOURCE,
  type TranslationResultSource,
} from "./jargonReuse";
import {
  WEB_READING_PROGRESS_STORAGE_KEY,
  WEB_READING_PROGRESS_VERSION,
} from "./webReadingState";
import { SettingsUtils, type UserSettings } from "./settingsUtils";

const logger = createLogger("data-backup", "💾");

/** 备份格式版本号 */
export const BACKUP_VERSION = 1;
/** 备份文件的应用标识 */
export const BACKUP_APP_ID = "human-text-translator";
/** 备份文件名前缀（不含日期与扩展名） */
export const BACKUP_FILE_NAME_PREFIX = "human-text-translator-backup";

/** 翻译历史在 storage.local 中的键名（与 historyManager.ts 一致） */
export const HISTORY_STORAGE_KEY = "translationHistory";
/** 侧边栏会话列表在 storage.local 中的键名（与 sidepanel/App.tsx 一致） */
export const SESSIONS_STORAGE_KEY = "sidepanel_chat_sessions";
/** 侧边栏激活会话 ID 在 storage.local 中的键名（与 sidepanel/App.tsx 一致） */
export const ACTIVE_SESSION_STORAGE_KEY = "sidepanel_active_session_id";

/** 备份中包含的数据分区 */
export type BackupSectionKey = "history" | "jargon" | "sessions" | "settings";

export const BACKUP_SECTION_LABELS: Record<BackupSectionKey, string> = {
  history: "翻译历史",
  jargon: "生词本",
  sessions: "侧边栏会话",
  settings: "用户设置",
};

/**
 * 翻译历史条目（结构镜像 background/historyManager.ts 的 HistoryItem；
 * 在 shared 层重复声明以避免 shared → background 的反向依赖）。
 */
export interface BackupHistoryItem {
  original: string;
  translated: string;
  reasoning?: string;
  hasReasoning?: boolean;
  timestamp?: number;
  resultSource?: TranslationResultSource;
}

/** 侧边栏会话分区 */
export interface BackupSessionsData {
  sessions: ChatSession[];
  activeSessionId: string | null;
}

/** 备份的数据部分 */
export interface BackupData {
  history: BackupHistoryItem[];
  jargon: JargonItem[];
  sessions: BackupSessionsData;
  settings: Record<string, unknown>;
}

/** 备份文件 envelope */
export interface BackupEnvelope {
  version: number;
  exportedAt: string;
  app: string;
  data: BackupData;
}

/** 校验结果：合法时携带规范化后的备份对象 */
export interface BackupValidationResult {
  valid: boolean;
  /** 非法时的可读中文错误原因（多个原因以「；」连接） */
  error?: string;
  backup?: BackupEnvelope;
}

/** 恢复结果：逐分区汇报成功/失败 */
export interface BackupRestoreResult {
  restored: BackupSectionKey[];
  failed: BackupSectionKey[];
  errors?: string[];
}

/** 备份导出时允许保留的设置键（强制排除 apiKey） */
const SETTINGS_BACKUP_KEYS = Object.keys(DEFAULT_SETTINGS).filter(
  (key) => key !== "apiKey"
) as Array<keyof Omit<UserSettings, "apiKey">>;

type StorageArea = {
  get: (keys?: string | string[] | null) => Promise<Record<string, any>>;
  set: (items: Record<string, any>) => Promise<void>;
  remove?: (keys: string | string[]) => Promise<void>;
};

function getStorageArea(area: "local" | "sync"): StorageArea | null {
  const globalObject = globalThis as any;
  return (
    globalObject.browser?.storage?.[area] ||
    globalObject.chrome?.storage?.[area] ||
    null
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 从设置对象中仅挑出允许备份的键（强制排除 apiKey 与未知键）。
 * 纯函数，导出与恢复两侧共用，保证 apiKey 永不进入备份、也永不被备份覆盖。
 */
export function sanitizeSettingsForBackup(
  settings: unknown
): Record<string, unknown> {
  if (!isPlainObject(settings)) return {};
  const result: Record<string, unknown> = {};
  for (const key of SETTINGS_BACKUP_KEYS) {
    if (settings[key] !== undefined) {
      result[key] = settings[key];
    }
  }
  return result;
}

/**
 * 将四类原始数据组装为备份 envelope（纯函数）。
 * 缺省的分区以空数据补齐，保证 envelope 结构完整；
 * 传入数据做浅拷贝，避免 envelope 与调用方数据相互影响。
 */
export function createBackupEnvelope(
  parts: {
    history?: BackupHistoryItem[];
    jargon?: JargonItem[];
    sessions?: BackupSessionsData;
    settings?: Record<string, unknown>;
  },
  exportedAt: string = new Date().toISOString()
): BackupEnvelope {
  const sessions = isPlainObject(parts.sessions)
    ? (parts.sessions as BackupSessionsData)
    : null;
  return {
    version: BACKUP_VERSION,
    exportedAt,
    app: BACKUP_APP_ID,
    data: {
      history: Array.isArray(parts.history)
        ? parts.history.map((item) => ({ ...item }))
        : [],
      jargon: Array.isArray(parts.jargon)
        ? parts.jargon.map((item) => ({ ...item }))
        : [],
      sessions: {
        sessions:
          sessions && Array.isArray(sessions.sessions)
            ? sessions.sessions.map((session) => ({ ...session }))
            : [],
        activeSessionId:
          sessions && typeof sessions.activeSessionId === "string"
            ? sessions.activeSessionId
            : null,
      },
      settings: isPlainObject(parts.settings) ? { ...parts.settings } : {},
    },
  };
}

/** 生成本份备份的默认下载文件名，如 human-text-translator-backup-2026-09-06.json */
export function createBackupFileName(date: Date = new Date()): string {
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${BACKUP_FILE_NAME_PREFIX}-${yyyy}-${mm}-${dd}.json`;
}

/** 把分区键列表格式化为中文标签串，用于提示文案（如「翻译历史、生词本」） */
export function formatSectionNames(keys: BackupSectionKey[]): string {
  return keys.map((key) => BACKUP_SECTION_LABELS[key]).join("、");
}

async function readHistoryForBackup(): Promise<BackupHistoryItem[]> {
  const storage = getStorageArea("local");
  if (!storage) return [];
  const result = await storage.get(HISTORY_STORAGE_KEY);
  const history = result?.[HISTORY_STORAGE_KEY];
  return Array.isArray(history) ? (history as BackupHistoryItem[]) : [];
}

async function readJargonForBackup(): Promise<JargonItem[]> {
  return getJargonList();
}

async function readSessionsForBackup(): Promise<BackupSessionsData> {
  const storage = getStorageArea("local");
  if (!storage) return { sessions: [], activeSessionId: null };
  const result = await storage.get([
    SESSIONS_STORAGE_KEY,
    ACTIVE_SESSION_STORAGE_KEY,
  ]);
  const rawSessions = result?.[SESSIONS_STORAGE_KEY];
  const rawActiveId = result?.[ACTIVE_SESSION_STORAGE_KEY];
  return {
    sessions: Array.isArray(rawSessions)
      ? (rawSessions.filter(
          (session) => isPlainObject(session) && typeof session.id === "string"
        ) as ChatSession[])
      : [],
    activeSessionId: typeof rawActiveId === "string" ? rawActiveId : null,
  };
}

async function readSettingsForBackup(): Promise<Record<string, unknown>> {
  const settings = await SettingsUtils.getSettings();
  return sanitizeSettingsForBackup(settings);
}

/**
 * 聚合四类数据构建备份 envelope（经各自存储层读取）。
 * apiKey 不会出现在结果中。
 */
export async function buildBackup(): Promise<BackupEnvelope> {
  const [history, jargon, sessions, settings] = await Promise.all([
    readHistoryForBackup(),
    readJargonForBackup(),
    readSessionsForBackup(),
    readSettingsForBackup(),
  ]);
  logger.log("构建备份完成", {
    history: history.length,
    jargon: jargon.length,
    sessions: sessions.sessions.length,
  });
  return createBackupEnvelope({ history, jargon, sessions, settings });
}

/**
 * 校验备份 JSON 结构（纯函数）。非法时返回可读的中文错误原因（逐类收集）。
 * 四个数据分区均为必填，避免「缺分区导致覆盖式恢复误清空该类数据」。
 */
export function validateBackup(json: unknown): BackupValidationResult {
  if (!isPlainObject(json)) {
    return {
      valid: false,
      error: "备份文件格式不正确：根节点必须是一个 JSON 对象",
    };
  }

  if (json.app !== BACKUP_APP_ID) {
    return {
      valid: false,
      error: "这不是「人话翻译器」的备份文件（缺少应用标识或 app 不匹配）",
    };
  }

  if (json.version !== BACKUP_VERSION) {
    return {
      valid: false,
      error: `备份文件版本不受支持（期望 version ${BACKUP_VERSION}，实际为 ${String(
        json.version
      )}），请升级扩展后重试`,
    };
  }

  const errors: string[] = [];

  if (typeof json.exportedAt !== "string" || !json.exportedAt.trim()) {
    errors.push("备份文件缺少有效的导出时间（exportedAt）");
  }

  const data = json.data;
  if (!isPlainObject(data)) {
    errors.push("备份文件缺少数据部分（data 必须是对象）");
    return { valid: false, error: errors.join("；") };
  }

  if (!Array.isArray(data.history)) {
    errors.push("备份缺少「翻译历史」数据（data.history 必须是数组）");
  } else {
    const badIndex = data.history.findIndex(
      (item) =>
        !isPlainObject(item) ||
        typeof item.original !== "string" ||
        typeof item.translated !== "string"
    );
    if (badIndex >= 0) {
      errors.push(
        `翻译历史数据格式不正确：第 ${badIndex + 1} 条缺少 original 或 translated 文本`
      );
    }
  }

  if (!Array.isArray(data.jargon)) {
    errors.push("备份缺少「生词本」数据（data.jargon 必须是数组）");
  } else {
    const badIndex = data.jargon.findIndex(
      (item) =>
        !isPlainObject(item) ||
        typeof item.term !== "string" ||
        !item.term.trim() ||
        typeof item.explanation !== "string" ||
        !item.explanation.trim()
    );
    if (badIndex >= 0) {
      errors.push(
        `生词本数据格式不正确：第 ${badIndex + 1} 条缺少 term 或 explanation`
      );
    }
  }

  if (!isPlainObject(data.sessions)) {
    errors.push("备份缺少「侧边栏会话」数据（data.sessions 必须是对象）");
  } else {
    const sessions = data.sessions.sessions;
    if (!Array.isArray(sessions)) {
      errors.push("侧边栏会话数据格式不正确：sessions 必须是数组");
    } else {
      const badIndex = sessions.findIndex(
        (session) =>
          !isPlainObject(session) ||
          typeof session.id !== "string" ||
          !Array.isArray(session.messages)
      );
      if (badIndex >= 0) {
        errors.push(
          `侧边栏会话数据格式不正确：第 ${badIndex + 1} 个会话缺少 id 或 messages`
        );
      }
    }
    const activeId: unknown = data.sessions.activeSessionId;
    if (
      activeId !== null &&
      activeId !== undefined &&
      typeof activeId !== "string"
    ) {
      errors.push("侧边栏会话数据格式不正确：activeSessionId 必须是字符串或 null");
    }
  }

  if (!isPlainObject(data.settings)) {
    errors.push("备份缺少「用户设置」数据（data.settings 必须是对象）");
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join("；") };
  }

  // 走到这里说明结构全部合法；重新提取为具名局部变量以便类型收窄
  const historyList = (data.history as Array<Record<string, unknown>>).map(
    (item): BackupHistoryItem => ({
      original: item.original as string,
      translated: item.translated as string,
      ...(typeof item.reasoning === "string"
        ? { reasoning: item.reasoning }
        : {}),
      ...(typeof item.hasReasoning === "boolean"
        ? { hasReasoning: item.hasReasoning }
        : {}),
      ...(typeof item.timestamp === "number"
        ? { timestamp: item.timestamp }
        : {}),
      ...(item.resultSource === JARGON_VAULT_RESULT_SOURCE
        ? { resultSource: JARGON_VAULT_RESULT_SOURCE }
        : {}),
    })
  );
  const jargonList = data.jargon as unknown as JargonItem[];
  const sessionsData = data.sessions as unknown as Record<string, unknown>;
  const settingsData = data.settings as unknown as Record<string, unknown>;
  const activeSessionId =
    typeof sessionsData.activeSessionId === "string"
      ? sessionsData.activeSessionId
      : null;

  return {
    valid: true,
    backup: {
      version: BACKUP_VERSION,
      exportedAt: json.exportedAt as string,
      app: BACKUP_APP_ID,
      data: {
        history: historyList,
        jargon: jargonList,
        sessions: {
          sessions: sessionsData.sessions as unknown as ChatSession[],
          activeSessionId,
        },
        settings: settingsData,
      },
    },
  };
}

function describeSectionError(
  section: BackupSectionKey,
  error: unknown
): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `「${BACKUP_SECTION_LABELS[section]}」恢复失败：${reason}`;
}

/**
 * 覆盖式恢复四类数据。恢复前会再次校验，任一分区写入失败不影响其他分区，
 * 结果中逐分区汇报。apiKey 永远不会被写入（见 sanitizeSettingsForBackup）。
 */
export async function restoreBackup(
  backup: BackupEnvelope
): Promise<BackupRestoreResult> {
  const check = validateBackup(backup);
  if (!check.valid || !check.backup) {
    throw new Error(check.error || "备份文件格式不正确，已中止恢复");
  }
  const data = check.backup.data;
  const restored: BackupSectionKey[] = [];
  const failed: BackupSectionKey[] = [];
  const errors: string[] = [];

  // 翻译历史（覆盖 storage.local 的 translationHistory）
  try {
    const storage = getStorageArea("local");
    if (!storage) throw new Error("当前环境没有可用的本地存储");
    const now = Date.now();
    const history = data.history.slice(0, MAX_HISTORY_COUNT).map((item) => ({
      original: item.original,
      translated: item.translated,
      reasoning: typeof item.reasoning === "string" ? item.reasoning : "",
      hasReasoning:
        typeof item.hasReasoning === "boolean"
          ? item.hasReasoning
          : Boolean(item.reasoning),
      timestamp:
        typeof item.timestamp === "number" && item.timestamp > 0
          ? item.timestamp
          : now,
      ...(item.resultSource === JARGON_VAULT_RESULT_SOURCE
        ? { resultSource: JARGON_VAULT_RESULT_SOURCE }
        : {}),
    }));
    await storage.set({ [HISTORY_STORAGE_KEY]: history });
    restored.push("history");
  } catch (error) {
    failed.push("history");
    errors.push(describeSectionError("history", error));
    logger.error("恢复翻译历史失败:", error);
  }

  // 生词本（经规范模型归一后覆盖 JARGON_STORAGE_KEY）
  try {
    const storage = getStorageArea("local");
    if (!storage) throw new Error("当前环境没有可用的本地存储");
    const items = data.jargon
      .map((item) => normalizeJargonItem(item))
      .filter((item): item is JargonItem => Boolean(item));
    await storage.set({ [JARGON_STORAGE_KEY]: items });
    restored.push("jargon");
  } catch (error) {
    failed.push("jargon");
    errors.push(describeSectionError("jargon", error));
    logger.error("恢复生词本失败:", error);
  }

  // 侧边栏会话（覆盖两个会话键）
  try {
    const storage = getStorageArea("local");
    if (!storage) throw new Error("当前环境没有可用的本地存储");
    const sessions = data.sessions.sessions;
    const payload: Record<string, unknown> = {
      [SESSIONS_STORAGE_KEY]: sessions,
      // 备份 v1 不携带未读全文；恢复会话时必须同步清空本机旧断点。
      [WEB_READING_PROGRESS_STORAGE_KEY]: {
        version: WEB_READING_PROGRESS_VERSION,
        records: {},
      },
    };
    if (
      data.sessions.activeSessionId &&
      sessions.some((session) => session.id === data.sessions.activeSessionId)
    ) {
      payload[ACTIVE_SESSION_STORAGE_KEY] = data.sessions.activeSessionId;
    } else if (sessions.length > 0) {
      // 备份未指定有效激活会话时，回落到第一个会话（与侧边栏加载逻辑一致）
      payload[ACTIVE_SESSION_STORAGE_KEY] = sessions[0].id;
    } else {
      payload[ACTIVE_SESSION_STORAGE_KEY] = "";
    }
    await storage.set(payload);
    restored.push("sessions");
  } catch (error) {
    failed.push("sessions");
    errors.push(describeSectionError("sessions", error));
    logger.error("恢复侧边栏会话失败:", error);
  }

  // 用户设置（剥离 apiKey 后经 SettingsUtils 存储层写入 sync + local）
  try {
    const settings = sanitizeSettingsForBackup(data.settings);
    if (Object.keys(settings).length > 0) {
      await SettingsUtils.setSettings(settings as Partial<UserSettings>);
    }
    restored.push("settings");
  } catch (error) {
    failed.push("settings");
    errors.push(describeSectionError("settings", error));
    logger.error("恢复用户设置失败:", error);
  }

  logger.log("备份恢复完成", { restored, failed });

  return {
    restored,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}
