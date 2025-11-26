[根目录](../../CLAUDE.md) > [entrypoints](../) > **options**

# Options 设置页面模块

## 模块职责

Options 模块是扩展的配置管理界面，提供 API 配置、模型选择、参数调优、提示词定制、快捷键管理等功能。作为用户自定义扩展行为的核心入口，支持本地存储和云端同步双重配置策略。

## 入口与启动

### 主入口文件
- **`main.tsx`**: React 应用渲染入口
- **`index.html`**: 设置页面 HTML 模板
- **`Options.tsx`**: 主设置组件，管理配置表单

### 启动流程
1. React 应用初始化
2. 加载现有设置（优先云端，后本地）
3. 加载快捷键配置信息
4. 初始化表单状态和事件处理

## 对外接口

### 配置接口
- **设置管理器**: 通过 browser.storage API 管理配置
  - 云端同步存储（`browser.storage.sync`）
  - 本地备份存储（`browser.storage.local`）
  - 配置验证和默认值处理

- **快捷键管理**: 通过 browser.commands API
  - 获取当前快捷键绑定
  - 跳转到快捷键设置页面
  - 快捷键变更监听

### API 测试接口
- **连接测试**: 验证 API 配置的有效性
  - 测试 API 网络连通性
  - 验证 API Key 和模型配置
  - 返回测试结果和错误信息

## 关键依赖与配置

### 内部依赖
- **共享常量**: `../shared/constants`
  - 默认设置配置
  - 消息类型引用
- **Background Script**: 通过消息同步配置

### UI 组件库
- **@icon-park/react**: 图标组件库
  - PreviewClose
  - PreviewCloseOne

### 配置提示
- **config/index.ts**: 配置提示和帮助信息
  - API 平台提示信息
  - 模型配置指导
  - 参数说明

## 数据模型

### 设置配置模型
```typescript
interface Settings {
  apiKey: string;           // API 密钥
  baseUrl: string;          // API 基础 URL
  model: string;            // AI 模型名称
  temperature: number;      // 温度参数
  promptTemplate: string;   // 提示词模板
}
```

### 应用状态模型
```typescript
interface OptionsState {
  settings: Settings;               // 当前设置
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';  // 保存状态
  testStatus: 'idle' | 'testing' | 'success' | 'error'; // 测试状态
  testMessage: string;              // 测试结果消息
  showApiKey: boolean;              // 是否显示 API 密钥
  shortcut: string;                 // 当前快捷键
}
```

### 配置提示模型
```typescript
interface ConfigHints {
  [key: string]: string[];          // 配置项提示信息
}

interface ModelHints {
  [model: string]: string;          // 模型说明信息
}
```

## 测试与质量

### 组件测试重点
- **表单验证**: 输入字段的验证和错误处理
- **配置保存**: 本地和云端配置同步
- **API 测试**: 连接测试逻辑和结果展示
- **状态管理**: 异步操作的状态处理

### 用户体验优化
- **实时反馈**: 保存状态和测试结果的即时显示
- **错误处理**: 友好的错误提示和解决建议
- **表单体验**: 输入提示、自动完成、格式化显示
- **安全性**: API 密钥的安全显示和存储

### 配置验证
- **URL 验证**: API 地址格式验证
- **API Key 验证**: 密钥格式和基本验证
- **模型验证**: 模型名称和白名单验证
- **参数范围**: 温度等数值参数的范围检查

## 常见问题 (FAQ)

### Q: 配置保存失败如何处理？
A: Options 页面会显示保存状态，如果云端保存失败，会自动降级到本地存储，确保扩展功能可用。

### Q: 如何测试 API 配置是否正确？
A: 点击"测试连接"按钮，系统会发送测试请求并显示测试结果，包括网络状态和 API 响应验证。

### Q: 快捷键修改后何时生效？
A: 快捷键修改会在浏览器层面生效，修改后会自动同步到 Background Script，无需重启扩展。

### Q: 提示词模板支持哪些变量？
A: 当前支持 `{text}` 变量作为文本占位符，用户可以自定义翻译提示词来优化翻译效果。

## 相关文件清单

### 核心组件
- `Options.tsx` - 主设置组件
- `main.tsx` - React 渲染入口
- `index.html` - HTML 模板

### 配置资源
- `config/index.ts` - 配置提示和帮助信息

### 样式文件
- `Options.less` - 设置页面样式

## 变更记录 (Changelog)

### 2025-11-26 23:32:46
- 创建 Options 模块文档
- 分析配置管理架构
- 识别用户交互流程和验证策略
- 建立测试重点和体验优化建议