[根目录](../../CLAUDE.md) > [entrypoints](../) > **content**

# Content 模块 - 内容脚本层

## 模块职责

Content 模块是人话翻译器的页面注入层，负责在网页中创建和管理翻译弹窗，处理用户交互，并与后台服务进行通信。该模块通过 Content Script 注入到所有网页中。

**核心职责**：
- 🖱️ 页面翻译弹窗的创建和管理（`popupManager.ts`）
- 📨 消息接收和处理（`messageHandler.ts`）
- 🎨 弹窗样式注入、主题与字号（`styles.tsx`）
- 📝 Markdown 内容渲染（复用 `shared/utils/markdown.ts`）
- 🔄 用户交互：拖拽/缩放（`popupEventHandler.ts`）、划词浮动操作栏（`selectionActionBar.ts`）、页内快捷键（`shortcutListener.ts`）
- 📄 网页正文提取（`pageExtractor.ts`）与划词段落上下文（`selectionContextExtractor.ts`）
- 💾 弹窗状态（仅内存，见 FAQ）

## 入口与启动

### 主入口文件
- **文件**: `index.ts`
- **启动方式**: `defineContentScript()` (WXT 框架)
- **匹配规则**: `<all_urls>` (所有网页)

### 初始化流程
```typescript
// entrypoints/content/index.ts
export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    // 1. 日志系统初始化
    void initializeLogger("content");

    // 2. 样式注入
    injectStyles();

    // 3. 管理器初始化
    const popupManager = new PopupManager();
    const selectionActionBar = new SelectionActionBar(popupManager);
    selectionActionBar.init();

    const messageHandler = new MessageHandler(popupManager);

    // 4. 消息监听器注册
    browser.runtime.onMessage.addListener(messageHandler.handleMessage);

    // 5. 网页内快捷键双通道监听器（返回清理函数）
    const cleanupShortcuts = initContentShortcuts(popupManager);

    // 6. 脚本失效时统一清理，避免残留监听器与 DOM
    ctx.onInvalidated(() => {
      cleanupShortcuts();
      selectionActionBar.destroy();
      popupManager.destroy();
      browser.runtime.onMessage.removeListener(messageHandler.handleMessage);
    });
  },
});
```

## 对外接口

### 消息处理接口
`MessageHandler` 只处理 4 个 action，外加一个显式忽略项（`messageHandler.ts:17-66`）：

```typescript
public handleMessage = (
  request: TranslationRequest,
  sender: any,
  sendResponse: (response?: any) => void
): boolean => {
  // background 会在自己上下文里处理诊断日志，content 明确不接管
  if (request.action === MESSAGE_TYPES.APPEND_DIAGNOSTIC_LOGS) {
    return false;
  }

  switch (request.action) {
    case MESSAGE_TYPES.SHOW_TRANSLATION_POPUP:
      this.handleShowTranslationPopup(request, sendResponse);
      return true;

    case MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION:
      return this.handleUpdateTranslation(request, sendResponse);

    case MESSAGE_TYPES.GET_SELECTED_TEXT:
      return this.handleGetSelectedText(request, sendResponse);

    case MESSAGE_TYPES.EXTRACT_PAGE_CONTENT:
      void this.handleExtractPageContent(request, sendResponse);
      return true;

    default:
      // 未识别的 action 会回一条失败响应，而不是静默忽略
      sendResponse({ success: false, error: "未知操作" });
      return true;
  }
};
```

### 弹窗管理接口
```typescript
// entrypoints/content/popupManager.ts
public showPopup(
  selection: string,
  requestId: string,
  allowLegacyMessages = false,
  selectionContext?: SelectionContext,
  deferTranslation = false,
  customPosition?: { left: number; top: number }
): HTMLElement

public updateTranslation(request: TranslationRequest): boolean
public removeCurrentPopup(): void
public destroy(): void
```

## 关键依赖与配置

### 内部依赖
- **消息常量与类型**: `MESSAGE_TYPES`、`TranslationRequest`、`PopupState`、`THEME_MODES`
  (`entrypoints/shared/constants/index.ts`)
