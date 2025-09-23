[根目录](../../CLAUDE.md) > [entrypoints](../) > **content**

# Content 模块 - 内容脚本层

## 模块职责

Content 模块是人话翻译器的页面注入层，负责在网页中创建和管理翻译弹窗，处理用户交互，并与后台服务进行通信。该模块通过 Content Script 注入到所有网页中。

**核心职责**：
- 🖱️ 页面翻译弹窗的创建和管理
- 📨 消息接收和处理
- 🎨 弹窗样式注入和定位
- 📝 Markdown 内容渲染
- 🔄 用户交互事件处理
- 💾 弹窗状态持久化

## 入口与启动

### 主入口文件
- **文件**: `index.ts`
- **启动方式**: `defineContentScript()` (WXT 框架)
- **匹配规则**: `<all_urls>` (所有网页)

### 初始化流程
```typescript
export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // 1. 日志系统初始化
    initializeLogger();

    // 2. 样式注入
    injectStyles();

    // 3. 管理器初始化
    const popupManager = new PopupManager();
    const messageHandler = new MessageHandler(popupManager);

    // 4. 消息监听器注册
    browser.runtime.onMessage.addListener(messageHandler.handleMessage);
  },
});
```

## 对外接口

### 消息处理接口
```typescript
// 消息处理器接口
export class MessageHandler {
  public handleMessage = (
    request: TranslationRequest,
    sender: any,
    sendResponse: (response?: any) => void
  ): boolean => {
    switch (request.action) {
      case MESSAGE_TYPES.SHOW_TRANSLATION_POPUP:
        return this.handleShowTranslationPopup(request, sendResponse);
      case MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION:
        return this.handleUpdateTranslation(request, sendResponse);
      case MESSAGE_TYPES.GET_SELECTED_TEXT:
        return this.handleGetSelectedText(sendResponse);
      default:
        return false;
    }
  };
}
```

### 弹窗管理接口
```typescript
export class PopupManager {
  public showPopup(selection: string): HTMLElement
  public updateTranslation(request: TranslationRequest): boolean
  public removeCurrentPopup(): void
}
```

## 关键依赖与配置

### 内部依赖
- **消息常量**: `MESSAGE_TYPES` (shared/constants/index.ts)
- **日志系统**: `Logger` (shared/logger/index.ts)
- **Markdown 工具**: `parseMarkdown`, `initializeCodeCopy` (shared/utils/markdown.ts)

### 外部依赖
- **Chrome Extension API**: runtime, tabs
- **WXT 框架**: defineContentScript
- **DOM API**: document, window

### 配置项
```typescript
// 弹窗默认配置
const DEFAULT_POPUP_CONFIG = {
  width: 400,
  minHeight: 200,
  maxHeight: 600,
  margin: 20,
  zIndex: 999999
};
```

## 数据模型

### 弹窗状态接口
```typescript
export interface PopupState {
  left: number | null;      // 弹窗左侧位置
  top: number | null;       // 弹窗顶部位置
  width: number | null;     // 弹窗宽度
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

### 1. 弹窗管理器 (PopupManager)
**特点**：
- 动态创建弹窗元素
- 智能定位算法
- 状态持久化
- 事件处理集成

**核心功能**：
```typescript
// 显示弹窗
public showPopup(selection: string): HTMLElement {
  // 清理旧弹窗
  this.removeCurrentPopup();

  // 创建新弹窗
  const popup = this.createPopupElement(selection);
  this.currentPopup = popup;

  // 添加到页面
  document.body.appendChild(popup);

  // 初始化功能
  initializeCodeCopy();
  this.positionPopup(popup);
  this.setupEventHandlers(popup);
  this.setupScrollDetection(popup);

  return popup;
}

