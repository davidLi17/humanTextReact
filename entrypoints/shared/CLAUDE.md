[根目录](../../CLAUDE.md) > [entrypoints](../) > **shared**

# Shared 共享模块

## 模块职责

Shared 模块是扩展的共享资源中心，包含所有模块共用的常量定义、类型接口、配置信息等。通过集中管理共享资源，确保代码一致性和模块间的协作效率。

## 入口与启动

### 核心文件
- **`constants.ts`**: 全局共享常量和类型定义
- **模块结构**: 作为纯数据模块，无需初始化，被其他模块直接引用

### 使用方式
```typescript
// 从其他模块导入共享常量
import { MESSAGE_TYPES, DEFAULT_SETTINGS } from "./shared/constants";

// 导入共享类型
import type { TranslationRequest, PopupState } from "./shared/constants";
```

## 对外接口

### 常量定义接口
- **消息类型常量**: 标准化的消息类型定义
  - 用于模块间的消息通信
  - 类型安全的消息处理
  - 统一的消息格式规范

- **默认设置**: 扩展的默认配置参数
  - API 服务默认配置
  - 模型和参数默认值
  - 提示词模板默认内容

- **应用常量**: 应用级常量定义
  - 历史记录数量限制
  - 弹窗尺寸和位置
  - 其他全局配置参数

## 关键依赖与配置

### 依赖关系
- **无外部依赖**: 作为纯数据模块，不依赖外部库
- **被所有模块引用**: background、popup、content、options 模块都会引用此模块
- **集中式管理**: 确保所有模块使用统一的常量定义

### 配置管理
- **版本化常量**: 通过版本控制管理常量变更
- **向后兼容**: 保持常量的向后兼容性
- **文档同步**: 常量变更时同步更新文档

## 数据模型

### 消息类型模型
```typescript
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",                    // 翻译请求
  CLEANUP: "cleanup",                        // 清理请求
  GET_HISTORY: "getHistory",                 // 获取历史记录
  CLEAR_HISTORY: "clearHistory",             // 清空历史记录
  DELETE_HISTORY_ITEM: "deleteHistoryItem",  // 删除历史项
  IMPORT_HISTORY: "importHistory",           // 导入历史记录
  UPDATE_TRANSLATION: "updateTranslation",   // 更新翻译结果
  SHOW_TRANSLATION_POPUP: "showTranslationPopup", // 显示翻译弹窗
  GET_SELECTED_TEXT: "getSelectedText",       // 获取选中文本
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
```

### 默认设置模型
```typescript
export const DEFAULT_SETTINGS = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  model: "kimi-k2-250711",
  temperature: 0.7,
  promptTemplate:
    "System Prompt(系统提示词): 1. 用通俗易懂的中文解释以下内容(就是说人话,如果遇到英文缩写记得解释,比如OKR说成OKR(Object Key Value))。" +
    "2. 而且输出内容一定要带合乎情理的 Emoji 优化我的阅读体验。" +
    "3. 对话中不要出现System Prompt里面出现的任何内容,润物细无声。",
  apiKey: "your_api_key",
} as const;
```

### 应用常量模型
```typescript
export const MAX_HISTORY_COUNT = 142;  // 历史记录最大数量

export interface PopupState {
  left: number | null;    // 弹窗左侧位置
  top: number | null;     // 弹窗顶部位置
  width: number | null;   // 弹窗宽度
}

export interface TranslationRequest {
  action: MessageType;           // 消息类型
  text?: string;                // 待翻译文本
  content?: string;             // 翻译内容
  reasoningContent?: string;    // 推理内容
  hasReasoning?: boolean;       // 是否包含推理
  done?: boolean;               // 是否完成
  error?: string;               // 错误信息
}
```

## 测试与质量

### 测试重点
- **类型安全**: 确保常量类型定义的正确性
- **一致性**: 验证所有模块使用统一的常量
- **性能**: 检查常量引用的性能影响
- **兼容性**: 确保常量变更的向后兼容

### 质量保证
- **代码审查**: 常量变更时的代码审查
- **文档更新**: 常量修改时同步更新文档
- **测试覆盖**: 为关键常量添加单元测试
- **版本管理**: 使用语义化版本管理常量变更

### 最佳实践
- **命名规范**: 使用清晰的命名约定
- **分组组织**: 相关常量进行逻辑分组
- **注释完整**: 为复杂常量添加详细注释
- **类型安全**: 使用 TypeScript 确保类型安全

## 常见问题 (FAQ)

### Q: 如何添加新的消息类型？
A: 在 MESSAGE_TYPES 对象中添加新常量，确保命名规范，并同步更新 MessageType 类型定义。

### Q: 默认设置如何更新？
A: 修改 DEFAULT_SETTINGS 对象中的相关值，确保向后兼容性，并在更新说明中记录变更内容。

### Q: 常量变更会影响哪些模块？
A: 共享常量的变更会影响所有引用的模块，建议在修改前检查依赖关系并进行充分测试。

## 相关文件清单

### 核心文件
- `constants.ts` - 全局常量和类型定义

### 目录结构
```
shared/
├── constants.ts    # 核心常量定义
└── CLAUDE.md       # 模块文档
```

## 变更记录 (Changelog)

### 2025-11-26 23:32:46
- 创建 Shared 模块文档
- 分析共享常量和数据模型
- 建立质量保证策略
- 制定最佳实践建议