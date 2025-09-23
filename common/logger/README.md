# 通用日志系统

基于 `debug` 包的跨平台日志解决方案，支持多种环境和丰富的配置选项。

## 特性

- 🌍 **跨平台支持**：浏览器、Node.js、Web Worker、浏览器扩展
- 🎯 **命名空间**：支持分层命名空间，便于分类管理
- 📊 **日志级别**：TRACE、DEBUG、INFO、WARN、ERROR、SILENT
- 🎨 **样式支持**：时间戳、颜色、emoji、上下文信息
- 🔧 **灵活配置**：全局配置、实例配置、运行时配置
- 🚀 **性能优化**：条件日志输出，生产环境友好
- 📦 **零依赖**：仅依赖 `debug` 包

## 安装

```bash
npm install debug
# 或
yarn add debug
```

## 基本用法

### 1. 简单使用

```typescript
import { createLogger } from './logger/universal';

// 创建日志器
const logger = createLogger('my-app');

// 输出日志
logger.info('应用启动');
logger.warn('配置文件未找到');
logger.error('网络连接失败');
```

### 2. 带配置的使用

```typescript
import { createLogger, LogLevel } from './logger/universal';

const logger = createLogger('my-app', {
  emoji: '🚀',
  level: LogLevel.DEBUG,
  timestamp: true,
  colors: true
});

logger.debug('调试信息');
logger.info('一般信息');
logger.success('操作成功');
```

### 3. 子日志器

```typescript
const appLogger = createLogger('my-app');
const apiLogger = appLogger.child('api');
const dbLogger = appLogger.child('database');

// 命名空间：my-app:api
apiLogger.info('API 请求开始');

// 命名空间：my-app:database
dbLogger.info('数据库连接成功');
```

## 高级用法

### 1. 全局配置

```typescript
import { setGlobalLoggerConfig, applyPreset } from './logger/universal';

// 应用预设配置
applyPreset('development'); // 开发环境
applyPreset('production');  // 生产环境

// 自定义全局配置
setGlobalLoggerConfig({
  level: LogLevel.INFO,
  timestamp: true,
  colors: true
});
```

### 2. 环境检测

```typescript
import { EnvironmentUtils } from './logger/universal';

if (EnvironmentUtils.isBrowser()) {
  console.log('浏览器环境');
}

if (EnvironmentUtils.isNode()) {
  console.log('Node.js 环境');
}

if (EnvironmentUtils.isExtension()) {
  console.log('浏览器扩展环境');
}
```

### 3. 调试控制

```typescript
import { enableDebug, disableDebug } from './logger/universal';

// 启用所有调试
enableDebug('*');

// 启用特定命名空间
enableDebug('my-app:*');

// 禁用调试
disableDebug();
```

### 4. 上下文信息

```typescript
const logger = createLogger('my-app');

// 设置上下文
logger.setContext({
  userId: '12345',
  sessionId: 'abc-def'
});

logger.info('用户登录'); // 输出会包含上下文信息

// 清除上下文
logger.clearContext();
```

## 配置选项

### LoggerConfig

```typescript
interface LoggerConfig {
  namespace?: string;      // 命名空间
  prefix?: string;         // 前缀
  emoji?: string;          // emoji 图标
  enabled?: boolean;       // 是否启用
  level?: LogLevel;        // 日志级别
  colors?: boolean;        // 是否启用颜色
  timestamp?: boolean;     // 是否显示时间戳
  context?: Record<string, any>; // 上下文信息
}
```

### 日志级别

```typescript
enum LogLevel {
  TRACE = 0,  // 最详细
  DEBUG = 1,  // 调试
  INFO = 2,   // 信息
  WARN = 3,   // 警告
  ERROR = 4,  // 错误
  SILENT = 5  // 静默
}
```

## 浏览器控制台使用

在浏览器控制台中，可以通过 `localStorage` 控制日志输出：

```javascript
// 启用所有日志
localStorage.setItem('debug', '*')

// 启用特定应用
localStorage.setItem('debug', 'my-app:*')

// 启用特定模块
localStorage.setItem('debug', 'my-app:api')

// 禁用所有日志
localStorage.removeItem('debug')
```

## Node.js 使用

在 Node.js 环境中，可以通过环境变量控制：

```bash
# 启用所有日志
DEBUG=* node app.js

# 启用特定应用
DEBUG=my-app:* node app.js

# 启用特定模块
DEBUG=my-app:api node app.js
```

## 项目结构

```
logger/
├── UniversalLogger.ts    # 核心日志器类
├── types.ts             # 类型定义
├── utils.ts             # 工具函数
├── index.ts             # 原有日志器（保持兼容）
├── universal.ts         # 通用日志系统导出
└── README.md            # 文档
```

## 与原系统的区别

| 特性 | 原系统 | 通用系统 |
|------|--------|----------|
| 命名空间 | 固定前缀 | 可配置 |
| 日志级别 | 简单控制 | 完整级别 |
| 配置选项 | 基础 | 丰富 |
| 环境支持 | 浏览器扩展 | 多平台 |
| 子日志器 | 不支持 | 支持 |
| 上下文信息 | 不支持 | 支持 |
| 全局配置 | 不支持 | 支持 |

## 迁移指南

从原系统迁移到通用系统：

```typescript
// 原系统
import { createLogger } from './logger';
const logger = createLogger('api', '🌐');

// 通用系统
import { createLogger } from './logger/universal';
const logger = createLogger('api', {
  emoji: '🌐',
  namespace: 'api'
});
```

## 许可证

MIT License