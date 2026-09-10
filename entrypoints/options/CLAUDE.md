[根目录](../../CLAUDE.md) > [entrypoints](../) > **options**

# Options 模块 - 设置管理层

## 模块职责

Options 模块是人话翻译器的设置管理界面，提供用户配置的完整管理功能。该模块基于 React 19 构建，负责 API 配置、模型选择、提示词定制、快捷键管理等核心设置功能。

**核心职责**：
- ⚙️ 用户配置的界面管理
- 🔑 API 密钥和接口配置
- 🤖 AI 模型和参数选择
- 📝 提示词模板定制
- ⌨️ 快捷键管理
- 💾 设置持久化：完整配置存 `storage.local`；**非敏感字段**同步到 `storage.sync`（`apiKey` 永不入 sync）
- 🧪 API 连接测试

## 入口与启动

### 主入口文件
- **文件**: `main.tsx`
- **启动方式**: ReactDOM.createRoot()
- **挂载点**: `document.getElementById("root")`

### 初始化流程
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import Options from "./Options";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
```

### 主组件结构
- **Options.tsx** - 主设置组件
- **config/index.ts** - 配置提示和默认值

## 对外接口

### 设置接口
```typescript
interface Settings {
  apiKey: string;              // API 密钥
  baseUrl: string;             // API 地址
  model: string;               // 模型 ID
  temperature: number;         // 温度参数
  promptTemplate: string;      // 提示词模板
  thinkingEnabled: boolean;    // 思维链开关
  logLevel: LogLevel;          // 日志级别
}
```

### 配置提示接口
```typescript
interface ApiHint {
  name: string;
  url: string;
}

interface ApiPlatformHint {
  name: string;
  url: string;
}
```

## 关键依赖与配置

### 内部依赖
- **设置管理**: `SettingsUtils` (shared/settingsUtils.ts)
- **日志系统**: `Logger` (shared/logger/index.ts)
- **常量定义**: `Constants` (shared/constants/index.ts)

### 外部依赖
- **React 19**: UI 框架
- **React DOM**: DOM 渲染
- **@icon-park/react**: 图标库
- **Chrome Extension API**: storage, commands, runtime

### 样式依赖
- **Less**: CSS 预处理器
- **Options.less**: 设置页面样式

## 数据模型

### 用户设置模型
```typescript
interface Settings {
  apiKey: string;                    // API 密钥
  baseUrl: string;                   // API 地址
  model: string;                     // 模型 ID
  temperature: number;               // 温度参数 (0-2)
  promptTemplate: string;            // 提示词模板
  thinkingEnabled: boolean;          // 思维链开关
  logLevel: LogLevel;                // 日志级别
}
```

### 日志级别枚举
```typescript
enum LogLevel {
  OFF = "off",
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug"
}
```

## 核心功能实现

### 1. 主设置组件 (Options.tsx)
**特点**：
- 分组设置管理
- 实时保存功能
- API 连接测试
- 设置验证和提示

**核心功能**：
```typescript
// ⚠️ 设置读写统一走 SettingsUtils，不要直接操作 storage。
// 本节此前的示例展示了「把含 apiKey 的 settings 直接写入 storage.sync」的做法，
// 那正是安全加固中被移除的不安全模式，已删除以免被照抄。
// 真实实现见 shared/settingsUtils.ts 的 getSettings / setSettings。

// 读取：local 优先，sync 作为跨设备补充，两者按 updatedAt 仲裁
const settings = await SettingsUtils.getSettings();

// 保存：SettingsUtils.setSettings 同时写两处，但**内容不同** ——
//   1. storage.local：完整配置（含 apiKey），本机第一权威
//   2. storage.sync ：严格剔除 apiKey，绝不上传密钥至云端
//      并额外调用 storage.sync.remove("apiKey") 清理历史遗留的顶层字段
await SettingsUtils.setSettings(next);

