import { LOG_LEVELS, LogLevel } from "@/entrypoints/shared/constants";
import debugLib from "debug";

/**
 * 专业的日志管理系统
 * 基于 debug 包，支持命名空间和条件日志输出
 */
export class Logger {
  private debugger: debugLib.Debugger;
  private emoji: string;
  private namespace: string;

  constructor(namespace: string, emoji: string = "🔧") {
    this.namespace = namespace;
    this.debugger = debugLib(`human-text:${namespace}`);
    this.emoji = emoji;
  }

  /**
   * 普通日志 (debug 级别)
   */
  log(...args: any[]) {
    if (shouldLog("log")) {
      this.debugger(`${this.emoji}`, ...args);
    }
  }

  /**
   * 信息日志 (info 级别)
   */
  info(...args: any[]) {
    if (shouldLog("info")) {
      this.debugger(`${this.emoji} ℹ️`, ...args);
    }
  }

  /**
   * 警告日志 (warn 级别)
   */
  warn(...args: any[]) {
    if (shouldLog("warn")) {
      this.debugger(`${this.emoji} ⚠️`, ...args);
    }
  }

  /**
   * 错误日志 (error 级别)
   */
  error(...args: any[]) {
    if (shouldLog("error")) {
      this.debugger(`${this.emoji} ❌`, ...args);
    }
  }

  /**
   * 成功日志 (info 级别)
   */
  success(...args: any[]) {
    if (shouldLog("success")) {
      this.debugger(`${this.emoji} ✅`, ...args);
    }
  }

  /**
   * 调试日志 (debug 级别)
   */
  trace(...args: any[]) {
    if (shouldLog("trace")) {
      this.debugger(`${this.emoji} 🐛`, ...args);
    }
  }

  /**
   * 获取命名空间
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * 获取完整的调试器命名空间
   */
  getFullNamespace(): string {
    return `human-text:${this.namespace}`;
  }
}

/**
 * 创建新的日志器实例
 */
export function createLogger(namespace: string, emoji?: string): Logger {
  return new Logger(namespace, emoji);
}

/**
 * 检测 localStorage 是否可用
 * 在 Content Script 环境中 localStorage 可能未定义
 */
function isLocalStorageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch (error) {
    return false;
  }
}

/**
 * 初始化日志系统
 * 根据设置开启或关闭日志输出
 */
export async function initializeLogger() {
  try {
    // 从存储中获取日志级别设置（兼容新老两种格式，并从 local 做兜底）
    const syncResult = await browser.storage.sync.get(["logLevel", "settings"]);
    let logLevel: LogLevel = LOG_LEVELS.OFF;

    if (syncResult?.settings?.logLevel) {
      logLevel = syncResult.settings.logLevel as LogLevel;
    } else if (syncResult?.logLevel) {
      logLevel = syncResult.logLevel as LogLevel;
    } else {
      // 兜底从 local 读取
      const localResult = await browser.storage.local.get([
        "logLevel",
        "settings",
      ]);
      if (localResult?.settings?.logLevel) {
        logLevel = localResult.settings.logLevel as LogLevel;
      } else if (localResult?.logLevel) {
        logLevel = localResult.logLevel as LogLevel;
      }
    }

    // 设置当前日志级别
    setCurrentLogLevel(logLevel);

    // 根据日志级别设置 debug 包的启用状态
    if (logLevel === LOG_LEVELS.OFF) {
      debugLib.disable(); // 完全禁用 debug
      // 只在 localStorage 可用时操作
      if (isLocalStorageAvailable()) {
        localStorage.removeItem("debug");
      }
    } else {
      const patterns = getDebugPatterns(logLevel);
      // 启用 debug 并设置模式
      debugLib.enable(patterns);
      // 只在 localStorage 可用时操作
      if (isLocalStorageAvailable()) {
        localStorage.setItem("debug", patterns);
      }
    }

    // 调试输出当前日志级别
    console.log(`[日志系统] 已初始化，级别: ${logLevel}`);
  } catch (error) {
    console.error("初始化日志系统失败:", error);
  }
}
/**
 * 根据日志级别获取 debug 模式的启用模式
 * 注意：debug 包启用所有匹配的命名空间，实际的级别过滤通过 shouldLog 函数控制
 */
function getDebugPatterns(logLevel: LogLevel): string {
  switch (logLevel) {
    case LOG_LEVELS.ERROR:
    case LOG_LEVELS.WARN:
    case LOG_LEVELS.INFO:
    case LOG_LEVELS.DEBUG:
      return "human-text:*"; // 启用所有 human-text 命名空间，具体级别由 shouldLog 控制
    default:
      return "";
  }
}

/**
 * 检查当前日志级别是否应该显示特定类型的日志
 */
export function shouldLog(
  logType: "log" | "info" | "warn" | "error" | "success" | "trace"
): boolean {
  const currentLevel = getCurrentLogLevel();

  if (currentLevel === LOG_LEVELS.OFF) return false;

  switch (currentLevel) {
    case LOG_LEVELS.ERROR:
      return logType === "error";
    case LOG_LEVELS.WARN:
      return logType === "error" || logType === "warn";
    case LOG_LEVELS.INFO:
      return (
        logType === "error" ||
        logType === "warn" ||
        logType === "info" ||
        logType === "success"
      );
    case LOG_LEVELS.DEBUG:
      return true; // 显示所有日志类型
    default:
      return false;
  }
}

/**
 * 获取当前日志级别
 */
let currentLogLevel: LogLevel = LOG_LEVELS.OFF;

function getCurrentLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * 设置当前日志级别
 */
function setCurrentLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

// 预定义的日志器实例
export const backgroundLogger = createLogger("background", "🔙");
export const contentLogger = createLogger("content", "📄");
export const popupLogger = createLogger("popup", "🔽");
export const optionsLogger = createLogger("options", "⚙️");
export const translationLogger = createLogger("translation", "🌐");
export const messageLogger = createLogger("message", "📨");
export const settingsLogger = createLogger("settings", "⚙️");
