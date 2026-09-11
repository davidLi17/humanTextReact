[根目录](../../CLAUDE.md) > [entrypoints](../) > **shared**

# Shared 模块 - 共享工具层

## 模块职责

Shared 模块是人话翻译器的共享工具层，提供跨模块的常量定义、设置管理、日志系统等核心功能。该模块被所有其他模块依赖，确保整个应用的一致性和可维护性。

**核心职责**：
- 📋 全局常量和类型定义
- ⚙️ 统一的设置管理
- 📝 专业的日志系统
- 🔄 模块间通信协议（聊天/请求身份/网页通读）
- 🎯 工具函数和辅助方法

## 模块结构

### 子模块组成
本目录（`entrypoints/shared/`）除本文档外共 28 个条目 = 26 个 `.ts` / `.tsx` 文件 + `constants/`、
`logger/` 两个子目录，按职责大致分为：

- **constants/** - 常量定义（`constants/index.ts` 单文件）
- **logger/** - 日志系统（`index.ts` + `diagnostics.ts` + `types.ts`）
- **settingsUtils.ts** - 设置读写、权威源仲裁与旧格式迁移
- **chatTypes.ts** / `chatEditRetry.ts` / `chatExport.ts` - 会话与消息模型、编辑重试、导出
- **webReadingPrompt.ts** / `webReadingState.ts` / `webReadingOverview.ts` - 网页通读 Prompt、进度状态机、全文总览
- **requestProtocol.ts** / `requestTimeout.ts` - 请求身份（`TranslationTarget` / `createRequestId`）与超时守卫
- **errors.ts** - 统一错误模型（`CodedError` / `ErrorCode`）
- **selectionContext.ts** / `sidepanelUtils.ts` / `fontScale.ts` - 选词上下文、侧边栏工具、字号
- **jargon*.ts** / `prism*.ts` - 生词本（黑话库）与棱镜模式
- **`quoteFollowup.ts`**、`theme.ts`、`dataBackup.ts`、`sessionExport.ts`、
  `FontScaleControl.tsx`、`useFontScale.ts` 等

## 对外接口

### 常量导出
```typescript
// 消息类型（节选，完整见源码）
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",
  CLEANUP: "cleanup",
  GET_HISTORY: "getHistory",
  OPEN_SIDEPANEL: "openSidepanel",
  EXTRACT_PAGE_CONTENT: "extractPageContent",
  READ_PAGE_IN_SIDEPANEL: "readPageInSidepanel",
  READ_WEB_PAGE: "readWebPage",
  APPEND_DIAGNOSTIC_LOGS: "appendDiagnosticLogs",
  // ... 另有 history / jargon / diagnostic 等，实际共 27 个键
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// 日志级别
export const LOG_LEVELS = {
  OFF: "off",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// 主题模式
export const THEME_MODES = { SYSTEM: "system", LIGHT: "light", DARK: "dark" } as const;

// 默认设置（promptTemplate 为多行长文本，此处省略正文）
export const DEFAULT_SETTINGS = {
  baseUrl: "https://api.deepseek.com/v1/chat/completions",
  model: "deepseek-flash",
  temperature: 0.7,
  promptTemplate: `始终使用中文。…（多行，见源码）`,
  apiKey: "your_api_key",
  thinkingEnabled: false,
  showSelectionToolbar: true,
  contextualSelectionEnabled: false,
  prismModeEnabled: false,
  logLevel: LOG_LEVELS.OFF as LogLevel,
  theme: THEME_MODES.SYSTEM as ThemeMode,
  fontScalePercent: DEFAULT_FONT_SCALE_PERCENT,
} as const;

// 其他：THINKING_CONFIG、IMAGE_CONFIG、MAX_HISTORY_COUNT = 142
```

> `promptTemplate` 会被**原样**作为 system message 发送，源码中**没有任何占位符替换逻辑**
> （`constants/index.ts:73-75` 的注释明确说明），用户正文走独立的 user message。

### 设置管理接口
```typescript
export class SettingsUtils {
  static async getSettings(): Promise<UserSettings>
  static async getSetting<K extends keyof UserSettings>(key: K): Promise<UserSettings[K]>
  static async setSettings(newSettings: Partial<UserSettings>): Promise<void>
  static async setSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void>
  static async setFontScalePercent(value: unknown): Promise<void>
  static async hasApiKey(): Promise<boolean>
  static isApiKeyConfigured(apiKey?: string): boolean
  static async getThinkingEnabled(): Promise<boolean>
  static async getShowSelectionToolbar(): Promise<boolean>
  static clearCache(): void
  static onSettingsChanged(callback: (settings: UserSettings) => void): () => void
}

// 便捷函数
export const getThinkingEnabled: () => Promise<boolean>
export const getShowSelectionToolbar: () => Promise<boolean>
export const getUserSettings: () => Promise<UserSettings>
```

### 日志系统接口
```typescript
export class Logger {
  log(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  success(...args: unknown[]): void
  trace(...args: unknown[]): void
  getNamespace(): string
  getFullNamespace(): string
  child(childNamespace: string, childEmoji?: string): Logger
  updateConfig(emoji?: string, prefix?: string): void
}

export function createLogger(namespace: string, emoji?: string, prefix?: string): Logger
export function initializeLogger(context?: LoggerContext): Promise<void>
export function shouldLog(logType: LoggerMethod): boolean
export function shouldLogAtLevel(level: LogLevel, logType: LoggerMethod): boolean
```

### 聊天与网页通读接口
```typescript
// chatTypes.ts
export function formatMessageForPayload(message: {...}): ChatPayloadMessage
export function buildHistoryPayload(messages: [...], currentMessage?): ChatPayloadMessage[]

// webReadingPrompt.ts
export function buildWebReadingUserPrompt(page: WebPageMetadata): string
export function buildAttachedPageContextPrompt(page: WebPageMetadata): string
export function buildWebReadingContinuationPrompt(params: {...}): string
export function getWebReadingSegmentCount(totalChars: number): number
export function extractSuggestedQuestions(markdownText: string): string[]
export function describeWebReadFailure(kind, detail?, stage?): string

// webReadingState.ts
export function createWebReadingPageMeta(page, options): WebReadingPageMeta
export function buildReplayableWebReadingPrompt(message, userInstruction?): ReplayableWebReadingPromptResult
export function buildWebReadingHistoryPayload(messages, currentMessage?): ChatPayloadMessage[]
export function hydrateWebReadingProgress(rawStore, sessions, now?, prioritySessionId?): HydratedWebReadingProgress
export function serializeWebReadingProgressMap(progressMap, prioritySessionId?): SerializedWebReadingProgress
```

## 关键依赖与配置

### 外部依赖
- **Chrome Extension API**: storage（`sync` / `local` / `session`）
- **lodash-es**: `defaults` 用于设置合并

### 内部依赖
- 只依赖 `entrypoints/shared` 内部模块（`constants`、`logger`、`fontScale`、`errors` 等），
  **不引用任何 UI 入口**。根级 `shared/utils/markdown.ts` 由 popup / content / sidepanel
  等入口直接引用，不经过本模块

## 数据模型

### 用户设置接口
```typescript
export interface UserSettings {
  baseUrl: string;                    // API 地址
  model: string;                      // 模型 ID
  temperature: number;                // 温度参数
  promptTemplate: string;             // 提示词模板（原样发送，无占位符替换）
  apiKey: string;                     // API 密钥（仅存 storage.local）
  thinkingEnabled: boolean;           // 思维链开关
  showSelectionToolbar: boolean;      // 选词快捷操作条
  contextualSelectionEnabled: boolean;// 选词上下文
  prismModeEnabled: boolean;          // 棱镜模式
  logLevel: LogLevel;                 // 日志级别
  theme: ThemeMode;                   // 主题模式
  fontScalePercent: number;           // 界面字号百分比
}
```

> **没有** `SettingsCache` 接口/字段：设置模块当前不维护内存缓存（见下文「设置管理工具」）。

### 翻译请求接口
```typescript
export interface TranslationRequest {
  action: MessageType;
  requestId?: string;
  text?: string;
  content?: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  done?: boolean;
  error?: string;
  selectionContext?: SelectionContext;
  deferTranslation?: boolean;
  expectedSelectedText?: string;
  includeSelectionContext?: boolean;
  /** 本次结果由本地生词本直接提供。 */
  resultSource?: TranslationResultSource;
  /** 明确要求跳过生词本命中并重新调用模型。 */
  bypassJargonVault?: boolean;
}
```

### 聊天消息接口（节选）
```typescript
export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  images?: ChatImageContent[];
  selectionContext?: SelectionContext;
  pageMeta?: {
    title: string;
    url: string;
    wordCount?: number;
    excerpt?: string;
    isWebPageReading?: boolean;
    /**
     * 该卡片只把正文作为上下文附加，不要求模型产出速读报告。
     * 缺省（含所有历史数据）表示它属于一次真实通读，重放时仍走速读报告 Prompt。
     */
    contextOnly?: boolean;
    sourceContent?: string;      // 可重放的原文片段，最多一段
    segmentIndex?: number;       // 从 1 开始
    totalSegments?: number;
    userInstruction?: string;    // 用户补充指令，与原文分开存储
    readingRunId?: string;       // 同 URL 多次阅读的身份
  };
  overviewMeta?: WebReadingOverviewMeta;
  suggestedQuestions?: string[];
  createdAt: number;
  status?: "pending" | "streaming" | "completed" | "error";
  errorMessage?: string;
  resultSource?: TranslationResultSource;
}
```

### 错误码
```typescript
export type ErrorCode =
  | "AUTH"        // 401/402/403
  | "NOT_FOUND"   // 404
  | "RATE_LIMIT"  // 429
  | "NETWORK"
  | "SERVER"
  | "ABORT"
  | "TIMEOUT"
  | "TRUNCATED"   // 模型输出达到长度上限
  | "INTERRUPTED" // 流式响应在收到终止标记前中断
  | "UNKNOWN";