// 重新初始化日志系统
await initializeLogger();

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  } catch (error) {
    setSaveStatus("error");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }
};
```

### 2. API 连接测试
**特点**：
- 实时连接测试
- 详细错误反馈
- 支持多种 API 提供商
- 超时处理

**核心功能**：
```typescript
const testApiKey = async () => {
  setTestStatus("testing");
  setTestMessage("正在测试API连接...");

  try {
    const response = await browser.runtime.sendMessage({
      action: "testApiConnection",
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl || "https://api.deepseek.com/v1/chat/completions",
      model: settings.model || "deepseek-reasoner",
    });

    if (response.success) {
      setTestStatus("success");
      setTestMessage("✅ API连接测试成功！");
    } else {
      setTestStatus("error");
      setTestMessage(`❌ 连接失败: ${response.error}`);
    }
  } catch (error: any) {
    setTestStatus("error");
    setTestMessage(`❌ 测试失败: ${error.message || "未知错误"}`);
  }

  // 3秒后自动重置状态
  setTimeout(() => {
    setTestStatus("idle");
    setTestMessage("");
  }, 3000);
};
```

### 3. 配置提示系统
**特点**：
- 预设 API 提示
- 模型建议列表
- 快速配置选项
- 智能填充功能

**核心功能**：
```typescript
// API 提示
export const API_HINTS: ApiHint[] = [
  { name: "DeepSeek", url: "https://api.deepseek.com/v1/chat/completions" },
  { name: "火山引擎", url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions" },
  { name: "月之暗面", url: "https://api.moonseek.com/v1/chat/completions" },
  { name: "OpenRouter", url: "https://openrouter.ai/api/v3/chat/completions" },
  { name: "通义千问", url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" },
];

// 模型提示
export const MODEL_HINTS = [
  "deepseek-reasoner",
  "deepseek-chat",
  "deepseek-r1-250528",
  "kimi-k2-250711",
  "doubao-seed-1-6-thinking-250715",
  // ... 更多模型
];
```

### 4. 快捷键管理
**特点**：
- 快捷键显示
- 快捷键配置跳转
- 快捷键测试

**核心功能**：
```typescript
const loadShortcut = async () => {
  try {
    const commands = await browser.commands.getAll();
    const translateCommand = commands.find(
      (cmd: any) => cmd.name === "translate-selection"
    );
    if (translateCommand && translateCommand.shortcut) {
      setShortcut(translateCommand.shortcut);
    }
  } catch (error) {
    optionsLogger.error("加载快捷键失败:", error);
  }
};

const openShortcutSettings = () => {
  browser.tabs.create({ url: "chrome://extensions/shortcuts" });
};
```

## 测试与质量

### 质量工具
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）当前零错误
- **React 严格模式**: 开发时的额外检查
- **ESLint**: ⚠️ **项目未配置 ESLint**，没有任何 lint 闸门
- **调试日志**: 自研 logger（`shared/logger`），非 `debug` 包

### 测试覆盖
- ✅ 设置读写与存储兼容（`tests/integration/settingsUtils.test.js`）
- ✅ 设置页组件交互与导航（`tests/components/Options.component.tsx`，6 个用例 / 1363 行组件）
- ✅ 数据备份导入导出（`tests/integration/dataBackup.test.js`）
- ⚠️ `Options.tsx` 不在覆盖率统计范围内（覆盖率运行排除 `tests/components`）
- ❌ 跨设备同步测试（待添加）

## 常见问题 (FAQ)

### Q: 设置如何同步到云端？
A: **只有非敏感字段会同步。** `SettingsUtils.setSettings` 在写入 `storage.sync` 前会
`delete syncSettings.apiKey`，并调用 `storage.sync.remove("apiKey")` 清理可能遗留的旧顶层字段。
API Key **始终只存 `storage.local`**，不会上传到 Google 账号，也就不跨设备同步。
`baseUrl` / `model` / `promptTemplate` / `theme` / `fontScalePercent` 等会同步。

### Q: API 连接测试失败怎么办？
A: 检查 API 密钥是否正确、网络连接是否正常、API 服务是否可用，并查看详细的错误信息。

### Q: 如何添加新的 API 提供商？
A: 在 config/index.ts 中的 API_HINTS 数组中添加新的提供商配置，包括名称和 API 地址。

### Q: 提示词模板支持哪些变量？
A: 目前支持 `{text}` 变量，在翻译时会替换为实际的文本内容。

## 相关文件清单

### 核心文件
- `main.tsx` - 应用入口
- `Options.tsx` - 主设置组件
- `config/index.ts` - 配置提示和默认值

### 样式文件
- `Options.less` - 设置页面样式
- `index.html` - HTML 模板

## 变更记录 (Changelog)

### 2026-09-10 - 文档纠错（重要）
- 🔴 **删除了一段会重新引入密钥泄漏的示例代码**：原示例演示
  `browser.storage.sync.set(settings)` 且 `storage.sync.get(["apiKey", ...])`，
  与 `settingsUtils.ts:350-368` 的安全设计直接冲突。照抄会把用户的 API Key 同步到 Google 账号。
  已替换为正确的「local 存全量、sync 剔除 apiKey」说明。
- 🔧 修正 FAQ「设置会自动同步到所有设备」——只有非敏感字段同步
- 🔧 移除 ESLint 质量声明
- 🔧 「测试覆盖 ✅」按实际测试文件重新列示

### 2025-09-24 05:32 - 模块文档初始化
- ⚠️ 初版「覆盖率 100% (4/4 文件)」「缺口：无」与实际不符，已于 2026-09-10 移除