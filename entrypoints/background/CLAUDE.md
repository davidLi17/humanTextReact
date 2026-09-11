[根目录](../../CLAUDE.md) > [entrypoints](../) > **background**

# Background 模块 - 核心服务层

## 模块职责

Background 模块是人话翻译器的核心服务层，负责处理所有翻译相关的业务逻辑、API 请求、消息路由和生命周期管理。该模块在扩展的后台运行，作为各个组件之间的协调中心。

**核心职责**：
- 🌐 翻译服务的核心逻辑处理（`translationService.ts`）
- 📨 消息路由和通信管理（`messageHandler.ts` / `messageUtils.ts`）
- 🗄️ 历史记录的存储和检索（`historyManager.ts`）
- 🖱️ 右键菜单与快捷键的管理（`contextMenuManager.ts` / `contextMenuHandler.ts` / `shortcutManager.ts`）
- 🔄 请求生命周期管理（`requestManager.ts`）
- ⚙️ 用户设置的读取由 `entrypoints/shared/settingsUtils.ts` 提供：本模块**没有** `SettingsManager`
  类（`index.ts:15` 明确记录「SettingsManager 已被替换为 SettingsUtils」）

## 入口与启动

### 主入口文件
- **文件**: `index.ts`
- **启动方式**: `defineBackground()` (WXT 框架)，MV3 Service Worker
- **生命周期**: 由事件唤醒的 Service Worker，**不是常驻进程**。`index.ts:37` 的注释说明了
  为什么快捷键监听必须在顶级同步注册：「确保在 Service Worker 唤醒时不会漏掉任何事件」

### 初始化流程
```typescript
// entrypoints/background/index.ts
export default defineBackground(() => {
  // 初始化日志系统
  void initializeLogger("background");

  // 1. 同步注册全局快捷键命令监听器
  ShortcutManager.registerCommandListeners();

  // 2. 消息监听器
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    return MessageHandler.handleRuntimeMessage(request, sender, sendResponse);
  });

  // 3. 右键菜单点击处理
  browser.contextMenus.onClicked.addListener(
    ContextMenuHandler.handleContextMenuClick
  );

  // 4. 扩展安装 / 更新
  browser.runtime.onInstalled.addListener(() => {
    void ShortcutManager.saveCurrentShortcut();
    ContextMenuManager.createContextMenu();
  });

  // 5. 浏览器启动（同样重建菜单并同步快捷键）
  browser.runtime.onStartup.addListener(() => {
    void ShortcutManager.saveCurrentShortcut();
    ContextMenuManager.createContextMenu();
  });

  // 6. 标签页关闭时清理该标签页的请求
  browser.tabs.onRemoved.addListener((tabId: number) => {
    RequestManager.cleanupTab(tabId);
  });
});
```

## 对外接口

### 消息类型 (MESSAGE_TYPES)

**唯一来源是 `entrypoints/shared/constants/index.ts:10-38`**，本模块只做 re-export
（`index.ts:2-6`）。以下是该常量的完整当前值，改动请以源码为准：

