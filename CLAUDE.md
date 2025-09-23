# 人话翻译器项目 (Human Text Translator)

## 项目概述

**人话翻译器**是一个基于 React + WXT 框架开发的 Chrome 扩展程序，旨在借助 AI 的力量将专业术语翻译成通俗易懂的"人话"。该扩展支持多种使用方式，包括右键菜单翻译、快捷键操作、弹窗界面翻译，并具备流式响应、思维链模式、历史管理等先进功能。

**基本信息**：
- **技术栈**: React 19 + TypeScript + WXT 0.20.6 + Vite
- **扩展类型**: Chrome Extension MV3
- **版本**: 1.3.0
- **开发时间**: 2025年9月

## 系统架构

```mermaid
graph TB
    A[用户界面层] --> B[核心服务层]
    A --> C[内容脚本层]
    B --> D[共享工具层]
    C --> D

    subgraph "用户界面层"
        A1[弹窗界面<br/>Popup]
        A2[设置页面<br/>Options]
        A3[右键菜单<br/>Context Menu]
    end

    subgraph "核心服务层"
        B1[翻译服务<br/>TranslationService]
        B2[API服务<br/>ApiService]
        B3[消息处理<br/>MessageHandler]
        B4[历史管理<br/>HistoryManager]
        B5[设置管理<br/>SettingsManager]
    end

    subgraph "内容脚本层"
        C1[页面注入<br/>Content Script]
        C2[弹窗管理<br/>PopupManager]
        C3[事件处理<br/>EventHandler]
    end

    subgraph "共享工具层"
        D1[通用日志系统<br/>UniversalLogger]
        D2[共享常量<br/>Constants]
        D3[工具函数<br/>Utils]
    end
```

## 模块结构

### 核心模块 (Core Module)
- **路径**: `entrypoints/background/`
- **职责**: 翻译核心逻辑、API 请求、消息路由
- **入口**: `index.ts`

### UI 模块 (UI Module)
- **路径**: `entrypoints/popup/`
- **职责**: 用户界面组件、交互逻辑
- **入口**: `App.tsx`

### 内容脚本模块 (Content Module)
- **路径**: `entrypoints/content/`
- **职责**: 页面注入、弹窗管理、事件处理
- **入口**: `index.ts`

### 设置模块 (Settings Module)
- **路径**: `entrypoints/options/`
- **职责**: 配置管理、用户设置
- **入口**: `Options.tsx`

### 共享模块 (Shared Module)
- **路径**: `entrypoints/shared/`, `shared/`, `common/`
- **职责**: 共享工具、日志系统、常量定义

## 技术栈详情

### 前端技术
- **React 19** - 用户界面框架
- **TypeScript** - 类型安全
- **Less** - CSS 预处理器
- **Vite** - 构建工具

### 扩展开发
- **WXT 0.20.6** - 浏览器扩展开发框架
- **Chrome Extension MV3** - 扩展标准
- **WebExtensions API** - 跨浏览器 API

### 核心依赖
- **Fuse.js** - 模糊搜索
- **dayjs** - 日期处理
- **lodash-es** - 工具函数
- **@icon-park/react** - 图标库
- **debug** - 调试工具

## 核心功能

### 1. AI 翻译能力
- ✅ 支持多种 AI 模型
- ✅ 流式响应显示
- ✅ 思维链推理模式
- ✅ 自定义提示词模板
- ✅ 图片上传翻译

### 2. 用户交互方式
- ✅ 右键菜单翻译
- ✅ 快捷键操作 (Alt+H)
- ✅ 弹窗界面翻译
- ✅ 文本选择翻译

### 3. 数据管理
- ✅ 历史记录管理
- ✅ 智能搜索功能
- ✅ 数据导入/导出
- ✅ 本地存储同步

## 项目规范

### 代码风格
- **TypeScript 严格模式**：启用所有严格检查
- **React Hooks 规范**：遵循官方最佳实践
- **函数式组件**：优先使用函数式组件和 Hooks
- **类型安全**：所有 API 和状态都有完整类型定义

### 架构原则
- **单一职责**：每个模块职责单一，相互独立
- **依赖注入**：使用工厂模式和依赖注入
- **消息驱动**：模块间通过消息通信
- **错误隔离**：完善的错误处理和恢复机制

### 开发流程
- **模块化开发**：按功能模块独立开发
- **类型优先**：先定义类型，再实现功能
- **测试驱动**：关键功能需要有测试覆盖
- **文档先行**：重要功能需要文档说明

## 关键配置

### WXT 配置
```typescript
// wxt.config.ts
- Chrome Extension MV3
- React 19 支持
- Less 预处理器
- TypeScript 严格模式
```

### 项目依赖
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "typescript": "^5.7.3",
    "wxt": "^0.20.6"
  }
}
```

## 开发指南

### 环境搭建
1. 安装依赖：`npm install`
2. 开发模式：`npm run dev`
3. 构建扩展：`npm run build`
4. 打包发布：`npm run zip`

### 目录结构
```
humanTextReact/
├── entrypoints/           # 扩展入口
│   ├── background/       # 后台服务
│   ├── popup/           # 弹窗界面
│   ├── content/         # 内容脚本
│   ├── options/         # 设置页面
│   └── shared/          # 共享工具
├── shared/               # 全局共享
├── common/               # 通用工具
└── public/               # 静态资源
```

### 调试技巧
- 使用 `debug` 包进行调试
- 查看 Chrome DevTools 的 Console 和 Network 面板
- 使用 WXT 提供的开发工具

## 维护信息

- **最后更新**: 2025年9月24日 04:24
- **初始化状态**: 完成
- **模块覆盖率**: 100%
- **文档状态**: 完整

## 模块索引

- [**核心服务模块**](./entrypoints/background/CLAUDE.md) - 翻译服务和后台逻辑
- [**UI 模块**](./entrypoints/popup/CLAUDE.md) - 用户界面组件
- [**内容脚本模块**](./entrypoints/content/CLAUDE.md) - 页面注入和交互
- [**设置模块**](./entrypoints/options/CLAUDE.md) - 配置管理
- [**共享模块**](./entrypoints/shared/CLAUDE.md) - 共享工具和常量
- [**通用日志模块**](./common/logger/CLAUDE.md) - 日志系统

---

*本文档由 AI 自动生成，如有疑问请参考项目源码或联系开发团队。*