```

## 核心功能实现

### 1. 常量管理 (constants/index.ts)
**特点**：
- 集中化常量定义
- 类型安全的枚举（`MessageType` / `LogLevel` / `ThemeMode` 均从 `as const` 对象派生）
- 模块间一致性

**核心功能**：
```typescript
// 消息类型常量（实际共 27 个键，此处为节选）
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",
  CLEANUP: "cleanup",
  GET_HISTORY: "getHistory",
  CLEAR_HISTORY: "clearHistory",
  DELETE_HISTORY_ITEM: "deleteHistoryItem",
  IMPORT_HISTORY: "importHistory",
  UPDATE_TRANSLATION: "updateTranslation",              // 保留用于兼容
  UPDATE_CONTENT_TRANSLATION: "updateContentTranslation",
  UPDATE_POPUP_TRANSLATION: "updatePopupTranslation",
  UPDATE_SIDEPANEL_TRANSLATION: "updateSidepanelTranslation",
  OPEN_SIDEPANEL: "openSidepanel",
  TOGGLE_SIDEPANEL: "toggleSidepanel",
  EXTRACT_PAGE_CONTENT: "extractPageContent",
  READ_PAGE_IN_SIDEPANEL: "readPageInSidepanel",
  READ_WEB_PAGE: "readWebPage",
  // ... jargon / diagnostic / popup 相关
} as const;