```typescript
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",
  CLEANUP: "cleanup",
  GET_HISTORY: "getHistory",
  CLEAR_HISTORY: "clearHistory",
  DELETE_HISTORY_ITEM: "deleteHistoryItem",
  IMPORT_HISTORY: "importHistory",
  UPDATE_TRANSLATION: "updateTranslation", // 保留用于兼容
  UPDATE_CONTENT_TRANSLATION: "updateContentTranslation", // content弹窗专用
  UPDATE_POPUP_TRANSLATION: "updatePopupTranslation", // popup页面专用
  UPDATE_SIDEPANEL_TRANSLATION: "updateSidepanelTranslation", // sidepanel页面专用
  OPEN_SIDEPANEL: "openSidepanel",
  TOGGLE_SIDEPANEL: "toggleSidepanel",
  EXTRACT_PAGE_CONTENT: "extractPageContent",
  READ_PAGE_IN_SIDEPANEL: "readPageInSidepanel",
  READ_WEB_PAGE: "readWebPage", // 触发通读
  SAVE_JARGON_ITEM: "saveJargonItem",
  GET_JARGON_LIST: "getJargonList",
  UPDATE_JARGON_ITEM: "updateJargonItem",
  DELETE_JARGON_ITEM: "deleteJargonItem",
  TOGGLE_JARGON_STAR: "toggleJargonStar",
  EXPORT_JARGON: "exportJargon",
  IMPORT_JARGON: "importJargon",
  SHOW_TRANSLATION_POPUP: "showTranslationPopup",
  GET_SELECTED_TEXT: "getSelectedText",
  APPEND_DIAGNOSTIC_LOGS: "appendDiagnosticLogs",
  GET_DIAGNOSTIC_LOGS: "getDiagnosticLogs",
  CLEAR_DIAGNOSTIC_LOGS: "clearDiagnosticLogs",
} as const;
```

> ⚠️ 只有 `MessageHandler.handlers`（`messageHandler.ts:60-260`）里登记了 key 的 action 才会被
> background 处理，其余 action 由 **content / popup / sidepanel** 各自监听。判断某条消息是否
> 该由 background 处理时，先看 `handlers` 的 key。

### 主要服务类
1. **TranslationService** - 翻译核心服务（`translationService.ts`）
2. **ApiService** - API 连接测试（`apiService.ts`）
3. **HistoryManager** - 历史记录管理（`historyManager.ts`）
4. **ContextMenuManager** - 右键菜单管理（`contextMenuManager.ts`）
5. **ContextMenuHandler** - 右键菜单点击处理（`contextMenuHandler.ts`）
6. **ShortcutManager** - 快捷键管理（`shortcutManager.ts`）
7. **MessageHandler** - 消息处理（`messageHandler.ts`）
8. **MessageUtils** - 消息发送工具（`messageUtils.ts`）
9. **RequestManager** - 请求管理（`requestManager.ts`）

## 关键依赖与配置

### 内部依赖
- **设置管理**: `SettingsUtils` (`entrypoints/shared/settingsUtils.ts`)
- **日志系统**: `createLogger` / `backgroundLogger` / `initializeLogger` (`entrypoints/shared/logger`)
- **常量定义**: `MESSAGE_TYPES` / `DEFAULT_SETTINGS` / `MAX_HISTORY_COUNT` (`entrypoints/shared/constants/index.ts`)
- **错误模型**: `CodedError` / `createApiError` / `resolveUserErrorMessage` (`entrypoints/shared/errors.ts`)
- **请求协议**: `createRequestId` / `createSelectionTarget` / `createSidepanelTarget` (`entrypoints/shared/requestProtocol.ts`)
- **超时守卫**: `RequestTimeoutGuard` (`entrypoints/shared/requestTimeout.ts`)

> 本模块目录下的 `constants.ts` 是 **0 字节空文件**，且全仓库没有任何文件 import 它；
> 需要常量请直接用 `entrypoints/shared/constants`。

### 外部依赖
- **Chrome Extension API**: runtime, contextMenus, commands, storage, tabs, sidePanel
  （`sidePanel` 经 `entrypoints/shared/sidepanelUtils.ts` 调用）
- **WXT 框架**: `defineBackground`（`defineContentScript` 由 content 模块使用，不在本模块）

### 配置项
```typescript
// entrypoints/shared/constants/index.ts
export const DEFAULT_SETTINGS = {
  baseUrl: "https://api.deepseek.com/v1/chat/completions",
  model: "deepseek-flash",
  temperature: 0.7,
  promptTemplate: `始终使用中文。

