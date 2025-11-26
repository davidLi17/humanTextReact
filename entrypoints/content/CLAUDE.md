[根目录](../../CLAUDE.md) > [entrypoints](../) > **content**

# Content Script 模块

## 模块职责

Content Script 模块负责在网页中注入翻译功能，处理页面交互、显示翻译弹窗、注入样式，以及与 background script 进行通信。作为扩展与网页交互的桥梁，提供右键菜单翻译的页面级支持。

## 入口与启动

### 主入口文件
- **`index.ts`**: Content Script 主入口，初始化所有功能模块
- **启动流程**:
  1. 注入样式到目标页面
  2. 初始化弹窗管理器
  3. 设置消息处理器
  4. 注册页面事件监听器

### 模块初始化
```typescript
export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // 1. 注入样式
    injectStyles();

    // 2. 初始化管理器
    const popupManager = new PopupManager();
    const messageHandler = new MessageHandler(popupManager);

    // 3. 注册消息监听器
    browser.runtime.onMessage.addListener(messageHandler.handleMessage);
  },
});
```

## 对外接口

### 核心组件接口
- **PopupManager**: 翻译弹窗管理器
  - 创建和显示翻译弹窗
  - 处理弹窗的定位和显示逻辑
  - 管理弹窗的生命周期

- **MessageHandler**: 消息处理器
  - 接收来自 background script 的消息
  - 处理翻译结果显示
  - 协调弹窗更新和样式处理

- **StyleInjector**: 样式注入器
  - 将扩展样式注入到目标页面
  - 确保样式隔离和页面兼容性

### 消息通信接口
```typescript
interface ContentMessage {
  action: string;
  text?: string;              // 选中的文本
  translatedText?: string;     // 翻译结果
  reasoningText?: string;      // 推理过程
  position?: {                // 弹窗位置
    x: number;
    y: number;
  };
}
```

## 关键依赖与配置

### 内部依赖
- **共享常量**: `../shared/constants`
  - 消息类型定义
  - 样式常量引用

### WXT 框架支持
- **defineContentScript**: WXT 提供的 Content Script 定义
- **浏览器兼容性**: 支持 Chrome 和 Firefox 平台
- **权限管理**: 在所有 URL 上运行（`<all_urls>`）

### 样式处理
- **CSS 注入**: 动态注入样式到目标页面
- **样式隔离**: 避免与页面样式冲突
- **响应式设计**: 适配不同屏幕尺寸

## 数据模型

### 弹窗状态模型
```typescript
interface PopupState {
  isVisible: boolean;         // 弹窗是否可见
  position: {                 // 弹窗位置
    x: number;
    y: number;
  };
  content: {                  // 弹窗内容
    original: string;         // 原始文本
    translated: string;       // 翻译结果
    reasoning?: string;       // 推理过程
  };
  isLoading: boolean;         // 是否正在加载
}
``### 位置计算模型
```typescript
interface PositionConfig {
  selection: Selection;        // 文本选择对象
  viewport: {                 // 视口信息
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  };
  popupSize: {                // 弹窗尺寸
    width: number;
    height: number;
  };
}
```

### 样式定义模型
```typescript
interface StyleConfig {
  popupStyles: string;        // 弹窗样式定义
  animationStyles: string;    // 动画效果样式
  responsiveStyles: string;   // 响应式样式
  themeStyles: string;        // 主题相关样式
}
```

## 测试与质量

### 测试重点
- **弹窗定位**: 不同页面环境下的弹窗位置计算
- **样式隔离**: 确保扩展样式不影响原页面
- **消息通信**: 与 background script 的可靠通信
- **浏览器兼容**: Chrome 和 Firefox 平台兼容性

### 性能优化
- **按需加载**: 只在用户触发翻译时加载相关资源
- **事件管理**: 避免页面上的事件冲突和内存泄漏
- **样式优化**: CSS 选择器优化，减少重排和重绘

### 用户体验
- **智能定位**: 弹窗自动定位到合适位置，避免遮挡重要内容
- **响应式设计**: 适配移动设备和不同分辨率屏幕
- **动画效果**: 流畅的显示/隐藏动画
- **键盘支持**: ESC 键关闭弹窗等键盘快捷键

## 常见问题 (FAQ)

### Q: Content Script 如何避免与页面脚本冲突？
A: 使用隔离的作用域和命名空间，避免全局变量污染，通过消息传递与页面交互。

### Q: 弹窗定位如何处理复杂页面布局？
A: PopupManager 会计算视口尺寸、滚动位置和选择区域，智能选择最佳的显示位置。

### Q: 如何处理页面样式对弹窗的影响？
A: 通过 CSS 隔离技术（如 Shadow DOM 或特定选择器）确保弹窗样式不受页面样式影响。

### Q: 在特殊页面（如 chrome:// 页面）中如何工作？
A: Content Script 会在 manifest 的权限范围内运行，对于受限制的页面会自动跳过或降级处理。

## 相关文件清单

### 核心文件
- `index.ts` - Content Script 主入口
- `popupManager.ts` - 弹窗管理器
- `messageHandler.ts` - 消息处理器
- `styles.tsx` - 样式处理和注入

### 工具文件
- `markdown.ts` - Markdown 渲染支持（如需要）
- `popupEventHandler.ts` - 弹窗事件处理

### 样式资源
- 注入的 CSS 样式定义（内联在 styles.tsx 中）

## 变更记录 (Changelog)

### 2025-11-26 23:32:46
- 创建 Content Script 模块文档
- 分析模块架构和核心功能
- 识别样式隔离和定位策略
- 建立测试重点和性能建议