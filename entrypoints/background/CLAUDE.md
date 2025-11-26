[根目录](../../CLAUDE.md) > [entrypoints](../) > **background**

# Background Script 模块

## 模块职责

Background Script 是扩展的核心后台服务，负责处理翻译的核心逻辑、API 调用、消息路由、历史管理等功能。作为整个扩展的中央控制器，协调其他模块的工作。

## 入口与启动

### 主入口文件
- **`index.ts`**: Background Script 主入口，初始化各个管理器和服务
- **启动流程**:
  1. 注册扩展安装事件监听器
  2. 初始化右键菜单和快捷键
  3. 设置消息路由处理器
  4. 监听标签页生命周期事件

### 核心组件导出
```typescript
// 核心服务
export { TranslationService } from "./translationService";
export { ApiService } from "./apiService";

// 管理器类
export { SettingsManager } from "./settingsManager";
export { HistoryManager } from "./historyManager";
export { RequestManager } from "./requestManager";
export { ContextMenuManager } from "./contextMenuManager";
export { ShortcutManager } from "./shortcutManager";

// 消息处理
export { MessageHandler } from "./messageHandler";
export { MessageUtils } from "./messageUtils";
```

## 对外接口

### 核心服务接口
- **TranslationService**: 处理文本翻译的核心逻辑
  - `translateText(text: string, tabId?: number): Promise<string | void>`
  - 支持流式响应和思维链模式
  - 集成错误处理和请求管理

- **ApiService**: API 请求封装
  - 处理 HTTP 请求和响应
  - 支持多种 AI 模型配置
  - 网络错误处理和重试机制

### 管理器接口
- **SettingsManager**: 配置管理
  - 云端/本地同步设置
  - 支持多种配置参数
  - 配置验证和默认值处理

- **HistoryManager**: 历史记录管理
  - 翻译历史保存和检索
  - 支持搜索、删除、导入导出
  - 历史记录数量限制管理

- **RequestManager**: 请求生命周期管理
  - 创建和中止翻译请求
  - 标签页关闭时的资源清理
  - 并发请求控制

### 消息通信接口
- **MessageHandler**: 消息路由中心
  - 处理来自 popup、content script 的消息
  - 消息类型验证和错误处理
  - 异步消息响应机制

- **MessageUtils**: 消息发送工具
  - 安全的消息发送机制
  - 错误处理和超时控制
  - 支持不同目标的消息发送

## 关键依赖与配置

### 内部依赖
- **共享常量**: `../shared/constants`
  - 消息类型定义
  - 默认设置配置
  - 类型接口定义

### 外部 API
- **AI 服务**: DeepSeek API / 自定义兼容接口
  - 支持流式响应模式
  - 兼容 OpenAI 格式
  - 错误处理和重试机制

### 配置参数
```typescript
interface TranslationConfig {
  baseUrl: string;          // API 基础 URL
  apiKey: string;           // API 密钥
  model: string;             // AI 模型名称
  temperature: number;       // 温度参数
  promptTemplate: string;   // 提示词模板
}
```

## 数据模型

### 翻译请求模型
```typescript
interface TranslationRequest {
  text: string;             // 待翻译文本
  source: string;           // 请求来源（popup/contextMenu）
  tabId?: number;           // 标签页 ID
  settings: TranslationConfig; // 翻译配置
}
```

### 历史记录模型
```typescript
interface HistoryItem {
  id: string;               // 唯一标识
  original: string;          // 原始文本
  translated: string;       // 翻译结果
  reasoning?: string;        // 推理过程
  timestamp: number;        // 时间戳
  hasReasoning: boolean;    // 是否包含推理
}
```

### 消息类型模型
```typescript
enum MESSAGE_TYPES {
  TRANSLATE = "translate",
  CLEANUP = "cleanup",
  GET_HISTORY = "getHistory",
  UPDATE_TRANSLATION = "updateTranslation",
  // ... 其他消息类型
}
```

## 测试与质量

### 测试重点
- **TranslationService**: 翻译逻辑和流式响应处理
- **MessageHandler**: 消息路由和错误处理
- **HistoryManager**: 数据持久化和搜索功能
- **SettingsManager**: 配置同步和验证

### 错误处理策略
- **网络错误**: 自动重试机制
- **API 错误**: 用户友好的错误提示
- **权限错误**: 引导用户进行配置
- **资源错误**: 优雅降级处理

### 性能优化
- **请求管理**: 避免重复翻译请求
- **内存管理**: 及时清理完成的请求
- **缓存策略**: 智能缓存翻译结果

## 常见问题 (FAQ)

### Q: 翻译请求中断如何处理？
A: RequestManager 会自动中止相关请求，并在控制台记录中断信息。用户可以重新发起翻译请求。

### Q: 多标签页同时翻译如何管理？
A: 每个翻译请求都会绑定到特定的标签页 ID，使用 RequestManager 进行生命周期管理，标签页关闭时自动清理资源。

### Q: 设置同步失败如何处理？
A: SettingsManager 采用了双重存储策略，优先使用云端设置，失败时自动降级到本地存储，确保功能可用性。

## 相关文件清单

### 核心服务
- `index.ts` - 主入口和初始化
- `translationService.ts` - 翻译核心逻辑
- `apiService.ts` - API 请求封装

### 管理器
- `settingsManager.ts` - 配置管理
- `historyManager.ts` - 历史记录管理
- `requestManager.ts` - 请求生命周期管理
- `contextMenuManager.ts` - 右键菜单管理
- `shortcutManager.ts` - 快捷键管理

### 消息处理
- `messageHandler.ts` - 消息路由中心
- `messageUtils.ts` - 消息发送工具
- `contextMenuHandler.ts` - 菜单事件处理

### 常量
- `constants.ts` - 本地常量定义

## 变更记录 (Changelog)

### 2025-11-26 23:32:46
- 创建 Background 模块文档
- 分析模块职责和接口
- 识别核心服务和数据模型
- 建立测试策略和质量指引