你的任务是把复杂、专业、抽象、晦涩的信息讲成人能快速理解的话。…（多行长文，见源码）`,
  apiKey: "your_api_key",
  thinkingEnabled: false,
  showSelectionToolbar: true,
  contextualSelectionEnabled: false,
  prismModeEnabled: false,
  logLevel: LOG_LEVELS.OFF,
  theme: THEME_MODES.SYSTEM,
  fontScalePercent: DEFAULT_FONT_SCALE_PERCENT, // = 100
} as const;
```

> `promptTemplate` 会被**原样**作为 system message 发送，代码里没有任何占位符替换逻辑，
> 因此不要写 `{text}` 之类的占位符（源码注释，`constants/index.ts:73-75`）。

## 数据模型

### 翻译请求接口
```typescript
// entrypoints/background/translationService.ts:88-99
export interface TranslationParams {
  text?: string;
  messages?: ChatRoleMessage[];
  images?: ImageContent[];
  thinkingEnabled?: boolean;
  temperature?: number;
  promptTemplate?: string;
  apiKey?: string;
  selectionContext?: SelectionContext;
  bypassJargonVault?: boolean;
  prismMode?: boolean;
}
```

### 图片内容接口
```typescript
// entrypoints/background/translationService.ts:75-79
export interface ImageContent {
  data: string;                   // 直接作为 image_url.url 发送（translationService.ts:161）
  mimeType: string;               // MIME类型
  fileName?: string;              // 文件名（可选）
}
```

### 历史记录接口
```typescript
// entrypoints/background/historyManager.ts:13-20
export interface HistoryItem {
  original: string;
  translated: string;
  reasoning?: string;
  hasReasoning: boolean;          // 必填，不是可选字段
  timestamp: number;
  resultSource?: TranslationResultSource; // 命中生词本时为 "jargon-vault"
}
```

## 核心功能实现

### 1. 翻译服务 (TranslationService)
**特点**：
- 流式响应实时更新（`parseStreamLines` 解析 SSE，`sendTranslationUpdate` 逐帧推送）
- 多模态翻译（文本 + 图片，`buildMessagesPayload` / `formatMultimodalContent`）
- 命中本地生词本时直接交付本地结果（`deliverLocalResult`），不调用模型
- **没有任何自动重试逻辑**：错误按类型分支处理后交由用户手动「重试」按钮
- 翻译成功后才写入历史；流式异常终止（`INTERRUPTED` / `TRUNCATED`）与超时**都不写历史**
- 请求归属由调用方登记的 `RequestContext` 决定，TranslationService 不自行推断

**关键方法**：
```typescript
// translationService.ts:363-366
static async translateText(
  params: TranslationParams,
  requestContext: RequestContext
): Promise<string | void>
```

**结果分发**（`sendTranslationUpdate` / `sendTranslationError`，`translationService.ts:716-791`）按
`requestContext.target.kind` 选择动作：

| target.kind | 动作常量 |
| --- | --- |
| `tab` | `MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION` |
| `sidepanel` | `MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION`（带 `sessionId`） |
| 其它（popup） | `MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION` |

### 2. API 服务 (ApiService)
**特点**：
- API 连接健康检查（设置页「测试连接」调用）
- 错误经 `createApiError` 统一映射为 `CodedError`（401/403 → `AUTH`，404 → `NOT_FOUND`，
  429 → `RATE_LIMIT`，其余 → `SERVER`）
- 超时走 `RequestTimeoutGuard`，阶段名为 `"connection-test"`

**关键方法**：
```typescript
// apiService.ts:48-52
static async testApiConnection(
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<boolean>
```

> ⚠️ **已知待修问题**：连接测试请求体写死了 `temperature: 0.1` 与 `max_tokens: 5`
> （`apiService.ts:79-80`），**没有**读取用户设置，也**没有**按模型/服务商适配。
> 目前文档如实描述现状，勿写成「已适配」。

