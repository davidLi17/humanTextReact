/**
 * 通用日志系统配置
 */
export interface LoggerConfig {
  namespace?: string;
  prefix?: string;
  emoji?: string;
  enabled?: boolean;
  level?: LogLevel;
  colors?: boolean;
  timestamp?: boolean;
  context?: Record<string, any>;
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}

/**
 * 日志级别名称映射
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'trace',
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
  [LogLevel.SILENT]: 'silent'
};

/**
 * 日志级别 emoji 映射
 */
export const LOG_LEVEL_EMOJIS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: '🔍',
  [LogLevel.DEBUG]: '🐛',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
  [LogLevel.SILENT]: '🔇'
};

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<LoggerConfig> = {
  namespace: 'app',
  prefix: '',
  emoji: '📝',
  enabled: true,
  level: LogLevel.INFO,
  colors: true,
  timestamp: true,
  context: {}
};