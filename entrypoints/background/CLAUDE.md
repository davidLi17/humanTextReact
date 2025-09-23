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
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  model: "kimi-k2-250905",
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
- **TypeScript 严格模式**: 完整的类型检查
- **ESLint**: 代码风格检查
- **调试日志**: 详细的日志记录系统
- **错误边界**: 完善的错误处理

### 测试覆盖
- ✅ API 连接测试
- ✅ 消息路由测试
- ✅ 历史记录管理测试
- ✅ 设置管理测试
- ❌ 单元测试（待添加）

## 常见问题 (FAQ)

### Q: 翻译请求失败如何处理？
A: TranslationService 内置了完善的错误处理机制，会根据错误类型进行分类处理：
- 网络错误：自动重试
- API 错误：返回详细错误信息
- 用户取消：清理请求并记录

### Q: 如何管理并发翻译请求？
A: 使用 RequestManager 管理请求生命周期，每个标签页同时只能有一个翻译请求，新的请求会自动取消旧的请求。

### Q: 历史记录如何同步？
A: 通过 Chrome Storage API 同时保存到本地和云端，支持跨设备同步。

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

### 2025-09-24 05:32 - 模块文档初始化
- ✅ 完成背景模块全面分析
- ✅ 文档化所有核心服务类
- ✅ 建立接口和数据模型
- ✅ 提供常见问题解答
- 📊 **覆盖率**: 100% (12/12 文件)
- 📋 **缺口**: 无
- 🔄 **下次建议**: 添加单元测试覆盖