### 3. 历史管理 (HistoryManager)
**特点**：
- 只使用 `browser.storage.local`，**不使用 `storage.sync`**，不支持跨设备同步
- 最多保留 `MAX_HISTORY_COUNT = 142` 条（超出即截断，`historyManager.ts:57-59`）
- 支持删除单条、清空、导入（导入时校验并合并去重后截断）
- **没有**搜索方法，**没有**过期自动清理：`getTranslationHistory()` 无参数、返回全部记录；
  模糊搜索在 popup 侧用 Fuse.js 完成（`entrypoints/popup/hooks/useFuseSearch.ts`）

**关键方法**：
```typescript
// historyManager.ts:30-35 / 73
static async saveTranslationHistory(
  original: string,
  translated: string,
  reasoning?: string,
  resultSource?: TranslationResultSource
): Promise<void>
static async getTranslationHistory(): Promise<HistoryItem[]>
static async deleteHistoryItem(original: string): Promise<boolean>
static async clearHistory(): Promise<boolean>
static async importHistory(newHistory: any[]): Promise<boolean>
```

### 4. 消息处理 (MessageHandler)
**特点**：
- 策略表 `handlers`（`messageHandler.ts:60-260`）做 action → 处理函数的路由
- `handleRuntimeMessage` 统一包装 `await` + `try/catch`，异常时回 `{ success: false, error }`
- 未登记的 action **返回 `false`**（不占用 `sendResponse` 通道），交由其它上下文处理

**关键方法**：
```typescript
// messageHandler.ts:265-269
static handleRuntimeMessage(
  request: any,
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean
```

**已登记的 action**：
`TRANSLATE`、`CLEANUP`、`GET_HISTORY`、`CLEAR_HISTORY`、`DELETE_HISTORY_ITEM`、
`IMPORT_HISTORY`、`SHOW_TRANSLATION_POPUP`、`OPEN_SIDEPANEL`、`TOGGLE_SIDEPANEL`、
`APPEND_DIAGNOSTIC_LOGS`、`GET_DIAGNOSTIC_LOGS`、`CLEAR_DIAGNOSTIC_LOGS`、
`SAVE_JARGON_ITEM`、`GET_JARGON_LIST`、`UPDATE_JARGON_ITEM`、`DELETE_JARGON_ITEM`、
`TOGGLE_JARGON_STAR`、`EXPORT_JARGON`、`IMPORT_JARGON`，以及字符串字面量
`"shortcutChanged"` 与 `"testApiConnection"`（`messageHandler.ts:62`、`252`）。

### 5. 右键菜单 (ContextMenuManager / ContextMenuHandler)
菜单项在 `contextMenuManager.ts:13-48` 创建：

| menuItemId | 标题 | contexts |
| --- | --- | --- |
| `translateSelection` | 翻译成人话 (浮窗) | `selection` |
| `openSidepanelTranslate` | 在侧边栏中人话对话 | `selection` |
| `readPageInSidepanel` | 📄 通读当前网页 (人话速读) | `page` |
| `openSidepanel` | 打开人话侧边栏 | `page`, `action` |

`ContextMenuHandler.handleContextMenuClick`（`contextMenuHandler.ts:57-213`）按 `menuItemId` 分派：

- `readPageInSidepanel`：打开侧边栏 → 写 `storage.local.pendingWebPageRead`
  （`{ timestamp, tabId }`）→ 发 `MESSAGE_TYPES.READ_WEB_PAGE` runtime 消息
- `openSidepanel` / `openSidepanelTranslate`：打开侧边栏，若有选中文本则写
  `pendingSidepanelText` 并补发 `"sendToSidepanel"` runtime 消息
- `translateSelection`：登记 `RequestManager` 请求 → 发 `SHOW_TRANSLATION_POPUP` →
  自己 `claimRequest` 后调用 `TranslationService.translateText`（后台是选中文本翻译的
  唯一请求发起方）

