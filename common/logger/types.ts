/**
 * 通用日志系统配置
 */
export interface LoggerConfig {
  /** 日志器命名空间，用于分类和过滤日志 */
  namespace?: string;
  /** 日志器前缀，通常用于项目或模块标识 */
  prefix?: string;
  /** 日志器表情符号，用于视觉区分不同类型的日志器 */
  emoji?: string;
  /** 是否启用日志器，默认为 true */
  enabled?: boolean;
  /** 日志级别，控制输出的详细程度 */
  level?: LogLevel;
  /** 是否启用颜色输出，提升可读性 */
  colors?: boolean;
  /** 是否显示时间戳，便于调试和追踪 */
  timestamp?: boolean;
  /** 上下文信息，包含额外的元数据 */
  context?: Record<string, any>;
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  /** 最详细的调试信息，用于深度调试 */
  TRACE = 0,
  /** 调试信息，开发时使用 */
  DEBUG = 1,
  /** 一般信息，正常运行状态 */
  INFO = 2,
  /** 警告信息，潜在问题 */
  WARN = 3,
  /** 错误信息，需要处理的问题 */
  ERROR = 4,
  /** 静默模式，不输出任何日志 */
  SILENT = 5,
}

/**
 * 日志级别名称映射
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: "trace",
  [LogLevel.DEBUG]: "debug",
  [LogLevel.INFO]: "info",
  [LogLevel.WARN]: "warn",
  [LogLevel.ERROR]: "error",
  [LogLevel.SILENT]: "silent",
};

/**
 * 日志级别 emoji 映射
 */
export const LOG_LEVEL_EMOJIS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: "🔍",
  [LogLevel.DEBUG]: "🐛",
  [LogLevel.INFO]: "ℹ️",
  [LogLevel.WARN]: "⚠️",
  [LogLevel.ERROR]: "❌",
  [LogLevel.SILENT]: "🔇",
};

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<LoggerConfig> = {
  /** 默认命名空间 */
  namespace: "app",
  /** 默认前缀为空 */
  prefix: "",
  /** 默认表情符号 */
  emoji: "📝",
  /** 默认启用日志器 */
  enabled: true,
  /** 默认日志级别为 INFO */
  level: LogLevel.INFO,
  /** 默认启用颜色输出 */
  colors: true,
  /** 默认显示时间戳 */
  timestamp: true,
  /** 默认上下文为空对象 */
  context: {},
};