- **日志系统**: `createLogger` / `contentLogger` / `initializeLogger` (`entrypoints/shared/logger`)
- **设置管理**: `SettingsUtils`（读取 `theme` / `fontScalePercent` / `contextualSelectionEnabled` /
  `thinkingEnabled`，并写回 `theme`、`fontScalePercent`）
- **Markdown 工具**: `parseMarkdown`、`initializeCodeCopy` (`shared/utils/markdown.ts`)
- **请求协议**: `createRequestId`、`shouldAcceptRequestUpdate` (`entrypoints/shared/requestProtocol.ts`)
- **字体缩放 / 主题**: `entrypoints/shared/fontScale.ts`、`entrypoints/shared/theme.ts`
- **三棱镜**（译文多视角）: `entrypoints/shared/prismParser.ts`、`prismTypes.ts`
- **划词上下文**: `entrypoints/shared/selectionContext.ts` + 本模块 `selectionContextExtractor.ts`

### 外部依赖
- **Chrome Extension API**: `runtime`（收发消息）、`storage.local`（`pendingSidepanelText` /
  `pendingWebPageRead`）。**本模块不使用 `browser.tabs`**
- **WXT 框架**: `defineContentScript`
- **DOM API**: document, window

### 配置项（弹窗几何的真实默认值）
代码中**没有** `DEFAULT_POPUP_CONFIG` 这样的常量对象，默认值分散在三处：

| 项目 | 值 | 依据 |
| --- | --- | --- |
| 默认宽度 | `400px`（`positionPopup` 局部变量） | `popupManager.ts:549` |
| 默认位置 | `left = innerWidth - 420`，`top = 20` | `popupManager.ts:547-548` |
| 恢复上次状态时 | `width` clamp 到 `300–1200`；`left` clamp 到 `[0, innerWidth-300]`；`top` clamp 到 `[0, innerHeight-100]` | `popupManager.ts:564-579` |
| 拖拽缩放宽度 | clamp 到 `300–1200` | `popupEventHandler.ts:165` |
| CSS 尺寸 | `min-width: 320px`、`width: 420px`、`max-height: 85vh`、`z-index: 10000` | `styles.tsx:7-31` |

## 数据模型

### 弹窗状态接口
```typescript
// entrypoints/shared/constants/index.ts:149-153
export interface PopupState {
  left: number | null;      // 弹窗左侧位置
  top: number | null;       // 弹窗顶部位置
  width: number | null;     // 弹窗宽度
}
```

### 翻译请求接口（节选）
完整定义在 `entrypoints/shared/constants/index.ts:158-175`，content 侧实际消费的字段：

```typescript
export interface TranslationRequest {
  action: MessageType;
  requestId?: string;               // 用于丢弃非当前请求的迟到更新
  text?: string;
  content?: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  done?: boolean;
  error?: string;
  selectionContext?: SelectionContext;
  deferTranslation?: boolean;       // 先显示上下文预览，等用户点「结合本段」再翻译
  expectedSelectedText?: string;
  includeSelectionContext?: boolean;
  resultSource?: TranslationResultSource;  // "jargon-vault" 时显示「来自生词本」
  bypassJargonVault?: boolean;
}
```

## 核心功能实现

### 1. 弹窗管理器 (PopupManager)
**特点**：
- 动态创建弹窗元素（`createPopupElement` 内联完整 HTML 结构）
- 定位 + 恢复上次位置/大小（`positionPopup`）
- 请求归属校验：`requestId` 不匹配或请求已结束的更新直接丢弃
- 译文走三棱镜解析（`parsePrismTranslation` → `renderTranslatedContent`），支持多 Tab 切换与「复制周报版」
- 命中生词本时显示「来自生词本」+「重新生成」入口
- 主题（跟随系统/浅色/深色）与字号由 `SettingsUtils` 驱动