> 🔧 **2026-09-11 修复（`b82950b`）**：`readPageInSidepanel` 分支原先发送的是硬编码字面量
> `action: "readCurrentWebPage"`，而侧边栏比对的是 `MESSAGE_TYPES.READ_WEB_PAGE`
> （`"readWebPage"`），消息被静默丢弃，表现为「侧边栏已打开时右键通读毫无反应」。
> 现已改用常量（`contextMenuHandler.ts:77-80`），并有回归测试
> `tests/integration/contextMenuWebReading.test.js` 锁住这条消息名。
> 侧边栏消费该 runtime 消息后会清掉 `pendingWebPageRead`，避免 10 秒新鲜度窗口内
> 重载侧边栏时被 storage 通道重复触发（`entrypoints/sidepanel/App.tsx:784-793`）。

> 📌 **行为契约（`2130f87`，侧边栏侧）**：右键「通读当前网页」**不会自动发起模型请求**，
> 只把网页正文作为上下文附加到当前会话（`App.tsx:1207-1208` 注释：「只把正文作为上下文
> 附加到当前会话：不新建会话、不创建助手占位、不发起模型请求」）。background 侧的
> `translationService.ts` 在此次改动中未修改，本模块只负责「打开侧边栏 + 落待办 + 通知」。

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）
- **ESLint / Prettier**: ⚠️ **项目未配置**，没有任何 lint / format 闸门
- **自动化质量闸门**: 只有 `tsc --noEmit` 与 `bun test`（本模块不单独设置闸门）
- **调试日志**: 自研 logger（`entrypoints/shared/logger`），支持 30 分钟诊断会话
- **错误模型**: `entrypoints/shared/errors.ts` 的 `CodedError` + 错误码映射

### 测试覆盖
实测（2026-09-11 本地运行 `bun test tests/unit tests/contracts tests/integration tests/helpers`）：
**396 个用例 / 33 个文件，全部通过**。与本模块直接相关的：

- ✅ 右键菜单通读通知通道（`tests/integration/contextMenuWebReading.test.js`，2026-09-11 新增）
- ✅ `RequestManager` 生命周期（`tests/unit/requestManager.test.js`）
- ✅ `TranslationService` 鉴权头与流式超时（`tests/integration/translationServiceAuth.test.js`、`requestTimeout.test.js`）
- ✅ 快捷键通道与后台命令分派（`tests/integration/shortcutFix.test.js`）
- ⚠️ `historyManager.ts` / `messageHandler.ts` **没有独立测试文件**，仅被上述集成用例间接带入
  （2026-09-11 覆盖率实测：`historyManager.ts` 行覆盖 3.73%、`messageHandler.ts` 39.6%；
  该数字随测试变动，只作现状记录，不构成覆盖率承诺）
- ⚠️ `entrypoints/background/constants.ts` 是空文件，没有可测内容

## 常见问题 (FAQ)

### Q: 翻译请求失败如何处理？
A: TranslationService 按错误类型分支处理，**没有任何自动重试逻辑**：
- 超时（`CodedError.code === "TIMEOUT"`）：保留已显示的正文与思考内容，附阶段说明，由用户手动重试
- 流式中断 / 长度截断（`INTERRUPTED` / `TRUNCATED`）：同样保留已收到内容，但**不写入历史**
- HTTP 错误（`createApiError`）：按状态码映射为 AUTH / NOT_FOUND / RATE_LIMIT / SERVER 文案
- 用户取消（`AbortError`）：静默清理请求并释放 stream reader

### Q: 如何管理并发翻译请求？
A: `RequestManager` 以 `requestId` 管理请求，并按**展示目标**（target）记录当前活动请求：
同一目标同时只能有一个翻译请求，新请求会 `abort` 并清理同目标的旧请求
（`requestManager.ts:37-40`）。目标有三类：标签页（tab）、侧边栏会话（sidepanel）、
popup（全局唯一）。标签页关闭时通过 `RequestManager.cleanupTab` 清理该页全部请求。

