[根目录](../../CLAUDE.md) > [entrypoints](../) > **background**

# Background 模块 - 核心服务层

## 模块职责

Background 模块是人话翻译器的核心服务层，负责处理所有翻译相关的业务逻辑、API 请求、消息路由和生命周期管理。该模块在扩展的后台运行，作为各个组件之间的协调中心。

**核心职责**：
- 🌐 翻译服务的核心逻辑处理
- 📨 消息路由和通信管理
- 🗄️ 历史记录的存储和检索
- ⚙️ 用户设置的统一管理
- 🖱️ 右键菜单和快捷键的管理
- 🔄 请求生命周期管理

## 入口与启动

### 主入口文件
- **文件**: `index.ts`
- **启动方式**: `defineBackground()` (WXT 框架)
- **生命周期**: 扩展安装时自动启动，常驻后台

### 初始化流程
```typescript
// 1. 日志系统初始化
initializeLogger();

// 2. 扩展安装监听
browser.runtime.onInstalled.addListener(() => {
  ShortcutManager.saveCurrentShortcut();
  ContextMenuManager.createContextMenu();
});

// 3. 消息监听器注册
browser.runtime.onMessage.addListener(MessageHandler.handleRuntimeMessage);

// 4. 右键菜单监听
browser.contextMenus.onClicked.addListener(ContextMenuHandler.handleContextMenuClick);

// 5. 快捷键监听
browser.commands.onCommand.addListener(ShortcutManager.executeTranslation);
```

## 对外接口

### 消息类型 (MESSAGE_TYPES)
```typescript
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",                    // 翻译请求
  CLEANUP: "cleanup",                        // 清理请求
  GET_HISTORY: "getHistory",                // 获取历史
  CLEAR_HISTORY: "clearHistory",            // 清空历史
  DELETE_HISTORY_ITEM: "deleteHistoryItem", // 删除历史项
  IMPORT_HISTORY: "importHistory",          // 导入历史
  UPDATE_CONTENT_TRANSLATION: "updateContentTranslation", // Content弹窗更新
  UPDATE_POPUP_TRANSLATION: "updatePopupTranslation",     // Popup页面更新
  SHOW_TRANSLATION_POPUP: "showTranslationPopup",         // 显示弹窗
  GET_SELECTED_TEXT: "getSelectedText",                  // 获取选中文本
} as const;
```

### 主要服务类
1. **TranslationService** - 翻译核心服务
2. **ApiService** - API 连接测试
3. **HistoryManager** - 历史记录管理
4. **ContextMenuManager** - 右键菜单管理
5. **ShortcutManager** - 快捷键管理
6. **MessageHandler** - 消息处理
7. **RequestManager** - 请求管理

## 关键依赖与配置

### 内部依赖
- **设置管理**: `SettingsUtils` (shared/settingsUtils.ts)
- **日志系统**: `Logger` (shared/logger/index.ts)
- **常量定义**: `Constants` (shared/constants/index.ts)

### 外部依赖
- **Chrome Extension API**: runtime, contextMenus, commands, storage, tabs
- **WXT 框架**: defineBackground, defineContentScript

### 配置项
```typescript
export const DEFAULT_SETTINGS = {
  baseUrl: "https://api.deepseek.com/v1/chat/completions",
  model: "deepseek-flash",
  temperature: 0.7,
  promptTemplate: "System Prompt...",
  apiKey: "your_api_key",
  thinkingEnabled: false,
  logLevel: LOG_LEVELS.OFF,
};
```

## 数据模型

### 翻译请求接口
```typescript
interface TranslationParams {
  text: string;                    // 待翻译文本
  images?: ImageContent[];         // 图片内容（可选）
  thinkingEnabled?: boolean;       // 是否启用思维链
  tabId?: number;                 // 标签页ID
}
```

### 图片内容接口
```typescript
interface ImageContent {
  data: string;                   // base64编码
  mimeType: string;               // MIME类型
  fileName?: string;              // 文件名（可选）
}
```

### 历史记录接口
```typescript
interface HistoryItem {
  original: string;               // 原始文本
  translated: string;            // 翻译结果
  reasoning?: string;            // 推理过程（可选）
  hasReasoning?: boolean;        // 是否有推理过程
  timestamp: number;             // 时间戳
}
```

## 核心功能实现

### 1. 翻译服务 (TranslationService)
**特点**：
- 支持流式响应实时更新
- 多模态翻译（文本+图片）
- 智能错误处理和重试
- 自动保存翻译历史
- 请求生命周期管理