**核心功能**：
```typescript
// popupManager.ts:137-205（节选）
public showPopup(selection, requestId, allowLegacyMessages = false,
                 selectionContext?, deferTranslation = false, customPosition?) {
  // 若已有未结束的弹窗请求，先精确清理旧请求
  const replacedRequestId = getReplacedPopupRequestId(
    Boolean(this.currentPopup), this.requestFinished, this.currentRequestId
  );
  if (replacedRequestId) {
    void browser.runtime.sendMessage({
      action: MESSAGE_TYPES.CLEANUP, requestId: replacedRequestId,
    });
  }

  this.removeCurrentPopup();                       // 清理旧弹窗
  const popup = this.createPopupElement(selection, normalizedContext, deferTranslation);
  document.body.appendChild(popup);
  initializeCodeCopy();
  this.positionPopup(popup, customPosition);
  this.setupEventHandlers(popup);
  this.setupScrollDetection(popup);
  return popup;
}

// popupManager.ts:208-285（节选）
public updateTranslation(request: TranslationRequest): boolean {
  if (!this.currentPopup) return false;
  if (this.requestFinished) return false;          // 已结束的请求不再接收迟到更新
  if (!shouldAcceptRequestUpdate(request.requestId, this.currentRequestId,
                                 this.allowLegacyMessages)) return false;
  // error 分支：先展示已收到的部分内容，再显示错误；done / error 后置 requestFinished = true
  // 正常分支：handleTranslationUpdate 更新译文、思维链、滚动位置
}
```

### 2. 消息处理器 (MessageHandler)
**特点**：
- 统一消息路由（只认 4 个 action，见上「对外接口」）
- `SHOW_TRANSLATION_POPUP` 只负责显示弹窗，**不再自己发起翻译**（旧文档里的
  「先发 CLEANUP、再发 TRANSLATE」流程已不存在）

**核心功能**：
```typescript
// content/messageHandler.ts:96-124
private handleShowTranslationPopup = (
  request: TranslationRequest,
  sendResponse: (response?: any) => void
): boolean => {
  if (!request.text) {
    sendResponse({ success: false, error: "缺少文本参数" });
    return true;
  }

  const displayRequestId = request.requestId || createRequestId();
  this.popupManager.showPopup(
    request.text,
    displayRequestId,
    !request.requestId,          // 旧后台不带 requestId 时才允许无 ID 更新
    request.selectionContext,
    request.deferTranslation === true
  );

  sendResponse({ success: true, requestId: request.requestId });
  return true;
};
```

`EXTRACT_PAGE_CONTENT` 走 `pageExtractor.extractPageData(document, window, { deepScan })`，
成功回 `{ success: true, data }`，失败回 `{ success: false, error }`（`messageHandler.ts:68-94`）。

### 3. 弹窗事件处理器 (PopupEventHandler)
**特点**：
- 拖拽（按住 `.translator-header` 移动，点击按钮/菜单/`[data-no-drag='true']` 不触发）
- 左右边缘 15px 内进入横向缩放
- 位置/大小变化后回调 `onStateChange`，由 `PopupManager` 存入内存
- 内置「复制译文」「复制原文」按钮行为与 1.5s 文案回馈

**核心功能**：
```typescript
// popupEventHandler.ts:27-33 / 165 / 183-193（节选）
constructor(
  private popup: HTMLElement,
  private onStateChange: (state: PopupState) => void
) { this.initializeEvents(); }

// 缩放：宽度限制在 300–1200，向左缩放时同步修正 left
newWidth = Math.min(Math.max(300, newWidth), 1200);

// 拖拽：直接跟随鼠标位移，**没有**视口边界钳制
private handleDrag(e: MouseEvent) {
  this.popup.style.left = `${this.initialX + (e.clientX - this.startX)}px`;
  this.popup.style.top = `${this.initialY + (e.clientY - this.startY)}px`;
}
```

### 4. 样式注入器 (styles.tsx)
**特点**：
- CSS 样式动态注入（id 为 `#translator-popup-style`）
- 主题切换：`applyPopupTheme(rootEl, mode, systemPrefersDark?)` 委托 `shared/theme.applyTheme`
- 样式隔离：`MARKDOWN_STYLES` 会被重写为 `.translator-popup` 作用域（`styles.tsx:536`）

**核心功能**：
```typescript
// styles.tsx:812-819
export function injectStyles() {
  if (!document.querySelector("#translator-popup-style")) {
    const style = document.createElement("style");
    style.id = "translator-popup-style";
    style.textContent = POPUP_STYLES;
    document.head.appendChild(style);
  }
}
```