### Q: 历史记录如何同步？
A: **不同步**。历史记录只写入 `browser.storage.local`（`historyManager.ts` 全程只用
`storage.local`），最多保留 `MAX_HISTORY_COUNT = 142` 条，不经过 `storage.sync`，
不支持跨设备同步。（只有非敏感设置项会走 `storage.sync`，且 `apiKey` 被显式排除。）

## 相关文件清单

### 核心文件
- `index.ts` - 主入口和模块导出
- `translationService.ts` - 翻译核心服务
- `apiService.ts` - API 连接服务
- `historyManager.ts` - 历史记录管理
- `messageHandler.ts` - 消息处理
- `messageUtils.ts` - 消息发送工具（`safeSendMessage` / `sendRuntimeMessage`）
- `requestManager.ts` - 请求管理

### 管理器文件
- `contextMenuManager.ts` - 右键菜单管理
- `contextMenuHandler.ts` - 右键菜单事件处理
- `shortcutManager.ts` - 快捷键管理

### 空文件
- `constants.ts` - **0 字节，无导出、无引用方**；真实常量在 `entrypoints/shared/constants/index.ts`

## 变更记录 (Changelog)

### 2026-09-11 - 与源码对齐（修复右键通读 bug 之后的核对）
- ➕ 记录 `b82950b`：右键「通读当前网页」的消息名由硬编码字面量改为
  `MESSAGE_TYPES.READ_WEB_PAGE`，并补充 `pendingWebPageRead` 待办键与侧边栏清理逻辑
- ➕ 记录 `2130f87` 的行为契约：网页通读只把正文附加到当前会话，**不自动发起模型请求**
- 🔧 `MESSAGE_TYPES` 旧列表只有 10 项且缺 `UPDATE_SIDEPANEL_TRANSLATION`、`READ_WEB_PAGE` 等，
  现按 `entrypoints/shared/constants/index.ts` 全量修正
- 🔧 初始化流程代码：旧版写的是 `commands.onCommand.addListener(ShortcutManager.executeTranslation)`
  且遗漏 `onStartup` / `tabs.onRemoved`，现按 `index.ts` 实际代码替换
- 🔧 移除 TranslationService「智能错误处理和重试」——**全项目不存在任何重试逻辑**
- 🔧 修正 `translateText` 签名为 `(params, requestContext)`；修正 `TranslationParams` 字段
  （旧版有 `tabId`，实际没有）
- 🔧 `HistoryItem` 补 `hasReasoning: boolean`（必填）与 `resultSource?`
- 🔧 `HistoryManager` 旧版方法名 `getHistory(searchTerm?)` 不存在；删除「支持历史记录搜索」
  「自动清理过期记录」两条无依据描述
- 🔧 标注 `apiService.ts` 连接测试写死 `temperature: 0.1` / `max_tokens: 5` 为**已知待修问题**
- 🔧 标注 `constants.ts` 为 0 字节空文件；`DEFAULT_SETTINGS` 按源码补齐字段
- ➕ 补充测试规模实测（396 用例 / 33 文件）与新增测试 `contextMenuWebReading.test.js`

### 2026-09-10 - 文档纠错
- 🔧 删除「网络错误：自动重试」——**全项目不存在任何重试逻辑**，此条会误导维护者以为重试已实现
- 🔧 删除历史记录「本地和云端同步、跨设备同步」——实际仅存 `storage.local`
- 🔧 「单元测试（待添加）」不实，`tests/unit/` 已有 12 个文件
- 🔧 移除 ESLint 质量声明
- ➕ 补充流式异常终止（`INTERRUPTED` / `TRUNCATED`）的处理说明

### 2025-09-24 05:32 - 模块文档初始化
- ⚠️ 初版「覆盖率 100% (12/12 文件)」「缺口：无」与实际不符，已于 2026-09-10 移除
