/**
 * 通用日志系统使用示例
 */

import {
  createLogger,
  createPrefixedLogger,
  UniversalLogger,
  LogLevel,
  setGlobalLoggerConfig,
  applyPreset,
  enableDebug,
  EnvironmentUtils
} from './universal';

// ============================
// 基本使用示例
// ============================

export function basicUsage() {
  // 1. 创建简单日志器
  const logger = createLogger('my-app');

  logger.info('应用启动');
  logger.warn('配置文件未找到，使用默认值');
  logger.error('网络连接失败');
  logger.success('数据保存成功');
  logger.debug('调试信息');
  logger.trace('详细跟踪信息');
}

// ============================
// 配置使用示例
// ============================

export function configuredUsage() {
  // 2. 创建带配置的日志器
  const logger = createLogger('api', {
    emoji: '🌐',
    level: LogLevel.DEBUG,
    timestamp: true,
    colors: true,
    context: {
      service: 'api-service',
      version: '1.0.0'
    }
  });

  logger.info('API 服务启动');
  logger.debug('处理请求: GET /api/users');
  logger.error('数据库连接失败', { error: 'Connection timeout' });
}

// ============================
// 子日志器示例
// ============================

export function childLoggerUsage() {
  // 3. 创建父日志器
  const appLogger = createLogger('my-app', {
    emoji: '🚀',
    context: { version: '1.0.0' }
  });

  // 创建子日志器
  const apiLogger = appLogger.child('api', {
    emoji: '🌐',
    context: { service: 'api' }
  });

  const dbLogger = appLogger.child('database', {
    emoji: '🗄️',
    context: { service: 'database' }
  });

  appLogger.info('应用启动');
  apiLogger.info('API 服务启动');
  dbLogger.info('数据库连接成功');
}

// ============================
// 全局配置示例
// ============================

export function globalConfigUsage() {
  // 4. 应用预设配置
  applyPreset('development');

  const devLogger = createLogger('dev-app');
  devLogger.debug('开发环境调试信息');

  // 5. 切换到生产环境
  applyPreset('production');

  const prodLogger = createLogger('prod-app');
  prodLogger.info('生产环境信息');  // 只有 INFO 和以上级别会输出
}

// ============================
// 环境检测示例
// ============================

export function environmentDetection() {
  // 6. 环境检测
  if (EnvironmentUtils.isBrowser()) {
    console.log('当前是浏览器环境');
  }

  if (EnvironmentUtils.isNode()) {
    console.log('当前是 Node.js 环境');
  }

  if (EnvironmentUtils.isExtension()) {
    console.log('当前是浏览器扩展环境');
  }

  // 根据环境创建不同的日志器
  const prefix = EnvironmentUtils.isExtension() ? 'extension' : 'app';
  const logger = createPrefixedLogger(prefix, 'main');
  logger.info('日志器已创建');
}

// ============================
// 调试控制示例
// ============================

export function debugControl() {
  const logger = createLogger('debug-example');

  // 7. 启用调试
  enableDebug('debug-example');
  logger.debug('这条信息会显示');

  // 8. 禁用调试
  enableDebug('');
  logger.debug('这条信息不会显示');
}

// ============================
// 实际应用示例
// ============================

export function realWorldExample() {
  // Web 应用日志器
  const webLogger = createLogger('web-app', {
    emoji: '🌍',
    level: LogLevel.INFO,
    timestamp: true,
    context: {
      env: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    }
  });

  // API 服务日志器
  const apiLogger = webLogger.child('api', {
    emoji: '🌐',
    context: { service: 'api' }
  });

  // 数据库日志器
  const dbLogger = webLogger.child('database', {
    emoji: '🗄️',
    context: { service: 'database' }
  });

  // 模拟应用启动
  webLogger.info('应用启动');

  // 模拟 API 请求
  apiLogger.info('处理用户登录请求', { userId: '12345' });
  apiLogger.debug('查询数据库', { query: 'SELECT * FROM users WHERE id = ?' });

  // 模拟数据库操作
  dbLogger.info('执行查询', { table: 'users', operation: 'SELECT' });
  dbLogger.warn('查询较慢', { duration: 1500, threshold: 1000 });

  // 模拟错误处理
  try {
    // 模拟错误
    throw new Error('网络连接失败');
  } catch (error) {
    apiLogger.error('API 请求失败', { error: error.message, stack: error.stack });
  }

  webLogger.success('应用运行正常');
}

// ============================
// 性能监控示例
// ============================

export function performanceMonitoring() {
  const perfLogger = createLogger('performance', {
    emoji: '⚡',
    level: LogLevel.INFO,
    timestamp: true
  });

  // 监控函数执行时间
  function measureTime<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    if (duration > 1000) {
      perfLogger.warn(`函数 ${name} 执行时间过长`, { duration, threshold: 1000 });
    } else if (duration > 100) {
      perfLogger.info(`函数 ${name} 执行时间`, { duration });
    } else {
      perfLogger.debug(`函数 ${name} 执行时间`, { duration });
    }

    return result;
  }

  // 使用示例
  measureTime('data-processing', () => {
    // 模拟数据处理
    return Array.from({ length: 1000 }, (_, i) => i * 2);
  });
}

// ============================
// 测试示例
// ============================

export function testExample() {
  // 测试环境配置
  setGlobalLoggerConfig({
    level: LogLevel.SILENT,  // 测试时禁用日志
    enabled: false
  });

  const testLogger = createLogger('test');
  testLogger.info('这条信息不会显示');

  // 测试完成后恢复
  setGlobalLoggerConfig({
    level: LogLevel.INFO,
    enabled: true
  });
}

// ============================
// 导出所有示例
// ============================

export const examples = {
  basicUsage,
  configuredUsage,
  childLoggerUsage,
  globalConfigUsage,
  environmentDetection,
  debugControl,
  realWorldExample,
  performanceMonitoring,
  testExample
};