**关键方法**：
```typescript
static async translateText(params: TranslationParams | string, tabId?: number)
```

### 2. API 服务 (ApiService)
**特点**：
- API 连接健康检查
- 详细的错误信息反馈
- 支持多种 API 提供商
- 超时和网络异常处理

**关键方法**：
```typescript
static async testApiConnection(apiKey: string, baseUrl: string, model: string)
```

### 3. 历史管理 (HistoryManager)
**特点**：
- 最多保存142条历史记录
- 支持历史记录搜索
- 数据导入/导出功能
- 自动清理过期记录

**关键方法**：
```typescript
static async saveTranslationHistory(original: string, translated: string, reasoning?: string)
static async getHistory(searchTerm?: string): Promise<HistoryItem[]>
```

### 4. 消息处理 (MessageHandler)
**特点**：
- 统一的消息路由中心
- 支持同步和异步消息处理
- 完善的错误处理机制
- 消息类型验证

**关键方法**：
```typescript
static handleRuntimeMessage(request: any, sender: any, sendResponse: (response?: any) => void)
```

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）当前零错误
- **ESLint**: ⚠️ **项目未配置 ESLint**，没有任何 lint 闸门
- **调试日志**: 自研 logger（`shared/logger`），支持 30 分钟诊断会话
- **错误模型**: `shared/errors.ts` 的 `CodedError` + 错误码映射

### 测试覆盖
- ✅ `RequestManager` 生命周期（`tests/unit/requestManager.test.js`）
- ✅ `TranslationService` 鉴权头与流式超时（`tests/integration/translationServiceAuth.test.js`、`requestTimeout.test.js`）
- ✅ 快捷键双通道保活（`tests/integration/shortcutFix.test.js`）
- ⚠️ `historyManager` / `messageHandler` 无直接测试，仅经集成路径间接覆盖
- ⚠️ 本模块**没有**「单元测试待添加」的情况：`tests/unit/` 已有 12 个文件

## 常见问题 (FAQ)

### Q: 翻译请求失败如何处理？
A: TranslationService 按错误类型分支处理，**没有任何自动重试逻辑**：
- 超时（`CodedError.code === "TIMEOUT"`）：保留已显示的正文与思考内容，附阶段说明，由用户手动重试
- 流式中断 / 长度截断（`INTERRUPTED` / `TRUNCATED`）：同样保留已收到内容，但**不写入历史**
- HTTP 错误（`createApiError`）：按状态码映射为 AUTH / NOT_FOUND / RATE_LIMIT / SERVER 文案
- 用户取消（`AbortError`）：静默清理请求并释放 stream reader

### Q: 如何管理并发翻译请求？
A: 使用 RequestManager 管理请求生命周期，每个标签页同时只能有一个翻译请求，新的请求会自动取消旧的请求。

### Q: 历史记录如何同步？
A: **不同步**。历史记录只写入 `browser.storage.local`（`historyManager.ts` 全程如此），
最多保留 `MAX_HISTORY_COUNT = 142` 条，不经过 `storage.sync`，不支持跨设备同步。
（只有非敏感设置项会走 `storage.sync`，且 `apiKey` 被显式排除。）

## 相关文件清单

### 核心文件
- `index.ts` - 主入口和模块导出
- `translationService.ts` - 翻译核心服务
- `apiService.ts` - API 连接服务
- `historyManager.ts` - 历史记录管理
- `messageHandler.ts` - 消息处理
- `messageUtils.ts` - 消息工具
- `requestManager.ts` - 请求管理

### 管理器文件
- `contextMenuManager.ts` - 右键菜单管理
- `contextMenuHandler.ts` - 右键菜单事件处理
- `shortcutManager.ts` - 快捷键管理

### 常量文件
- `constants.ts` - 模块内常量定义

## 变更记录 (Changelog)

### 2026-09-10 - 文档纠错
- 🔧 删除「网络错误：自动重试」——**全项目不存在任何重试逻辑**，此条会误导维护者以为重试已实现
- 🔧 删除历史记录「本地和云端同步、跨设备同步」——实际仅存 `storage.local`
- 🔧 「单元测试（待添加）」不实，`tests/unit/` 已有 12 个文件
- 🔧 移除 ESLint 质量声明
- ➕ 补充流式异常终止（`INTERRUPTED` / `TRUNCATED`）的处理说明

### 2025-09-24 05:32 - 模块文档初始化
- ⚠️ 初版「覆盖率 100% (12/12 文件)」「缺口：无」与实际不符，已于 2026-09-10 移除