### 5. 划词浮动操作栏 / 页内快捷键 / 正文提取
- `SelectionActionBar`（`selectionActionBar.ts:257`）：`init(targetDocument?, targetWindow?)`、
  `destroy()`；位置计算是纯函数 `calculateActionBarPosition`，默认尺寸 190×34、偏移 8、边缘留白 8
  （`selectionActionBar.ts:63-69`）
- `initContentShortcuts(popupManager)`（`shortcutListener.ts:68`）返回清理函数；页内快捷键为
  **Alt/Option+D**（翻译选中文本，`shortcutListener.ts:14`）与 **Alt/Option+S**（打开侧边栏，
  `shortcutListener.ts:27`），带 350ms 节流（`shortcutListener.ts:71`）
- `pageExtractor.ts`：`extractPageData` 返回 `ExtractedPageContent`
  `{ title, url, content, wordCount, excerpt, isLikelyVirtualList?, totalEstimatedScreens?,
  scrollDensity?, hasMoreContent? }`（`pageExtractor.ts:10-19`）

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）
- **ESLint / Prettier**: ⚠️ **项目未配置**，没有任何 lint / format 闸门
- **调试日志**: 自研 logger（`entrypoints/shared/logger`），支持 30 分钟诊断会话
- **内容安全**: 模型输出统一走 `shared/utils/markdown` 的 `sanitizeUrl` / `escapeAttribute`
  （`shared/utils/markdown.ts:1-13`、`281`、`290`、`299`）

### 测试覆盖
实测（2026-09-11 本地运行 `bun test tests/unit tests/contracts tests/integration tests/helpers`）：
**396 个用例 / 33 个文件，全部通过**。与本模块相关的测试文件：

- ✅ 浮动操作栏（`tests/integration/selectionActionBar.test.js`）
- ✅ 正文提取与 Shadow DOM（`tests/integration/pageExtractor.test.js`、`tests/unit/pageExtractorShadowDom.test.js`）
- ✅ 划词段落上下文（`tests/integration/selectionContext.test.js`）
- ✅ 页内快捷键与后台命令分派（`tests/integration/shortcutFix.test.js`）
- ✅ 内容侧字号生命周期（`tests/integration/contentFontScaleLifecycle.test.js`）
- ⚠️ `popupManager.ts`（1288 行，注入式浮窗核心）：2026-09-11 覆盖率实测**行覆盖 9.94% /
  函数覆盖 25.81%**，弹窗渲染与交互主体基本未被测试覆盖
- ⚠️ `content/messageHandler.ts`：行覆盖 52.67%（同一实测）
- ❌ 跨浏览器兼容性测试（待添加）

### ⚠️ 本模块内的 `markdown.ts` 是死代码
`entrypoints/content/markdown.ts`（369 行）在全仓库**没有任何引用方**（2026-09-11 再次确认），
且它是**未做转义的旧版本**（文件内不含 `escapeAttribute` / `sanitizeUrl`）。浮窗实际使用的是
`shared/utils/markdown.ts`（`popupManager.ts:24` 的 import 可证）。请勿引用前者；如需清理，
这是安全的删除目标。

## 常见问题 (FAQ)

### Q: 弹窗定位是如何实现的？
A: `positionPopup` 默认把弹窗放在右上角（`left = innerWidth - 420`、`top = 20`、宽 400px）。
如果内存里有上一次的位置/大小，则优先恢复，并把 `width` 限制在 300–1200、`left`/`top`
钳制在可视范围内；浮动操作栏触发时还会传入 `customPosition`（`top` 再下移 15px）。
拖拽过程中的位移**不做**边界钳制，边界保护只发生在初始定位阶段。

### Q: 如何处理页面样式冲突？
A: 样式集中在一个 `<style id="translator-popup-style">` 中，类名统一 `translator-` 前缀，
弹窗使用 `position: fixed` + `z-index: 10000`；引入的 Markdown 样式会被重写为
`.translator-popup` 作用域（`styles.tsx:536`）。

