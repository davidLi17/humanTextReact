[根目录](../../CLAUDE.md) > [entrypoints](../) > **popup**

# Popup 模块 - 用户界面层

## 模块职责

Popup 模块是人话翻译器的主要用户界面，提供完整的翻译交互体验。该模块基于 React 19 构建，负责用户输入、翻译结果显示、历史记录管理等功能。

**核心职责**：
- 🎨 用户界面的渲染和交互
- 📝 文本输入和翻译控制
- 📚 历史记录的展示和管理
- 🎯 智能搜索和过滤功能
- 📋 翻译结果的显示和复制
- ⚙️ 用户设置的实时同步

## 入口与启动

### 主入口文件
- **文件**: `main.tsx`
- **启动方式**: ReactDOM.createRoot()
- **挂载点**: `document.getElementById("root")`

### 初始化流程
**不是**直接 `render(<App />)`：`main.tsx` 先异步读设置里的主题，再挂载（`main.tsx:13-30`）。
```typescript
async function bootstrap() {
  let initialThemeMode: ThemeMode = THEME_MODES.SYSTEM;

  try {
    const settings = await SettingsUtils.getSettings();
    initialThemeMode = normalizeThemeMode(settings.theme);
  } finally {
    applyTheme(document.documentElement, initialThemeMode);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App initialThemeMode={initialThemeMode} />
    </React.StrictMode>
  );
}

void bootstrap();
```
> 顶部还 `import "./style.less";`（`main.tsx:10`）；`App.less` 由 `App.tsx:19` 导入。

