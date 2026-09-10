[根目录](../../CLAUDE.md) > [entrypoints](../) > **shared**

# Shared 模块 - 共享工具层

## 模块职责

Shared 模块是人话翻译器的共享工具层，提供跨模块的常量定义、设置管理、日志系统等核心功能。该模块被所有其他模块依赖，确保整个应用的一致性和可维护性。

**核心职责**：
- 📋 全局常量和类型定义
- ⚙️ 统一的设置管理
- 📝 专业的日志系统
- 🔄 模块间通信协议
- 🎯 工具函数和辅助方法

## 模块结构

### 子模块组成
- **constants/** - 常量定义
- **logger/** - 日志系统
- **settingsUtils.ts** - 设置工具

## 对外接口

### 常量导出
```typescript
// 消息类型
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",
  CLEANUP: "cleanup",
  GET_HISTORY: "getHistory",
  // ... 更多消息类型
} as const;

// 日志级别
export const LOG_LEVELS = {
  OFF: "off",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// 默认设置
export const DEFAULT_SETTINGS = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  model: "kimi-k2-250905",
  temperature: 0.7,
  promptTemplate: "System Prompt...",
  apiKey: "your_api_key",
  thinkingEnabled: false,
  logLevel: LOG_LEVELS.OFF,
} as const;
```

### 设置管理接口
```typescript
export class SettingsUtils {
  static async getSettings(): Promise<UserSettings>
  static async getSetting<K extends keyof UserSettings>(key: K): Promise<UserSettings[K]>
  static async hasApiKey(): Promise<boolean>
  static clearCache(): void
  static onSettingsChanged(callback: (settings: UserSettings) => void): () => void
}
```

### 日志系统接口
```typescript
export class Logger {
  log(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
  success(...args: any[]): void
  trace(...args: any[]): void
}

export function createLogger(namespace: string, emoji?: string, prefix?: string): Logger
export async function initializeLogger(context?: LoggerContext): Promise<void>
```

## 关键依赖与配置

### 外部依赖
- **Chrome Extension API**: storage

### 内部依赖
- 模块内部自包含，无内部依赖

## 数据模型

### 用户设置接口
```typescript
export interface UserSettings {
  baseUrl: string;             // API 地址
  model: string;               // 模型 ID
  temperature: number;         // 温度参数
  promptTemplate: string;      // 提示词模板
  apiKey: string;              // API 密钥
  thinkingEnabled: boolean;    // 思维链开关
  logLevel: string;           // 日志级别
}
```

### 设置缓存接口
```typescript
interface SettingsCache {
  settings: UserSettings | null;
  timestamp: number;
  ttl: number;                 // 缓存时间（毫秒）
}
```

### 翻译请求接口
```typescript
export interface TranslationRequest {
  action: MessageType;
  text?: string;
  content?: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  done?: boolean;
  error?: string;
}
```

## 核心功能实现

### 1. 常量管理 (constants/index.ts)
**特点**：
- 集中化常量定义
- 类型安全的枚举
- 版本兼容性保证
- 模块间一致性

**核心功能**：
```typescript
// 消息类型常量
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",
  CLEANUP: "cleanup",
  GET_HISTORY: "getHistory",
  CLEAR_HISTORY: "clearHistory",
  DELETE_HISTORY_ITEM: "deleteHistoryItem",
  IMPORT_HISTORY: "importHistory",
  UPDATE_TRANSLATION: "updateTranslation",
  UPDATE_CONTENT_TRANSLATION: "updateContentTranslation",
  UPDATE_POPUP_TRANSLATION: "updatePopupTranslation",
  SHOW_TRANSLATION_POPUP: "showTranslationPopup",
  GET_SELECTED_TEXT: "getSelectedText",
} as const;

// 日志级别定义
export const LOG_LEVELS = {
  OFF: "off",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// 默认设置
export const DEFAULT_SETTINGS = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  model: "kimi-k2-250905",
  temperature: 0.7,
  promptTemplate: "System Prompt(系统提示词): 1. 用通俗易懂的中文解释以下内容...",
  apiKey: "your_api_key",
  thinkingEnabled: false,
  logLevel: LOG_LEVELS.OFF as LogLevel,
} as const;
```

### 2. 设置管理工具 (settingsUtils.ts)
**特点**：
- 内存缓存（TTL 5 分钟）减少 storage 往返
- 新旧存储格式兼容（`settings` 对象 ↔ 旧的平铺键值对）
- 非敏感设置经 `storage.sync` 跨设备同步；**`apiKey` 始终只存 `storage.local`**，
  写入 sync 时显式剔除，并主动清理历史遗留的顶层 `apiKey` 字段
- `onSettingsChanged` 变化监听

**核心功能**：
```typescript
export class SettingsUtils {
  private static cache: SettingsCache = {
    settings: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5分钟缓存
  };

  static async getSettings(): Promise<UserSettings> {
    // 检查缓存是否有效
    if (this.cache.settings && (Date.now() - this.cache.timestamp) < this.cache.ttl) {
      return this.cache.settings;
    }

    try {
      const browserAPI = (globalThis as any).browser || browser;

      // 首先尝试新格式（'settings' 对象）
      const newFormatResult = await browserAPI.storage.sync.get('settings');
      const newFormatSettings = newFormatResult.settings || {};

      if (Object.keys(newFormatSettings).length > 0) {
        const mergedSettings: UserSettings = {
          ...DEFAULT_SETTINGS,
          ...newFormatSettings,
        };

        // 更新缓存
        this.updateCache(mergedSettings);
        return mergedSettings;
      } else {
        // 回退到旧格式
        return this.getSettingsLegacyFormat(browserAPI);
      }
    } catch (error) {
      logger.error("获取设置失败:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  static onSettingsChanged(callback: (settings: UserSettings) => void): () => void {
    const listener = (changes: any) => {
      if (changes.settings) {
        this.clearCache();
        this.getSettings().then(callback);
      }
    };

    const browserAPI = (globalThis as any).browser || browser;
    browserAPI.storage.onChanged.addListener(listener);

    return () => {
      browserAPI.storage.onChanged.removeListener(listener);
    };
  }
}
```

### 3. 日志系统 (logger/index.ts)

**自研实现，不依赖 `debug` 包**（旧版本的模块文档曾描述一套基于 `debug` 的实现，那份实现已被替换，
其示例代码已删除）。

**特点**：
- 命名空间 + emoji 前缀的实例化日志器
- 按级别条件输出（`shouldLog` / `shouldLogAtLevel`）
- 自动脱敏：`apiKey` / `authorization` / `token` / `cookie` / `password` / `secret` / `selectionContext` 字段，
  以及 `Bearer xxx` 形式的凭证
- 诊断会话期间记录分批落盘

**核心接口**：
```typescript
export class Logger {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  success(...args: unknown[]): void;
  trace(...args: unknown[]): void;
}

export function createLogger(
  namespace: string,
  emoji?: string,   // 默认 "🔧"
  prefix?: string   // 默认取 DEBUG_NAMESPACE_PREFIX
): Logger;

export async function initializeLogger(context?: LoggerContext): Promise<void>;

export function shouldLog(logType: LoggerMethod): boolean;
export function shouldLogAtLevel(level: LogLevel, logType: LoggerMethod): boolean;
```

**预置实例**（各模块优先复用，不要自行命名）：

```typescript
export const backgroundLogger  = createLogger("background", "🔙");
export const contentLogger     = createLogger("content", "📄");
export const popupLogger       = createLogger("popup", "🔽");
export const optionsLogger     = createLogger("options", "⚙️");
export const translationLogger = createLogger("translation", "🌐");
export const messageLogger     = createLogger("message", "📨");
export const settingsLogger    = createLogger("settings", "⚙️");
```

**诊断批次**：待写日志最多缓存 `MAX_PENDING_LOGS = 100` 条，按 `DIAGNOSTIC_BATCH_DELAY_MS = 200`
合并写入，避免每条日志一次 storage 往返。

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）当前零错误
- **ESLint**: ⚠️ **项目未配置 ESLint**，没有任何 lint 闸门
- **调试工具**: 自研 logger（见上），**非 `debug` 包**

### 测试覆盖
- ✅ 设置缓存测试
- ✅ 日志级别测试
- ✅ 存储兼容性测试
- ✅ 常量类型测试
- ❌ 性能测试（待添加）

## 常见问题 (FAQ)

### Q: 设置缓存是如何工作的？
A: 使用内存缓存，TTL 为 5 分钟，避免频繁的存储访问，提高性能。

### Q: 如何添加新的消息类型？
A: 在 constants/index.ts 的 MESSAGE_TYPES 对象中添加新的类型，并确保所有模块都更新。

### Q: 日志系统如何适配不同环境？
A: 由 `initializeLogger(context)` 显式声明所在上下文（background / content / popup / options），
诊断记录的落盘路径按上下文区分。**没有** localStorage 探测与降级分支。

### Q: 设置的新旧格式如何兼容？
A: 优先尝试新格式（settings 对象），如果不存在则回退到旧格式（直接键值对）。

## 相关文件清单

### 核心文件
- `constants/index.ts` - 常量定义
- `settingsUtils.ts` - 设置工具
- `logger/index.ts` - 日志系统

## 变更记录 (Changelog)

### 2026-09-10 - 文档纠错
- 🔧 删除整段基于 `debug` 包的虚构 Logger 实现，替换为真实接口（含 `prefix` 参数与预置实例）
- 🔧 修正 `createLogger` / `initializeLogger` 签名
- 🔧 移除不存在的 `debug` 外部依赖与 ESLint 质量声明
- 🔧 澄清 `storage.sync` 只同步非敏感设置，`apiKey` 仅存 `storage.local`
- 📌 本模块测试覆盖确实较高：`requestTimeout` 100%、`webReadingState` 97.9%、
  `dataBackup` 97.2%、`settingsUtils` 96.9%、`errors` 100%

### 2025-09-24 05:32 - 模块文档初始化
- ⚠️ 初版「覆盖率 100% (3/3 文件)」「缺口：无」与实际不符，已于 2026-09-10 移除