### Q: Markdown 渲染是如何实现的？
A: 使用 `shared/utils/markdown.ts` 自研解析器（`parseMarkdown`）支持代码块、表格、列表等，
`initializeCodeCopy()` 挂接代码复制；URL 与属性经 `sanitizeUrl` / `escapeAttribute` 处理。
三棱镜模式下先经 `parsePrismTranslation` 拆 Tab 再渲染。

### Q: 弹窗状态如何持久化？
A: **只存在内存里**（`PopupManager.lastPopupState`），并且只在同一次页面生命周期内、
下次创建弹窗时复用。**页面刷新或重新打开后位置与大小会丢失**——代码里没有任何
把弹窗几何写入 `storage` 的逻辑（本模块只往 `storage.local` 写 `pendingSidepanelText`
与 `pendingWebPageRead`）。

## 相关文件清单

### 核心文件
- `index.ts` - 主入口文件
- `popupManager.ts` - 弹窗管理器（1288 行）
- `messageHandler.ts` - 消息处理器
- `popupEventHandler.ts` - 弹窗拖拽/缩放/复制事件

### 交互与提取
- `selectionActionBar.ts` - 划词浮动操作栏
- `shortcutListener.ts` - 页内快捷键（Alt+D / Alt+S）
- `pageExtractor.ts` - 网页正文提取
- `selectionContextExtractor.ts` - 划词段落上下文提取

### 工具文件
- `styles.tsx` - 样式注入与主题
- `markdown.ts` - **死代码，未转义的旧解析器，勿引用**（见上）

### 样式文件
- 弹窗样式内嵌在 `styles.tsx` 的 `POPUP_STYLES`

## 变更记录 (Changelog)

### 2026-09-11 - 与源码对齐
- 🔧 初始化流程代码重写：旧版遗漏 `SelectionActionBar`、`initContentShortcuts`、
  `ctx.onInvalidated` 清理，现按 `index.ts` 实际代码替换
- 🔧 `MessageHandler` 消息表修正：真实只有 4 个 action + `APPEND_DIAGNOSTIC_LOGS` 返回 `false`；
  旧版写「default 返回 false」，实际是回 `{ success:false, error:"未知操作" }` 并返回 `true`
- 🔧 删除虚构的 `handleShowTranslationPopup` 实现（旧版会查 `.translator-popup`、发 `CLEANUP`、
  再发 `TRANSLATE`）——真实实现只调用 `popupManager.showPopup`
- 🔧 `showPopup` / `updateTranslation` 签名按源码修正（新增 `requestId`、`deferTranslation`、
  `customPosition`、`destroy`）
- 🔧 删除不存在的 `DEFAULT_POPUP_CONFIG`，改为真实几何默认值表（含 `popupManager.ts` /
  `popupEventHandler.ts` / `styles.tsx` 行号依据）
- 🔧 `injectStyles` 的选择器 id 由 `#translator-popup-styles` 更正为 `#translator-popup-style`
- 🔧 拖拽/缩放描述修正：旧版写了视口边界钳制逻辑，真实拖拽不钳制；缩放上限 300–1200
- 🔧 FAQ「页面刷新后恢复上次状态」不实：弹窗几何只在内存中，刷新即丢失
- 🔧 外部依赖去掉 `tabs`（本模块不使用），补上 `storage.local`
- ➕ 补充 `TranslationRequest` 的 content 侧实际字段；文件清单补齐 4 个缺失文件
- ➕ 标注覆盖率实测数据与测试规模（396 用例 / 33 文件），并声明非覆盖率承诺

### 2026-09-10 - 文档纠错
- 🔧 移除 ESLint 质量声明（项目未配置 ESLint）
- 🔧 「弹窗创建和销毁测试 ✅」等结论无依据：`popupManager.ts` 行覆盖仅约 10%，
  改为按实际测试文件列示
- ➕ 标注 `content/markdown.ts` 为**死代码且未转义**，避免被误引用

### 2025-09-24 05:32 - 模块文档初始化
- ⚠️ 初版「覆盖率 100% (5/5 文件)」「缺口：无」与实际不符，已于 2026-09-10 移除