### 主组件结构
- **App.tsx**（706 行） - 主应用组件，状态管理和逻辑控制；唯一 prop 是 `initialThemeMode?: ThemeMode`（`App.tsx:34-38`）
- **types.ts** - 本模块全部类型定义
- **components/** - 子组件目录（6 个）
  - `TranslationArea.tsx`（355 行）- 翻译区域组件
  - `HistoryPanel.tsx`（325 行）- 历史记录面板
  - `SmartInput.tsx`（237 行）- 智能输入组件（带 `SmartInput.less`）
  - `CollapsibleThinkingChain.tsx`（98 行）- 思维链折叠组件
  - `CopyFooter.tsx`（127 行）- 复制 / 存入生词本底部栏
  - `ThemeModeSelector.tsx`（102 行）- 跟随系统 / 浅色 / 深色三态切换
- **hooks/** - `useFuseSearch.ts`、`useAutoScroll.ts`、`useAutoScrollToBottom.tsx`
- **utils/** - `helpers.ts`、`imageUtils.ts`

## 对外接口

### 组件 Props 接口
均为 `types.ts` 中的导出接口，字段与源码一致（省略 JSDoc，见 `types.ts`）。

```typescript
// TranslationAreaProps（types.ts:101-156）
export interface TranslationAreaProps {
  translationState: TranslationState;
  setTranslationState: React.Dispatch<React.SetStateAction<TranslationState>>;
  onTranslate: () => void;
  onCopy: (text: string) => Promise<boolean>;
  onShowHistory: () => void;
  onOpenSettings: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onClearDraft: () => void;
  onRetry: () => void;
  onRegenerate: () => void;   // 跳过生词本并明确重新调用模型
  onCancel: () => void;
  onScroll: () => void;
  history: HistoryItem[];
}

// HistoryPanelProps（types.ts:161-218）
export interface HistoryPanelProps {
  history: HistoryItem[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onBack: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onRestore: (item: HistoryItem) => void;
  onCopyOriginal: (item: HistoryItem) => Promise<boolean>;
  onCopyTranslation: (item: HistoryItem) => Promise<boolean>;
  onRetranslate: (item: HistoryItem) => void;
  onDelete: (original: string) => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}
```
> `App.tsx:668-683` 实际传的是 `onScroll={() => {}}`：`App.tsx` 里的 `handleScroll` 已是空函数，滚动在 `TranslationArea` 内部处理（`App.tsx:272-273`）。

### 消息通信接口
```typescript
// MessageRequest（types.ts:223-262）
export interface MessageRequest {
  action: string;
  requestId?: string;          // 翻译请求的唯一 ID，用于丢弃过期流
  text?: string;
  source?: string;
  content?: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  done?: boolean;
  error?: string;
  resultSource?: TranslationResultSource;  // 结果来自本地生词本
}

// MessageResponse（types.ts:267-280）
export interface MessageResponse {
  success: boolean;
  history?: HistoryItem[];
  error?: string;
}
```

popup 实际发送 / 接收的 `action`（均为字符串字面量或 `MESSAGE_TYPES` 常量，
常量表见 `shared/constants/index.ts:10-38`）：

| 方向 | action | 位置 |
| --- | --- | --- |
| 发出 | `"translate"` | `App.tsx:334`（携带 `requestId`/`text`/`images`/`thinkingEnabled`/`temperature`/`promptTemplate`/`apiKey`/`source: "popup"`/`bypassJargonVault`） |
| 发出 | `"cleanup"` | `App.tsx:284`（取消 / 卸载时清理在途请求） |
| 发出 | `"getHistory"` | `App.tsx:419`、`App.tsx:566` |
| 发出 | `"deleteHistoryItem"` | `App.tsx:531` |
| 发出 | `"clearHistory"` | `App.tsx:550` |
| 发出 | `"importHistory"` | `App.tsx:597` |
| 接收 | `"updatePopupTranslation"` | `App.tsx:150`（注意源码用**字面量**而非 `MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION`） |
| 接收 | `MESSAGE_TYPES.APPEND_DIAGNOSTIC_LOGS` | `App.tsx:135`（直接 `return false` 忽略，不落日志） |
| — | `"testApiConnection"` | 属于 options，不在本模块 |

> 从 background 拿历史用的是 **回调式** `browser.runtime.sendMessage(msg, cb)`（`App.tsx:419-423`），
> 而发起翻译用的是 **Promise 式** `await browser.runtime.sendMessage(...)`（`App.tsx:333`），两种风格在源码中并存。

## 关键依赖与配置

### 内部依赖
- **设置管理**: `SettingsUtils` (`shared/settingsUtils.ts`)
- **日志系统**: `createLogger` / `initializeLogger` (`shared/logger`)
- **常量定义**: `MESSAGE_TYPES`、`THEME_MODES`、`ThemeMode` (`shared/constants`)
- **请求归属**: `createRequestId` / `shouldAcceptRequestUpdate` (`shared/requestProtocol`)
- **主题**: `applyTheme` / `normalizeThemeMode` / `watchSystemTheme` (`shared/theme`)
- **字号**: `useFontScale` (`shared/useFontScale`)，用于顶部「字体大小保存失败」提示
- **侧边栏**: `openSidePanel` (`shared/sidepanelUtils`)
- **生词本**: `JargonVault` (`shared/jargonVault`，`CopyFooter` 的「存入生词本」)
- **Markdown**: `parseMarkdown` / `initializeCodeCopy` (`@/shared/utils/markdown`) 与 `injectMarkdownStyles` (`@/shared/styles/markdown`)
- **跨入口组件**: `PrismResultTabs`（`entrypoints/sidepanel/components/`，被 `TranslationArea` 引用）
- **本模块工具**: `utils/helpers.ts`、`utils/imageUtils.ts`

### 外部依赖
- **React 19**: UI 框架
- **React DOM**: DOM 渲染
- **@icon-park/react**: 图标库
- **fuse.js**: 模糊搜索
- **dayjs**: 日期处理
- **lodash-es**: 工具函数

### 样式依赖
- **Less**: CSS 预处理器
- **App.less**: 主应用样式
- **style.less**: 全局样式

## 数据模型

### 翻译状态接口（`types.ts:25-68`）
```typescript
export interface TranslationState {
  activeRequestId?: string;     // 当前展示的翻译请求 ID
  sourceText: string;
  translatedText: string;
  reasoningText: string;
  isTranslating: boolean;
  errorMessage?: string;        // 当前翻译错误信息
  hasReasoning: boolean;
  showResult: boolean;
  thinkingEnabled: boolean;
  images: ImageContent[];
  resultSource?: TranslationResultSource;  // 结果由本地生词本直接提供
}
```
> 组件初始化时 `errorMessage` 被显式写成 `""` 而非 `undefined`（`App.tsx:50`）。

### 历史记录接口（`types.ts:73-96`）
```typescript
export interface HistoryItem {
  original: string;
  translated: string;
  reasoning?: string;
  hasReasoning?: boolean;
  timestamp: number;
  resultSource?: TranslationResultSource;
}
```

### 图片内容接口（`types.ts:7-20`）
```typescript
export interface ImageContent {
  data: string;                // base64 编码
  mimeType: string;            // MIME 类型
  fileName?: string;           // 原始文件名（可选）
}
```

## 核心功能实现

### 1. 主应用组件 (App.tsx)
**特点**：
- 集中状态管理
- 消息监听和处理
- 设置同步和更新
- 历史记录管理

**核心功能**：
```typescript
// 1) 消息监听（App.tsx:129-222）—— 只处理 updatePopupTranslation，其余 action 只打日志
const messageListener = (
  request: MessageRequest,
  sender: any,
  sendResponse: (response?: any) => void
) => {
  if (request.action === MESSAGE_TYPES.APPEND_DIAGNOSTIC_LOGS) {
    return false;
  }
  // ... logger.log(...) 记录 action / content / reasoning / done / error

  if (request.action === "updatePopupTranslation") {
    // 丢弃过期请求：requestId 必须等于 activeRequestIdRef.current
    if (
      !shouldAcceptRequestUpdate(request.requestId, activeRequestIdRef.current, true)
    ) {
      sendResponse({ success: true, ignored: true });
      return false;
    }
    // ... 有 request.error 走错误分支；否则按 done 决定 isTranslating，
    //     content / reasoningContent 为空时保留旧值（|| prev.xxx）
    sendResponse({ success: true });
  }
  return false;
};

// 2) 设置监听（App.tsx:225-270）
//    ⚠️ 前面的 SettingsUtils.clearCache() 目前是**空实现**（settingsUtils.ts:71
//    为 `static clearCache(): void {}`），调用它不会清任何缓存，只是占位。
//    随后 getSettings() → loadHistory() → onSettingsChanged(...)。
const unsubscribeSettings = SettingsUtils.onSettingsChanged((newSettings) => {
  setTranslationState((prev) => ({
    ...prev,
    thinkingEnabled: newSettings.thinkingEnabled,
  }));
  setThemeMode(normalizeThemeMode(newSettings.theme)); // 主题也跟随设置页变化
});
return () => unsubscribeSettings();

// 3) 草稿持久化（App.tsx:77-126）—— storage.local 的 "popupDraft" 键，
//    输入/图片变化后 debounce 300ms 落盘；无内容时 remove 掉该键
const DRAFT_STORAGE_KEY = "popupDraft";
```

**请求归属与取消**（`shared/requestProtocol`）：每次翻译前 `createRequestId()` 并写入
`activeRequestIdRef`（`App.tsx:308-309`）；取消、恢复历史、清空草稿、重译、`beforeunload`
都会先 `cleanupActiveRequest()` 向 background 发 `"cleanup"`（`App.tsx:278-287`）。

### 2. 翻译区域组件 (TranslationArea.tsx)
**特点**：
- 智能输入提示（`SmartInput`）
- 图片**粘贴**支持（无拖拽 / 无文件选择）
- 实时翻译状态与流式结果
- 复制功能集成（`CopyFooter`）

**核心功能**：
- 文本输入（复用 `SmartInput`）与空输入校验，翻译触发 / 重试 / 重新生成 / 取消
- **图片只支持剪贴板粘贴**（`TranslationArea.tsx:133-143` 监听 `document` 的 `paste`，
  仅在焦点位于 `.translation-area` 内时处理，`ImageUtils.getImageFromClipboard()`）；
  ⚠️ **没有**拖拽上传，也**没有** `<input type="file">`（此前文档写的「图片拖拽上传」与源码不符）
- 结果展示：译文交给 `PrismResultTabs`（`entrypoints/sidepanel/components/`，`TranslationArea.tsx:320-323`）；
  进入时调用 `injectMarkdownStyles("popup-markdown-styles")` + `initializeCodeCopy()`（`TranslationArea.tsx:51-52`）；
  思维链用 `CollapsibleThinkingChain`；底部 `CopyFooter`；右上 `ThemeModeSelector`
- 生词本命中：`resultSource === "jargon-vault"` 时显示「来自生词本」徽标与「重新生成」按钮
  （`onRegenerate`，`TranslationArea.tsx:310-338`）
- ⚠️ `parseMarkdown` 在该文件被 import 但**未使用**（`TranslationArea.tsx:9`），渲染实际由
  `PrismResultTabs` 内部完成
- 侧边栏入口 `openSidePanel`（`shared/sidepanelUtils`）与 `MESSAGE_TYPES` 常量导入

### 3. 历史记录面板 (HistoryPanel.tsx)
**特点**：
- 模糊搜索（走 `useHistorySearch`，不是组件内直接 `new Fuse`）
- 搜索词输入 `debounce` 防抖（`utils/helpers` 重导出的 lodash-es `debounce`）
- 单条还原 / 复制原文 / 复制译文 / 重译 / 删除，整体清空
- 数据导出 / 导入（**都要经 background**，面板本身不直接读写存储）

**核心功能**：
```typescript
// 搜索：HistoryPanel.tsx:4,28
import { useHistorySearch } from "../hooks/useFuseSearch";
const { search, results, totalMatches } = useHistorySearch(history);

// 该 hook 的配置（useFuseSearch.ts:198-206）：
//   keys: ["original", "translated"], threshold: 0.4,
//   includeScore: true, includeMatches: true,
//   minMatchCharLength: 1, maxResults: 50
// 另有 useInputSuggestions（keys: ["original"], threshold: 0.2, maxResults: 10）

// 导出：App.tsx:564-585 —— 先向 background 要 getHistory，再本地 Blob 下载
//   文件名 translation_history_YYYY-MM-DD.json

// 导入：App.tsx:588-619 —— FileReader 读文本 → JSON.parse →
//   必须是数组 → 发 "importHistory" 给 background → 成功后 loadHistory()
```
> ⚠️ 此前的示例把 `new Fuse(...)` 和 Blob/FileReader 写在本组件内，与源码位置不符，已更正。

### 4. 智能输入组件 (SmartInput.tsx)
**特点**：
- 输入过程中按「词」触发补全（`useInputSuggestions` 的 `getAutoComplete` + `getSuggestions`）
- 历史原文匹配（`SmartInput.tsx:70-71`、`168-169`）
- 建议下拉框（`.suggestions-dropdown`，`SmartInput.tsx:217`）
- 自带样式 `SmartInput.less`

### 5. 思维链组件 (CollapsibleThinkingChain.tsx)
**特点**：
- 折叠 / 展开切换，仅在内容溢出时提示「点击展开」
- 折叠态预览：只取**最后 5 行**（`getPreviewText`，`CollapsibleThinkingChain.tsx:42-47`）
- Markdown 渲染：`parseMarkdown` + `dangerouslySetInnerHTML`（`shared/utils/markdown`）
- 折叠态自动滚到底部；`isTranslating` 时显示「思考中...」三点动画
- ⚠️ 组件内**没有**代码高亮或复制按钮，代码块复制由 `TranslationArea` 侧的
  `initializeCodeCopy()` 统一初始化

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）
- **React 严格模式**: 开发时的额外检查
- **ESLint / Prettier**: ⚠️ **项目未配置**，没有任何 lint / 格式化闸门
- **调试日志**: 自研 logger（`shared/logger`），非 `debug` 包

### 测试覆盖
全仓测试现状（2026-09-11 实测 `bun test`）：**344 个用例通过 / 31 个文件**。
- ⚠️ **本模块没有组件级测试**：`tests/components/` 只有 `Options.component.tsx`、
  `SidepanelApp.component.tsx`、`PromptQueue.component.tsx` 三个用例文件
- ⚠️ `App.tsx`（706 行）与 `components/*` 都不在 `bun run test:coverage` 产出的
  `coverage/lcov.info` 里（该命令只跑 `tests/unit`、`tests/contracts`、`tests/integration`、
  `tests/helpers`）；唯一被覆盖率收录的 popup 文件是 `entrypoints/popup/utils/helpers.ts`
- ❌ 组件渲染 / 用户交互 / 消息通信测试均待添加

## 常见问题 (FAQ)

### Q: 如何处理翻译过程中的状态更新？
A: 使用 React 的 useState 和 useEffect 管理翻译状态，通过消息监听器接收来自 background 的流式更新。

### Q: 历史记录的搜索是如何实现的？
A: 使用 Fuse.js（`useHistorySearch`，`keys: ["original", "translated"]`、`threshold: 0.4`、
最多 50 条）做模糊搜索；输入的搜索词经 `debounce` 防抖后再查询（`HistoryPanel.tsx`）。

### Q: 图片怎么加进来？支持哪些格式？
A: **只能通过剪贴板粘贴**（`TranslationArea` 监听 `paste` 事件），没有拖拽、没有文件选择框。
支持格式与限制来自 `IMAGE_CONFIG`（`shared/constants/index.ts:128-139`）：`image/jpeg`、
`image/jpg`、`image/png`、`image/gif`、`image/webp`，单张最大 10MB；
粘贴后会经 canvas 重新编码为 JPEG（质量 0.8）、最长边压到 2048px（`imageUtils.ts`）。

### Q: 如何实现数据的导入/导出？
A: 历史记录：导出走 `getHistory` → `JSON.stringify` → `Blob` 下载；导入走 `FileReader` →
`JSON.parse`（必须是数组）→ 发 `"importHistory"` 给 background 落盘（`App.tsx:564-619`）。
导出的 JSON 里**只有翻译历史**，不含任何设置项，因此不涉及密钥；由用户手动迁移文件，
**扩展本身不做自动跨设备同步**。（设置项的整体备份/恢复是 Options 页的另一个功能，
其 `shared/dataBackup.ts` 会在导出与恢复两个方向都强制剔除 `apiKey`。）

## 相关文件清单

### 核心文件
- `main.tsx` - 应用入口（异步 bootstrap，取主题后挂载）
- `App.tsx` - 主应用组件（706 行）
- `types.ts` - 类型定义
- `hooks/useFuseSearch.ts` - 模糊搜索 Hook（导出 `useFuseSearch` / `useHistorySearch` / `useInputSuggestions`）
- `hooks/useAutoScroll.ts`、`hooks/useAutoScrollToBottom.tsx` - 自动滚动 Hook

### 组件文件
- `components/TranslationArea.tsx` - 翻译区域（355 行）
- `components/HistoryPanel.tsx` - 历史记录面板（325 行）
- `components/SmartInput.tsx` - 智能输入（237 行，含 `SmartInput.less`）
- `components/CollapsibleThinkingChain.tsx` - 思维链组件（98 行）
- `components/CopyFooter.tsx` - 复制 / 存入生词本底部栏（127 行，依赖 `shared/jargonVault`）
- `components/ThemeModeSelector.tsx` - 主题三态切换（102 行）

### 工具文件
- `utils/helpers.ts` - 通用工具函数
- `utils/imageUtils.ts` - 图片处理工具

### 样式文件
- `App.less` - 主应用样式
- `style.less` - 全局样式
- `components/SmartInput.less` - 输入组件样式

### 配置文件
- `index.html` - HTML 模板

## 变更记录 (Changelog)

### 2026-09-11 - 与源码对齐（含 418ea8f 模型配置更新）
- 🔄 **`main.tsx` 初始化流程改为真实代码**：此前写的是「`import "./style.less"` +
  直接 `render(<App />)`」，实际是 `bootstrap()` 先 `SettingsUtils.getSettings()` 取主题、
  `applyTheme` 后再 `render(<App initialThemeMode={...} />)`（`main.tsx:13-30`）。
- 🔄 **组件清单补 `ThemeModeSelector.tsx`**（原文档漏列），并补上 hooks / 行数。
- 🔄 **Props 接口按 `types.ts` 重写**：`TranslationAreaProps` 补 `themeMode`/`onThemeChange`/
  `onClearDraft`/`onRetry`/`onRegenerate`/`onCancel`；`HistoryPanelProps` 补 `themeMode`/
  `onThemeChange`/`onCopyOriginal`/`onCopyTranslation`/`onRetranslate`。
- 🔄 **数据模型按 `types.ts` 重写**：`TranslationState` 补 `activeRequestId`/`errorMessage`/
  `resultSource`；`HistoryItem` 补 `resultSource`；`MessageRequest` 补 `requestId`/`resultSource`。
- 🔄 **消息通信**：新增 popup 实际收发 action 对照表（`"translate"`/`"cleanup"`/`"getHistory"`/
  `"deleteHistoryItem"`/`"clearHistory"`/`"importHistory"`/`"updatePopupTranslation"`/
  `APPEND_DIAGNOSTIC_LOGS`），并标明源码用的是**字面量** `"updatePopupTranslation"`。
- 🔴 **修正「图片拖拽上传」**：源码只支持**剪贴板粘贴**（`TranslationArea.tsx:133-143`），
  既无拖拽也无文件选择框。
- 🔴 **修正「代码高亮支持」**：`CollapsibleThinkingChain` 只用 `parseMarkdown` 渲染，
  无高亮、无复制按钮；代码块复制由 `TranslationArea` 的 `initializeCodeCopy()` 统一处理。
- 🔴 **修正 HistoryPanel 示例**：`new Fuse(...)` / Blob / FileReader 实际不在该组件内，
  搜索走 `useHistorySearch`（`useFuseSearch.ts:198-206`），导入导出走 `App.tsx` + background 消息。
- 🔧 记录 `SettingsUtils.clearCache()` 是空实现（`settingsUtils.ts:71`），避免被误会为有效缓存清理。
- 🔧 测试现状更新为实测 **344 用例 / 31 文件**；覆盖率表述改为可核验的说法（本模块文件不在
  `coverage/lcov.info` 中，因 `test:coverage` 只跑 4 个非组件目录）。
- ✅ 保留 2026-09-10 的更正：无组件级测试、无 ESLint、导出不含自动跨设备同步；
  图片格式与大小限制（`IMAGE_CONFIG`）经核对属实。

### 2026-09-10 - 文档纠错
- 🔧 移除 ESLint 质量声明（项目未配置 ESLint）
- 🔧 「测试覆盖 ✅」不实：本模块**没有组件级测试**，原清单的高覆盖为无依据结论
- 🔧 澄清导入/导出不含自动跨设备同步（`apiKey` 双向剔除属于 Options 页的设置备份，
  见 2026-09-11 条目中对本模块历史导入/导出的更正）
- ✅ 保留：图片格式与大小限制（`IMAGE_CONFIG`：JPEG/JPG/PNG/GIF/WebP、10MB、
  质量 0.8、最长边 2048）经核对属实

### 2025-09-24 05:32 - 模块文档初始化
- ⚠️ 初版「覆盖率 100% (12/12 文件)」「缺口：无」与实际不符，已于 2026-09-10 移除