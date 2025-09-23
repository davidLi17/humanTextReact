/**
 * 通用日志系统
 * 基于 debug 包的跨平台日志解决方案
 *
 * 特性：
 * - 支持多种环境（浏览器、Node.js、Web Worker、浏览器扩展）
 * - 可配置的日志级别
 * - 命名空间支持
 * - 上下文信息
 * - 时间戳和颜色支持
 * - 子日志器创建
 * - 全局配置管理
 */

import { LoggerConfig } from "./types";
import { UniversalLogger } from "./UniversalLogger";
import {
  applyPreset,
  createLogger,
  createPrefixedLogger,
  disableDebug,
  enableDebug,
  EnvironmentUtils,
  getGlobalLoggerConfig,
  LoggerPresets,
  LogLevelUtils,
  resetGlobalLoggerConfig,
  setGlobalLoggerConfig,
} from "./utils";

// 核心类
export { UniversalLogger } from "./UniversalLogger";

// 类型定义
export {
  DEFAULT_CONFIG,
  LOG_LEVEL_EMOJIS,
  LOG_LEVEL_NAMES,
  LoggerConfig,
  LogLevel,
} from "./types";

// 工具函数
export {
  applyPreset,
  createLogger,
  createPrefixedLogger,
  disableDebug,
  disableNamespaceDebug,
  enableDebug,
  enableNamespaceDebug,
  EnvironmentUtils,
  getGlobalLoggerConfig,
  LoggerPresets,
  LogLevelUtils,
  resetGlobalLoggerConfig,
  setGlobalLoggerConfig,
} from "./utils";

// 重新导出 debug 包以供高级使用
export { default as debug } from "debug";

/**
 * 快捷方法 - 创建日志器
 */
export const logger = (namespace: string, config?: LoggerConfig) =>
  createLogger(namespace, config);

/**
 * 快捷方法 - 创建带前缀的日志器
 */
export const prefixedLogger = (
  prefix: string,
  namespace: string,
  config?: LoggerConfig
) => createPrefixedLogger(prefix, namespace, config);

/**
 * 默认导出
 */
export default {
  UniversalLogger,
  createLogger,
  createPrefixedLogger,
  setGlobalLoggerConfig,
  getGlobalLoggerConfig,
  resetGlobalLoggerConfig,
  enableDebug,
  disableDebug,
  LogLevelUtils,
  EnvironmentUtils,
  LoggerPresets,
  applyPreset,
  logger,
  prefixedLogger,
};