// 日志级别定义
export const LOG_LEVELS = {
  OFF: "off",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// 默认设置（promptTemplate 为多行长文本，正文略）
export const DEFAULT_SETTINGS = {
  baseUrl: "https://api.deepseek.com/v1/chat/completions",
  model: "deepseek-flash",
  temperature: 0.7,
  promptTemplate: `始终使用中文。

你的任务是把复杂、专业、抽象、晦涩的信息讲成人能快速理解的话。…（多行，见源码）`,
  apiKey: "your_api_key",
  thinkingEnabled: false,
  showSelectionToolbar: true,
  contextualSelectionEnabled: false,
  prismModeEnabled: false,
  logLevel: LOG_LEVELS.OFF as LogLevel,
  theme: THEME_MODES.SYSTEM as ThemeMode,
  fontScalePercent: DEFAULT_FONT_SCALE_PERCENT,
} as const;
```

### 2. 设置管理工具 (settingsUtils.ts)
**特点**：
- **不做内存缓存**：`clearCache()` 是空实现（`settingsUtils.ts:71`，注释原文为「当前实现每次都直接
  读取 storage，保留该方法用于兼容调用方」），每次 `getSettings()` 都真的读写 storage
- 双格式兼容：新格式为 `settings` 对象，旧格式为按 `DEFAULT_SETTINGS` 键逐个平铺存储
- **权威源按 `updatedAt` 时间戳仲裁**：`storage.local` 与 `storage.sync` 并发读取（`Promise.allSettled`），
  sync 时间戳更新时采用云端偏好，但 **`apiKey` 恒以本机 local 为准**
- **`apiKey` 仅存 `storage.local`**：写入 sync 前 `delete syncSettings.apiKey`，
  并调用 `storage.sync.remove("apiKey")` 清理遗留的顶层敏感字段
- `fontScalePercent` 单独存独立键（local 为读取主源，成功后再同步到 sync）
- `onSettingsChanged` 监听 `settings` / `fontScalePercent` / `apiKey` 三类变化，返回取消函数；
  若运行环境缺少 `storage.onChanged`，返回空函数而非抛错

**核心功能**（简化示意，实际实现见源码）：
```typescript
export class SettingsUtils {
  static clearCache(): void {}   // 空实现：当前不做缓存

  static async getSettings(): Promise<UserSettings> {
    const [syncResult, localResult] = await Promise.allSettled([
      browserAPI.storage.sync.get("settings"),
      browserAPI.storage.local.get("settings"),
    ]);
    // ... 解析两路结果；若 localSettings 缺 apiKey，再从 local 顶层 "apiKey" 兜底读取
    if (hasLocal && hasSync) {
      const syncUpdated = Number(syncSettings?.updatedAt) || 0;
      const localUpdated = Number(localSettings?.updatedAt) || 0;
      resolved = syncUpdated > localUpdated
        ? defaults({}, localSettings?.apiKey ? { apiKey: localSettings.apiKey } : {},
                   syncSettings, localSettings, DEFAULT_SETTINGS)
        : defaults({}, localSettings, syncSettings, DEFAULT_SETTINGS);
    } else if (hasLocal) {
      resolved = defaults({}, localSettings, DEFAULT_SETTINGS);
    } else {
      resolved = defaults({}, syncSettings, DEFAULT_SETTINGS);
    }
    return this.withStoredFontScale(browserAPI, normalizeSettings(resolved));
    // 两路都为空时回退 this.getSettingsLegacyFormat(browserAPI)
  }

  static async setSettings(newSettings: Partial<UserSettings>): Promise<void> {
    const merged = defaults({}, newSettings, existing, DEFAULT_SETTINGS);
    merged.updatedAt = Date.now();
    const syncSettings = { ...merged };
    delete syncSettings.apiKey;            // 密钥绝不上云
    await Promise.allSettled([
      (async () => {
        await browserAPI.storage.sync.set({ settings: syncSettings });
        await browserAPI.storage.sync.remove("apiKey");  // 清理历史遗留
      })(),
      browserAPI.storage.local.set({ settings: merged }),
    ]);
    // 任一成功即视为保存成功；仅两路都失败才抛错
  }

  static onSettingsChanged(callback: (settings: UserSettings) => void): () => void {
    const onChanged = browserAPI.storage?.onChanged;
    if (!onChanged?.addListener || !onChanged?.removeListener) return () => {};
    const listener = (changes: any) => {
      if (changes.settings || changes[FONT_SCALE_STORAGE_KEY] || changes.apiKey) {
        void this.getSettings().then((settings) => { if (active) callback(settings); });
      }
    };
    onChanged.addListener(listener);
    return () => { active = false; onChanged.removeListener(listener); };
  }
}
```

> `isApiKeyConfigured(apiKey)` 的判定是「非空且不等于 `DEFAULT_SETTINGS.apiKey`」，
> 即默认占位值 `"your_api_key"` 视为未配置。

### 3. 日志系统 (logger/index.ts)

**自研实现，不依赖 `debug` 包**（旧版本的模块文档曾描述一套基于 `debug` 的实现，那份实现已被替换，
其示例代码已删除）。

**特点**：
- 命名空间 + emoji 前缀的实例化日志器；默认前缀取 `globalThis.DEBUG_NAMESPACE_PREFIX`，回退 `"human-text"`
- 按级别条件输出（`shouldLog` / `shouldLogAtLevel`）
- 初始化前的日志先入内存队列（上限 `MAX_PENDING_LOGS = 100`，超出丢弃最旧的），
  `initializeLogger()` 完成后统一补发
- 自动脱敏：`apiKey` / `authorization` / `token` / `cookie` / `password` / `secret` / `selectionContext`
  字段整体替换为 `[REDACTED]`；`selectionText` / `paragraph` / `textPreview` / `promptTemplate` /
  `reasoningContent` / `imageData` / `base64` 等私密文本降级为长度摘要；`url` 字段降级为 `协议//主机`；
  字符串中的 `Bearer xxx` 与 `api_key: xxx` 也会被替换
- 诊断会话期间记录分批落盘

**核心接口**：
```typescript
export class Logger {
  constructor(namespace: string, emoji = "🔧", prefix?: string)
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

export async function initializeLogger(
  context: LoggerContext = detectLoggerContext()
): Promise<void>;

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

**缓冲与批次**：
- `MAX_PENDING_LOGS = 100`：**初始化完成前**的日志进入内存队列，超过上限丢弃最旧的，
  `initializeLogger()` 结束后统一补发
- `DIAGNOSTIC_BATCH_DELAY_MS = 200`：诊断会话期间的记录按 200ms 合并落盘，
  避免每条日志一次 storage 往返；`error` 级记录立即 flush

**诊断会话**（`logger/diagnostics.ts`）：
- 会话时长 `DIAGNOSTIC_DURATION_MS = 30 * 60 * 1000`（30 分钟）
- 记录写入 `storage.session`，上限 `MAX_DIAGNOSTIC_RECORDS = 500` 条 / `MAX_DIAGNOSTIC_BYTES = 512 KB`
- `LoggerContext` 类型含 `background | content | popup | options | sidepanel` **五个**值，
  但落盘校验用的 `LOGGER_CONTEXTS` 允许列表只有前四个，**sidepanel 上下文的诊断记录会被丢弃**

### 4. 聊天协议 (chatTypes.ts)
**特点**：
- `ChatMessage` 统一承载文本、图片、选词上下文与网页元信息
- `formatMessageForPayload` 把带图消息组装成多模态 `image_url` + `text` 数组
- `buildHistoryPayload(messages, currentMessage?)` 支持在历史末尾追加一条当前消息

### 5. 网页通读 (webReadingPrompt.ts / webReadingState.ts)
**`webReadingPrompt.ts`**：
- `MAX_PAGE_CONTENT_CHARS = 16000`（单段上限）、`MIN_PAGE_CONTENT_CHARS = 15`（有效正文下限）、
  `WEB_READING_EXTRACT_TIMEOUT_MS = 10000`
- `buildWebReadingUserPrompt(page)`：要求模型按四个板块产出速读报告
- `buildAttachedPageContextPrompt(page)`：**新增**。中性背景 Prompt，只声明正文已挂载为上下文，
  不要求产出速读报告——避免后续追问时把模型带向通读报告
- 内部抽出 `truncatePageContent(content)` 与 `buildPageHeaderInfo(page, isTruncated, truncatedNote)`；
  后者先 `trim` 再兜底标题，修掉了「纯空白标题因 `||` 先短路而产出空标题」的问题

**`webReadingState.ts`**：
- `createWebReadingPageMeta(page, { segmentIndex, totalSegments, contextOnly?, ... })`：`contextOnly`
  为真时写入 `contextOnly: true`，否则该字段为 `undefined`（历史数据缺省即「真实通读」）
- `buildReplayableWebReadingPrompt(message, userInstruction?)`：`contextOnly` 走
  `buildAttachedPageContextPrompt`；`segmentIndex > 1` 走续读 Prompt；否则走速读 Prompt
- `buildWebReadingHistoryPayload(messages, currentMessage?)`：正常发送路径用它还原网页正文，
  第二参数 `currentMessage` 透传给 `buildHistoryPayload`
- 进度常量：`WEB_READING_MAX_SINGLE_CONTENT_CHARS = 1_000_000`、
  `WEB_READING_MAX_TOTAL_CONTENT_CHARS = 2_000_000`、`WEB_READING_MAX_PERSISTED_ENTRIES = 10`
- 断点恢复：`hydrateWebReadingProgress` 丢弃无效/孤儿/身份不匹配/超容量记录，
  并把遗留的 `pending` / `streaming` 助手消息改成可重试的 `error` 态（**不自动抓网页、不自动重发请求**）

### 6. 统一错误模型 (errors.ts)
**特点**：
- `CodedError(message, code = "UNKNOWN", userMessage?, detail?)` 携带 `ErrorCode`，
  取代字符串 `includes` 反查错误来源
- `describeApiStatus(status)`：401/402/403 → `AUTH`，404 → `NOT_FOUND`，429 → `RATE_LIMIT`，
  其余返回 `null` 由调用方按通用 HTTP 错误处理
- `ERROR_CODE_MESSAGES` 提供各错误码的用户可读文案；`SERVER` / `TIMEOUT` / `UNKNOWN` 留空，
  直接透出原始 message（已含状态码与服务商原因）
- `resolveUserErrorMessage(error)` 统一把错误转成展示文案，并对非 `CodedError` 的旧式错误
  保留字符串兜底（`API Key` / `Failed to fetch` / `rate limit`）
- `TRUNCATED`（长度上限截断）与 `INTERRUPTED`（流式未收到终止标记即中断）由
  `entrypoints/background/translationService.ts:565-571` 在流式异常终止时抛出

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）当前零错误
- **ESLint / Prettier**: ⚠️ **项目未配置**（仓库内无 eslint / prettier / biome 配置文件），没有任何 lint 闸门
- **测试**: `bun run test`，本次核对为 **344 用例 / 31 文件全绿**
- **调试工具**: 自研 logger（见上），**非 `debug` 包**

### 本目录相关测试文件（存在性已核对）
- `tests/unit/codedError.test.js`（错误模型）
- `tests/unit/webReadingPrompt.test.js`、`tests/unit/webReadingState.test.js`、`tests/unit/webReadingOverview.test.js`
- `tests/unit/fontScale.test.js`
- `tests/integration/settingsUtils.test.js`、`tests/integration/loggerDiagnostics.test.js`、
  `tests/integration/requestTimeout.test.js`、`tests/integration/dataBackup.test.js`、
  `tests/integration/webReadingProgressStorage.test.js`、`tests/integration/sidepanelUtils.test.js`、
  `tests/integration/selectionContext.test.js`
- ⚠️ 本文档**不承诺具体覆盖率数字**：仓库中的 `coverage/lcov.info` 未在本次核对中重新生成

## 常见问题 (FAQ)

### Q: 设置缓存是如何工作的？
A: **没有缓存**。`SettingsUtils.clearCache()` 是空实现，`getSettings()` 每次都会实际读写
`storage.sync` 与 `storage.local`（`settingsUtils.ts:71` 有对应注释）。
（旧版文档曾描述「内存缓存 TTL 5 分钟」及配套的 `SettingsCache`，源码中不存在，已删除。）

### Q: 如何添加新的消息类型？
A: 在 `constants/index.ts` 的 `MESSAGE_TYPES` 对象中添加新的类型，并确保所有模块都更新。

### Q: 日志系统如何适配不同环境？
A: 由 `initializeLogger(context)` 显式声明所在上下文；未传参时 `detectLoggerContext()` 会按
`document` / `location.protocol` / `location.pathname` 推断（含 `sidepanel`）。
**没有** localStorage 探测与降级分支。
注意 `logger/diagnostics.ts` 的 `LOGGER_CONTEXTS` 白名单目前只有四个上下文（不含 sidepanel）。

### Q: 设置的新旧格式如何兼容？
A: 优先尝试新格式（`settings` 对象），两路都为空时回退到旧格式
（`getSettingsLegacyFormat` 按 `Object.keys(DEFAULT_SETTINGS)` 逐个键读取）。

### Q: 提示词模板里能写 `{text}` 占位符吗？
A: **不能**。模板原样作为 system message 发送，没有任何替换逻辑（`constants/index.ts:73-75`），
写了占位符会作为字面量发给模型。

## 相关文件清单

### 核心文件
- `constants/index.ts` - 常量定义（消息类型、默认设置、日志级别、主题）
- `settingsUtils.ts` - 设置读写、权威源仲裁、密钥隔离
- `logger/index.ts`、`logger/diagnostics.ts`、`logger/types.ts` - 日志系统与诊断会话
- `errors.ts` - `CodedError` 与错误码映射
- `chatTypes.ts` - `ChatMessage` / `ChatSession` / payload 组装
- `webReadingPrompt.ts`、`webReadingState.ts`、`webReadingOverview.ts` - 网页通读
- `requestProtocol.ts`、`requestTimeout.ts` - 请求身份与超时守卫
- `sidepanelUtils.ts`、`selectionContext.ts`、`fontScale.ts` - 工具与上下文

## 变更记录 (Changelog)

### 2026-09-11 - 对齐源码（网页正文附加 / 设置与错误模型纠错）
- 🔧 **删除虚构的设置缓存**：源码中不存在 `SettingsCache` 接口与 TTL 缓存，`clearCache()` 是空实现；
  原文那段「缓存 5 分钟 + 只读 `storage.sync`」的 `getSettings` 示例与真实实现完全不符，已替换为
  真实逻辑（`Promise.allSettled` 双路读取 + `updatedAt` 时间戳仲裁 + `apiKey` 恒以 local 为准）
- 🔧 `SettingsUtils` 接口补齐 `setSettings` / `setSetting` / `setFontScalePercent` /
  `isApiKeyConfigured` / `getThinkingEnabled` / `getShowSelectionToolbar`
- 🔧 `UserSettings` 补齐 `showSelectionToolbar` / `contextualSelectionEnabled` /
  `prismModeEnabled` / `theme` / `fontScalePercent`，`logLevel` 改为 `LogLevel`
- 🔧 `TranslationRequest` 补齐 `requestId` / `selectionContext` / `deferTranslation` /
  `expectedSelectedText` / `includeSelectionContext` / `resultSource` / `bypassJargonVault`
- ➕ 新增「聊天协议」「网页通读」「统一错误模型」三节；记录 `ChatMessage.pageMeta.contextOnly`
  判别位、`buildAttachedPageContextPrompt`、`buildReplayableWebReadingPrompt` 的中性重放分支、
  `buildWebReadingHistoryPayload` 的可选第二参数
- ➕ 错误码补入 `TRUNCATED` / `INTERRUPTED`
- 🔧 `DEFAULT_SETTINGS` 示例：`promptTemplate` 更正为多行模板（原写作 `"System Prompt..."`），
  并说明**无占位符替换逻辑**；补上 `showSelectionToolbar` 等真实字段
- 🔧 `Logger` 方法签名由 `any[]` 更正为 `unknown[]`，补齐 `child` / `updateConfig` / `getNamespace`
- 🔧 澄清日志上下文白名单只有四个（`LoggerContext` 含 sidepanel 但不会落盘）
- 🔧 移除无依据的覆盖率百分比结论，改为列出真实存在的测试文件，并声明「不承诺覆盖率数字」
- 📌 本次核对：`bun test` **344 用例 / 31 文件全绿**；仓库内无 ESLint / Prettier / Biome 配置文件

### 2026-09-10 - 文档纠错
- 🔧 删除整段基于 `debug` 包的虚构 Logger 实现，替换为真实接口（含 `prefix` 参数与预置实例）
- 🔧 修正 `createLogger` / `initializeLogger` 签名
- 🔧 移除不存在的 `debug` 外部依赖与 ESLint 质量声明
- 🔧 澄清 `storage.sync` 只同步非敏感设置，`apiKey` 仅存 `storage.local`
- ⚠️ 该条目曾附带「requestTimeout 100%、webReadingState 97.9%」等覆盖率数字，
  这些数字无法从源码复核，已于 2026-09-11 移除

### 2025-09-24 05:32 - 模块文档初始化
- ⚠️ 初版「覆盖率 100% (3/3 文件)」「缺口：无」与实际不符，已于 2026-09-10 移除
