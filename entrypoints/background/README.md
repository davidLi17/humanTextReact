# Background Script 架构说明

本背景脚本已按照单一职责原则进行了模块化重构，将原本的单一文件拆分为多个专门的模块。

## 架构图

```
background.ts (主入口)
├── constants.ts (常量定义)
├── settingsManager.ts (设置管理)
├── shortcutManager.ts (快捷键管理)
├── contextMenuManager.ts (右键菜单管理)
├── requestManager.ts (请求生命周期管理)
├── historyManager.ts (历史记录管理)
├── apiService.ts (API交互服务)
├── messageUtils.ts (消息发送工具)
├── translationService.ts (翻译核心服务)
├── messageHandler.ts (消息路由处理)
├── contextMenuHandler.ts (右键菜单事件处理)
└── index.ts (统一导出)
```

## 模块说明

### constants.ts

- **职责**: 定义所有常量
- **包含**: 消息类型、默认设置、历史记录最大条数等
- **优势**: 集中管理常量，便于维护和修改

### settingsManager.ts

- **职责**: 管理扩展设置
- **功能**: 获取云端/本地设置，设置回退机制
- **优势**: 统一设置管理逻辑，支持云端同步

### shortcutManager.ts

- **职责**: 管理快捷键功能
- **功能**: 保存快捷键信息，执行快捷键翻译
- **优势**: 独立的快捷键逻辑，易于扩展

### contextMenuManager.ts

- **职责**: 管理右键菜单
- **功能**: 创建和管理右键菜单项
- **优势**: 分离菜单管理逻辑

### requestManager.ts

- **职责**: 管理请求生命周期
- **功能**: 创建、清理、中止翻译请求
- **优势**: 统一请求管理，防止内存泄漏

### historyManager.ts

- **职责**: 管理翻译历史记录
- **功能**: 保存、获取、删除、清空、导入历史记录
- **优势**: 完整的历史记录 CRUD 操作

### apiService.ts

- **职责**: 处理 API 交互
- **功能**: API 连接测试，错误处理
- **优势**: 独立的 API 服务层

### messageUtils.ts

- **职责**: 消息发送工具
- **功能**: 安全发送消息到标签页和运行时
- **优势**: 统一消息发送逻辑，错误处理

### translationService.ts

- **职责**: 翻译核心服务
- **功能**: 执行翻译，流式响应处理，历史记录保存
- **优势**: 核心翻译逻辑，支持流式响应

### messageHandler.ts

- **职责**: 消息路由处理
- **功能**: 处理来自各组件的消息
- **优势**: 统一消息处理入口

### contextMenuHandler.ts

- **职责**: 右键菜单事件处理
- **功能**: 处理右键菜单点击事件
- **优势**: 分离事件处理逻辑

## 重构优势

1. **可维护性**: 每个模块职责单一，修改影响范围小
2. **可测试性**: 模块独立，便于单元测试
3. **可扩展性**: 新功能可以独立模块形式添加
4. **代码复用**: 模块可以在其他地方复用
5. **错误隔离**: 问题定位更精确
6. **团队协作**: 不同开发者可以并行开发不同模块

## 使用方式

```typescript
// 在 background.ts 中使用
import { ShortcutManager } from "./background/shortcutManager";
import { ContextMenuManager } from "./background/contextMenuManager";

// 或者使用统一导出
import {
  ShortcutManager,
  ContextMenuManager,
  TranslationService,
} from "./background";
```

## 类型定义

所有必要的类型定义都包含在相应的模块中，如 `HistoryItem` 接口定义在 `historyManager.ts` 中。
