import { UniversalLogger } from './UniversalLogger';
import { LoggerConfig, LogLevel } from './types';

/**
 * 默认配置管理器
 */
class ConfigManager {
  private static globalConfig: Partial<LoggerConfig> = {};

  static setGlobalConfig(config: Partial<LoggerConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
  }

  static getGlobalConfig(): Partial<LoggerConfig> {
    return { ...this.globalConfig };
  }

  static resetGlobalConfig(): void {
    this.globalConfig = {};
  }
}

/**
 * 创建日志器实例
 */
export function createLogger(
  namespace: string,
  config: LoggerConfig = {}
): UniversalLogger {
  const mergedConfig = { ...ConfigManager.getGlobalConfig(), namespace, config };
  return new UniversalLogger(mergedConfig);
}

/**
 * 创建带前缀的日志器实例
 */
export function createPrefixedLogger(
  prefix: string,
  namespace: string,
  config: LoggerConfig = {}
): UniversalLogger {
  const mergedConfig = {
    ...ConfigManager.getGlobalConfig(),
    namespace,
    prefix,
    ...config
  };
  return new UniversalLogger(mergedConfig);
}

/**
 * 设置全局日志配置
 */
export function setGlobalLoggerConfig(config: Partial<LoggerConfig>): void {
  ConfigManager.setGlobalConfig(config);
}

/**
 * 获取全局日志配置
 */
export function getGlobalLoggerConfig(): Partial<LoggerConfig> {
  return ConfigManager.getGlobalConfig();
}

/**
 * 重置全局日志配置
 */
export function resetGlobalLoggerConfig(): void {
  ConfigManager.resetGlobalConfig();
}

/**
 * 启用调试模式
 */
export function enableDebug(namespace: string = '*'): void {
  if (typeof localStorage !== 'undefined' && localStorage !== null) {
    localStorage.setItem('debug', namespace);
  }
}

/**
 * 禁用调试模式
 */
export function disableDebug(): void {
  if (typeof localStorage !== 'undefined' && localStorage !== null) {
    localStorage.removeItem('debug');
  }
}

/**
 * 启用特定命名空间的调试
 */
export function enableNamespaceDebug(namespace: string): void {
  if (typeof localStorage !== 'undefined' && localStorage !== null) {
    const current = localStorage.getItem('debug') || '';
    const namespaces = current.split(',').filter(n => n.trim());

    if (!namespaces.includes(namespace)) {
      namespaces.push(namespace);
      localStorage.setItem('debug', namespaces.join(','));
    }
  }
}

/**
 * 禁用特定命名空间的调试
 */
export function disableNamespaceDebug(namespace: string): void {
  if (typeof localStorage !== 'undefined' && localStorage !== null) {
    const current = localStorage.getItem('debug') || '';
    const namespaces = current.split(',').filter(n => n.trim() && n !== namespace);

    if (namespaces.length > 0) {
      localStorage.setItem('debug', namespaces.join(','));
    } else {
      localStorage.removeItem('debug');
    }
  }
}

/**
 * 日志级别工具
 */
export const LogLevelUtils = {
  /**
   * 将字符串转换为日志级别
   */
  fromString(level: string): LogLevel {
    const normalized = level.toLowerCase();
    switch (normalized) {
      case 'trace':
        return LogLevel.TRACE;
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      case 'silent':
        return LogLevel.SILENT;
      default:
        return LogLevel.INFO;
    }
  },

  /**
   * 将日志级别转换为字符串
   */
  toString(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE:
        return 'trace';
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.SILENT:
        return 'silent';
      default:
        return 'info';
    }
  },

  /**
   * 检查日志级别是否启用
   */
  isEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
    return targetLevel >= currentLevel;
  }
};

/**
 * 环境检测工具
 */
export const EnvironmentUtils = {
  /**
   * 检测是否为浏览器环境
   */
  isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  },

  /**
   * 检测是否为 Node.js 环境
   */
  isNode(): boolean {
    return !!(typeof process !== 'undefined' && process.versions && process.versions.node);
  },

  /**
   * 检测是否为 Web Worker 环境
   */
  isWebWorker(): boolean {
    return typeof self === 'object' && self.constructor && self.constructor.name === 'WorkerGlobalScope';
  },

  /**
   * 检测是否为浏览器扩展环境
   */
  isExtension(): boolean {
    // 检查 WXT 的 browser 对象（浏览器扩展）
    return !!(typeof (globalThis as any).browser !== 'undefined' && (globalThis as any).browser.runtime && (globalThis as any).browser.runtime.id);
  }
};

/**
 * 预设配置
 */
export const LoggerPresets = {
  /**
   * 开发环境配置
   */
  development: {
    level: LogLevel.DEBUG,
    enabled: true,
    timestamp: true,
    colors: true
  },

  /**
   * 生产环境配置
   */
  production: {
    level: LogLevel.WARN,
    enabled: true,
    timestamp: true,
    colors: false
  },

  /**
   * 测试环境配置
   */
  test: {
    level: LogLevel.SILENT,
    enabled: false,
    timestamp: false,
    colors: false
  },

  /**
   * 调试环境配置
   */
  debug: {
    level: LogLevel.TRACE,
    enabled: true,
    timestamp: true,
    colors: true
  }
};

/**
 * 应用预设配置
 */
export function applyPreset(preset: keyof typeof LoggerPresets): void {
  setGlobalLoggerConfig(LoggerPresets[preset]);
}