// 更新翻译内容
public updateTranslation(request: TranslationRequest): boolean {
  if (!this.currentPopup) return false;

  const elements = this.getPopupElements();
  if (!elements.translatedTextEl || !elements.reasoningTextEl) return false;

  // 更新译文内容
  if (request.content) {
    elements.translatedTextEl.innerHTML = parseMarkdown(request.content);
  }

  // 更新思维链内容
  if (request.hasReasoning && request.reasoningContent) {
    elements.reasoningSectionEl.style.display = "block";
    elements.reasoningTextEl.innerHTML = parseMarkdown(request.reasoningContent);
  }

  return true;
}
```

### 2. 消息处理器 (MessageHandler)
**特点**：
- 统一消息路由
- 异步处理支持
- 错误处理机制
- 设置同步集成

**核心功能**：
```typescript
// 处理显示弹窗消息
private async handleShowTranslationPopup(
  request: TranslationRequest,
  sendResponse: (response?: any) => void
): Promise<boolean> {
  if (!request.text) {
    sendResponse({ success: false, error: "缺少文本参数" });
    return true;
  }

  // 获取用户设置
  const userSettings = await SettingsUtils.getSettings();

  // 清理旧弹窗并显示新弹窗
  const oldPopup = document.querySelector(".translator-popup");
  if (oldPopup) {
    browser.runtime.sendMessage({ action: MESSAGE_TYPES.CLEANUP }, () => {
      oldPopup.remove();
      this.popupManager.showPopup(request.text!);
      // 发送翻译请求
      browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        text: request.text,
        thinkingEnabled: userSettings.thinkingEnabled,
        // ... 其他参数
      });
    });
  }

  sendResponse({ success: true });
  return true;
}
```

### 3. 弹窗事件处理器 (PopupEventHandler)
**特点**：
- 拖拽功能支持
- 大小调整功能
- 位置记忆功能
- 边界检测

**核心功能**：
```typescript
// 拖拽功能
private setupDragEvents(popup: HTMLElement, onStateChange: (state: PopupState) => void) {
  const header = popup.querySelector('.translator-header') as HTMLElement;
  let isDragging = false;
  let startX: number, startY: number;
  let startLeft: number, startTop: number;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(popup.style.left);
    startTop = parseInt(popup.style.top);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const newLeft = startLeft + e.clientX - startX;
    const newTop = startTop + e.clientY - startY;

    // 边界检测
    const maxLeft = window.innerWidth - popup.offsetWidth;
    const maxTop = window.innerHeight - popup.offsetHeight;

    popup.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
    popup.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      onStateChange({
        left: parseInt(popup.style.left),
        top: parseInt(popup.style.top),
        width: parseInt(popup.style.width)
      });
    }
  });
}
```

### 4. 样式注入器 (Styles)
**特点**：
- CSS 样式动态注入
- 响应式设计支持
- 主题切换支持
- 样式隔离

**核心功能**：
```typescript
export function injectStyles() {
  if (document.querySelector('#translator-popup-styles')) return;

  const style = document.createElement('style');
  style.id = 'translator-popup-styles';
  style.textContent = POPUP_STYLES;
  document.head.appendChild(style);
}
```

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: 完整的类型检查
- **ESLint**: 代码风格检查
- **调试日志**: 详细的日志记录
- **错误边界**: 完善的错误处理

### 测试覆盖
- ✅ 弹窗创建和销毁测试
- ✅ 消息处理测试
- ✅ 样式注入测试
- ✅ 事件处理测试
- ❌ 跨浏览器兼容性测试（待添加）

## 常见问题 (FAQ)

### Q: 弹窗定位是如何实现的？
A: 使用智能定位算法，默认显示在页面右上角，同时考虑页面滚动和弹窗大小，确保弹窗始终在可视区域内。

### Q: 如何处理页面样式冲突？
A: 使用 CSS 隔离技术，为弹窗元素添加特定的类名前缀，并通过高优先级选择器避免样式冲突。

### Q: Markdown 渲染是如何实现的？
A: 使用自定义的 Markdown 解析器，支持代码块、表格、列表等富文本格式，并集成代码高亮和复制功能。

### Q: 弹窗状态如何持久化？
A: 将弹窗的位置和大小信息保存在内存中，页面刷新后重新创建弹窗时会恢复上次的状态。

## 相关文件清单

### 核心文件
- `index.ts` - 主入口文件
- `popupManager.ts` - 弹窗管理器
- `messageHandler.ts` - 消息处理器
- `popupEventHandler.ts` - 弹窗事件处理器

### 工具文件
- `styles.tsx` - 样式注入工具
- `markdown.ts` - Markdown 处理工具

### 样式文件
- 弹窗样式内嵌在 `popupManager.ts` 中

## 变更记录 (Changelog)

### 2025-09-24 05:32 - 模块文档初始化
- ✅ 完成内容模块全面分析
- ✅ 文档化所有核心组件
- ✅ 建立接口和数据模型
- ✅ 提供常见问题解答
- 📊 **覆盖率**: 100% (5/5 文件)
- 📋 **缺口**: 无
- 🔄 **下次建议**: 添加跨浏览器兼容性测试