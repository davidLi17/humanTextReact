import debugLib from "debug";
import {
  DEFAULT_CONFIG,
  LOG_LEVEL_EMOJIS,
  LOG_LEVEL_NAMES,
  LoggerConfig,
  LogLevel,
} from "./types";

/**
 * 通用日志系统
 * 基于 debug 包，支持命名空间和条件日志输出
 * 可在任何浏览器环境、Node.js 或扩展中使用
 */
export class UniversalLogger {
  private debugger: debugLib.Debugger;
  private config: Required<LoggerConfig>;
  private storageAvailable: boolean;

  constructor(config: LoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storageAvailable = this.checkStorageAvailable();
    this.debugger = this.createDebugger();
  }

  /**
   * 创建调试器实例
   */
  private createDebugger(): debugLib.Debugger {
    const namespace = this.config.prefix
      ? `${this.config.prefix}:${this.config.namespace}`
      : this.config.namespace;

    return debugLib(namespace);
  }

  /**
   * 检查 localStorage 是否可用
   */
  private checkStorageAvailable(): boolean {
    try {
      return typeof localStorage !== "undefined" && localStorage !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    if (level < this.config.level) return false;

    // 检查 localStorage 中的 debug 设置
    if (this.storageAvailable) {
      const debugSetting = localStorage.getItem("debug");
      if (debugSetting) {
        const namespace = this.config.prefix
          ? `${this.config.prefix}:${this.config.namespace}`
          : this.config.namespace;

        return debugSetting.includes("*") || debugSetting.includes(namespace);
      }
    }

    return true;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, args: any[]): any[] {
    const emoji = LOG_LEVEL_EMOJIS[level];
    const levelName = LOG_LEVEL_NAMES[level].toUpperCase();
    const timestamp = this.config.timestamp ? new Date().toISOString() : "";

    const formattedArgs: any[] = [];

    if (this.config.timestamp) {
      formattedArgs.push(`[${timestamp}]`);
    }

    formattedArgs.push(`${emoji} [${levelName}]`);

    if (Object.keys(this.config.context).length > 0) {
      formattedArgs.push(`[${JSON.stringify(this.config.context)}]`);
    }

    return [...formattedArgs, ...args];
  }

  /**
   * 内部日志方法
   */
  private log(level: LogLevel, ...args: any[]): void {
    if (this.shouldLog(level)) {
      const formattedArgs = this.formatMessage(level, args);
      this.debugger(...formattedArgs);
    }
  }

  /**
   * TRACE 级别日志 - 最详细的调试信息
   */
  trace(...args: any[]): void {
    this.log(LogLevel.TRACE, ...args);
  }

  /**
   * DEBUG 级别日志 - 调试信息
   */
  debug(...args: any[]): void {
    this.log(LogLevel.DEBUG, ...args);
  }

  /**
   * INFO 级别日志 - 一般信息
   */
  info(...args: any[]): void {
    this.log(LogLevel.INFO, ...args);
  }

  /**
   * WARN 级别日志 - 警告信息
   */
  warn(...args: any[]): void {
    this.log(LogLevel.WARN, ...args);
  }

  /**
   * ERROR 级别日志 - 错误信息
   */
  error(...args: any[]): void {
    this.log(LogLevel.ERROR, ...args);
  }

  /**
   * SUCCESS 级别日志 - 成功信息（INFO 级别）
   */
  success(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedArgs = this.formatMessage(LogLevel.INFO, args);
      formattedArgs[1] = "✅ [SUCCESS]"; // 替换为成功 emoji
      this.debugger(...formattedArgs);
    }
  }

  /**
   * 创建子日志器
   */
  child(
    namespace: string,
    config: Partial<LoggerConfig> = {}
  ): UniversalLogger {
    const childConfig: LoggerConfig = {
      ...this.config,
      namespace: `${this.config.namespace}:${namespace}`,
      ...config,
    };
    return new UniversalLogger(childConfig);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.debugger = this.createDebugger();
  }

  /**
   * 设置上下文信息
   */
  setContext(context: Record<string, any>): void {
    this.config.context = { ...this.config.context, ...context };
  }

  /**
   * 清除上下文信息
   */
  clearContext(): void {
    this.config.context = {};
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取当前配置
   */
  getConfig(): Required<LoggerConfig> {
    return { ...this.config };
  }

  /**
   * 获取命名空间
   */
  getNamespace(): string {
    return this.config.namespace;
  }

  /**
   * 获取完整的调试器命名空间
   */
  getFullNamespace(): string {
    return this.config.prefix
      ? `${this.config.prefix}:${this.config.namespace}`
      : this.config.namespace;
  }

  /**
   * 销毁日志器
   */
  destroy(): void {
    this.debugger.destroy();
  }
}
