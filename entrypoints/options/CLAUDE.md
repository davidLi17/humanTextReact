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
- **Options.tsx** - 主设置组件（1363 行），含 Tab 分组（`all` / `api` / `interaction` / `appearance` / `diagnostics`，见 `Options.tsx:84-90` 的 `TABS`）
- **config/index.ts** - 配置提示常量：`API_HINTS`、`API_PLATFORM_HINTS`、`MODEL_HINTS`、`API_PLACEHOLDERS`

## 对外接口

### 设置接口
`Options.tsx` 内部定义的 `Settings`（`Options.tsx:56-69`），与 `UserSettings`（`shared/settingsUtils.ts:12-25`）字段一致：
```typescript
interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  promptTemplate: string;
  thinkingEnabled: boolean;
  showSelectionToolbar: boolean;
  contextualSelectionEnabled: boolean;
  prismModeEnabled: boolean;
  logLevel: LogLevel;
  theme: ThemeMode;
  fontScalePercent: number;
}
```
> `fontScalePercent` 由 `useFontScale()` 单独管理，`handleSave` 保存前会把它从 settings 里 `delete` 掉（`Options.tsx:283-285`），字号走独立的 `performFontScaleAction`。

### 配置提示接口
```typescript
// config/index.ts:1-11
export interface ApiHint {
  name: string;
  url: string;
  defaultModel?: string;
  platformUrl?: string;
}

export interface ApiPlatformHint {
  name: string;
  url: string;
}
```

## 关键依赖与配置

### 内部依赖（来自 `Options.tsx:1-53` 的 import）
- **设置管理**: `SettingsUtils` (`shared/settingsUtils.ts`)
- **日志系统**: `createLogger` / `initializeLogger` / `optionsLogger` (`shared/logger`)
- **诊断会话**: `shared/logger/diagnostics`（`startDiagnosticSession` / `stopDiagnosticSession` / `isDiagnosticSessionActive` / `DIAGNOSTIC_STATE_KEY`）
- **常量定义**: `DEFAULT_SETTINGS`、`LOG_LEVELS`、`MESSAGE_TYPES`、`THEME_MODES` (`shared/constants`)
- **字号控制**: `FontScaleControl` 组件与 `useFontScale` (`shared/`)
- **备份导入导出**: `shared/dataBackup`（`buildBackup` / `restoreBackup` / `validateBackup` / `createBackupFileName` / `formatSectionNames`）
- **配置提示**: `./config`（`API_HINTS` / `API_PLATFORM_HINTS` / `MODEL_HINTS`）

### 外部依赖
- **React 19**: UI 框架
- **React DOM**: DOM 渲染
- **@icon-park/react**: 图标库（`Api`、`Platte`、`Protect`、`SaveOne` 等，见 `Options.tsx:31-51`）
- **Chrome Extension API**: `storage`、`commands`、`runtime`、`tabs`（`chrome://extensions/shortcuts` 跳转）

### 样式依赖
- **Less**: CSS 预处理器
- **Options.less**: 设置页面样式（`Options.tsx:54` 导入）

## 数据模型

### 用户设置模型
字段定义见上文「设置接口」，权威定义在 `shared/settingsUtils.ts:12-25` 的 `UserSettings`；
默认值在 `shared/constants/index.ts:69-109` 的 `DEFAULT_SETTINGS`。

### 日志级别
**不是 `enum`**，而是 const 对象 + 派生类型（`shared/constants/index.ts:45-53`）：
```typescript
export const LOG_LEVELS = {
  OFF: "off",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];
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

// 读取（Options.tsx:239-247）：loadSettings 把结果合并进本地 state
const s = await SettingsUtils.getSettings();
setSettings((prev) => ({ ...prev, ...s }));

// 保存（Options.tsx:274-307）：SettingsUtils.setSettings 同时写两处，但**内容不同** ——
//   1. storage.local：完整配置（含 apiKey），本机第一权威
//   2. storage.sync ：严格剔除 apiKey，绝不上传密钥至云端
//      并额外调用 storage.sync.remove("apiKey") 清理历史遗留的顶层字段
const handleSave = async (showStatus = true): Promise<boolean> => {
  if (saveStatus === "saving") return false; // 防止重复提交
  if (showStatus) setSaveStatus("saving");

  try {
    const settingsWithoutFontScale = { ...settings } as Partial<Settings>;
    delete settingsWithoutFontScale.fontScalePercent;
    await SettingsUtils.setSettings(settingsWithoutFontScale);

    // 重新初始化日志系统以应用新的日志级别
    await initializeLogger("options");
    optionsLogger.info("设置保存成功", {
      logLevel: settings.logLevel,
      thinkingEnabled: settings.thinkingEnabled,
    });

    if (showStatus) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    return true;
  } catch (error) {
    optionsLogger.error("保存设置失败:", error);
    if (showStatus) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    return false;
  }
};
```

### 2. API 连接测试
**特点**：
- 实时连接测试
- 详细错误反馈
- 支持多种 API 提供商
- 超时处理

**核心功能**（`Options.tsx:563-604`）：
```typescript
const testApiKey = async () => {
  if (testStatus === "testing") return; // 防止重复提交

  setTestStatus("testing");
  setTestMessage("正在测试API连接...");

  try {
    const response = await browser.runtime.sendMessage({
      action: "testApiConnection",
      apiKey: settings.apiKey,
      baseUrl:
        settings.baseUrl || "https://api.deepseek.com/v1/chat/completions",
      model: settings.model || "deepseek-flash",
    });

    if (response.success) {
      setTestStatus("success");
      // 测试成功后自动持久化当前设置
      const saved = await handleSave(false);
      if (saved) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        setTestMessage("✅ API连接测试成功，设置已自动保存！");
      } else {
        setTestMessage("✅ API连接测试成功！");
      }
    } else {
      setTestStatus("error");
      setTestMessage(`❌ 连接失败: ${response.error || "未知错误"}`);
    }
  } catch (error: any) {
    setTestStatus("error");
    setTestMessage(`❌ 测试失败: ${error.message || "未知错误"}`);
  }

  // 3.5秒后自动重置状态
  setTimeout(() => {
    setTestStatus("idle");
    setTestMessage("");
  }, 3500);
};
```
> 测试按钮的 `disabled` 条件是 `!settings.apiKey.trim() || testStatus === "testing"`（`Options.tsx:803`）。

### 3. 配置提示系统
**特点**：
- 预设 API 提示
- 模型建议列表
- 快速配置选项
- 智能填充功能

**核心功能**（真实内容见 `config/index.ts`）：
```typescript
// API 提示（config/index.ts:22-60），六个提供商 + 一项「自定义地址」
export const API_HINTS: ApiHint[] = [
  {
    name: "DeepSeek",
    url: "https://api.deepseek.com/v1/chat/completions",
    defaultModel: "deepseek-flash",
    platformUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "智谱AI (GLM)",
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    defaultModel: "glm-5.3-flash",
    platformUrl: "https://open.bigmodel.cn/apikey/platform",
  },
  {
    name: "火山引擎",
    url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    defaultModel: "doubao-seed-2-1-turbo-260628",
    platformUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
  },
  {
    name: "月之暗面",
    url: "https://api.moonshot.cn/v1/chat/completions",
    defaultModel: "kimi-k2.6",
    platformUrl: "https://platform.moonshot.cn/console/api-keys",
  },
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemini-3-flash-preview",
    platformUrl: "https://openrouter.ai/keys",
  },
  {
    name: "通义千问",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    defaultModel: "qwen3.8-flash",
    platformUrl: "https://bailian.console.aliyun.com/#/api-key",
  },
  { name: "自定义地址", url: "" },
];

// 模型提示（config/index.ts:13-20）
export const MODEL_HINTS = [
  "deepseek-flash",
  "glm-5.3-flash",
  "doubao-seed-2-1-turbo-260628",
  "kimi-k2.6",
  "google/gemini-3-flash-preview",
  "qwen3.8-flash",
];
```

**「智能填充」的真实行为**（`Options.tsx:842-887`）：
- 点击 API 地址 chip → 填入该提供商的 `url`；若当前 `model` 为空，或当前 model 正好等于某个 `defaultModel`（即上一家的推荐值），则同时填入该提供商的 `defaultModel`。
- 自定义地址 chip（`url: ""`）只把焦点移到输入框，不填值、不清空已有地址。
- 注意 `API_HINTS`（地址 chip）与 `API_PLATFORM_HINTS`（外链 chip）是两组独立数组，同名提供商在两处的 `name` 写法不同（如「通义千问」vs「通义千问(百炼)」）。
- `API_PLATFORM_HINTS`（`config/index.ts:69-95`）用于「获取 API Key 官方控制台」外链，渲染时会 `filter((p) => p.url)` 过滤掉自定义项（`Options.tsx:811`）。
- `MODEL_HINTS` 渲染为模型推荐 chip，点击即填入 `model`（`Options.tsx:898-915`）。

### 4. 快捷键管理
**特点**：
- 快捷键只读展示（`Options.tsx:1079`，未设置时显示「未设置」）
- 跳转到 `chrome://extensions/shortcuts` 由用户自行改键
- ⚠️ 本页**不做**快捷键录制/测试，只读取 `browser.commands.getAll()`

**核心功能**（`Options.tsx:249-262`、`Options.tsx:558-560`）：
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
- **TypeScript 严格模式**: `bun run compile`（`tsc --noEmit`）
- **React 严格模式**: 开发时的额外检查
- **ESLint / Prettier**: ⚠️ **项目未配置**，没有任何 lint / 格式化闸门
- **调试日志**: 自研 logger（`shared/logger`），非 `debug` 包

### 测试覆盖
全仓测试现状（2026-09-11 实测 `bun test`）：**396 个用例通过 / 33 个文件**。
与本模块直接相关的：
- ✅ 设置读写与存储兼容（`tests/integration/settingsUtils.test.js`）
- ✅ 设置页组件交互（`tests/components/Options.component.tsx`，278 行 / 6 个用例：版本号渲染、Tab 切换、API Key Badge 与 Base URL chip 高亮、测试连接后自动保存、字号预览卡片、快捷保存与重置）
- ✅ 数据备份导入导出（`tests/integration/dataBackup.test.js`）
- ⚠️ `Options.tsx`（1363 行）不出现在 `bun run test:coverage` 产出的 `coverage/lcov.info` 中 —— 该命令只跑 `tests/unit`、`tests/contracts`、`tests/integration`、`tests/helpers` 四类目录，这些用例不会加载 `Options.tsx`；`bunfig.toml` 的 `coveragePathIgnorePatterns` 只排除 `tests/**`
- ⚠️ 组件测试由 `bun run test:components` 单独执行（`--preload=./tests/components/preload.ts`），**不产出覆盖率数据**
- ❌ 跨设备同步测试（待添加）

## 常见问题 (FAQ)

### Q: 设置如何同步到云端？
A: **只有非敏感字段会同步。** `SettingsUtils.setSettings` 在写入 `storage.sync` 前会
`delete syncSettings.apiKey`（`shared/settingsUtils.ts:355`），并调用
`storage.sync.remove("apiKey")`（`shared/settingsUtils.ts:363`）清理可能遗留的旧顶层字段。
API Key **始终只存 `storage.local`**，不会上传到 Google 账号，也就不跨设备同步。
`baseUrl` / `model` / `promptTemplate` / `theme` / `fontScalePercent` 等会同步。

### Q: API 连接测试失败怎么办？
A: 检查 API 密钥是否正确、网络连接是否正常、API 服务是否可用，并查看详细的错误信息。

### Q: 如何添加新的 API 提供商？
A: 在 `config/index.ts` 的 `API_HINTS` 数组里加一项，字段为 `name` / `url` /
可选 `defaultModel`（点击 chip 时自动填入模型 ID）/ 可选 `platformUrl`（该字段在当前
`API_HINTS` 中并未被 Options.tsx 读取，外链用的是独立的 `API_PLATFORM_HINTS`）。
若还要出现在「获取 API Key 官方控制台」外链区，需同步往 `API_PLATFORM_HINTS` 加一项。

### Q: 提示词模板支持哪些变量？
A: **不支持任何变量**，模板会被原样作为 system message 发送（`translationService.ts` 的
`buildMessagesPayload`）。用户正文走独立的 user message，不经过模板。
因此模板里写 `{text}` 之类的占位符会作为字面量发给模型，不要这样写。
（此前本节声称"支持 `{text}` 变量，翻译时替换"，与代码不符，已更正。）

## 相关文件清单

`entrypoints/options/` 下的源文件共 5 个（另有本文件 `CLAUDE.md`）：

### 核心文件
- `main.tsx` - 应用入口（`ReactDOM.createRoot(document.getElementById("root"))`，无异步 bootstrap）
- `Options.tsx` - 主设置组件（1363 行）
- `config/index.ts` - 配置提示常量（`API_HINTS` / `API_PLATFORM_HINTS` / `MODEL_HINTS` / `API_PLACEHOLDERS`）

### 样式文件
- `Options.less` - 设置页面样式
- `index.html` - HTML 模板

## 变更记录 (Changelog)

### 2026-09-11 - 对齐 418ea8f 模型配置更新
- 🔄 **配置提示代码块重写**：原 `API_HINTS` 示例只有 5 项且地址错误（含虚构的
  `api.moonseek.com`、`openrouter.ai/api/v3`），现按 `config/index.ts:22-60` 补全为
  6 家 + 「自定义地址」，与源码逐字一致。`MODEL_HINTS` 与源码一致（`config/index.ts:13-20`）。
- 🔄 **模型默认值**：确认代码中的兜底值为 `deepseek-flash`、默认地址
  `https://api.deepseek.com/v1/chat/completions`（`Options.tsx:575-576` 与
  `shared/constants/index.ts:70-71`），与 418ea8f 之后的模型表一致。
- 🔧 **`Settings` 接口补全**：补上 `showSelectionToolbar` / `contextualSelectionEnabled` /
  `prismModeEnabled` / `theme` / `fontScalePercent`，与 `Options.tsx:56-69` 对齐。
- 🔧 **`ApiHint` 接口补全**：补 `defaultModel?` / `platformUrl?`（`config/index.ts:1-6`）。
- 🔧 **日志级别写法更正**：不是 `enum`，而是 `LOG_LEVELS` const 对象 + 派生类型。
- 🔧 **「保存 / 测试连接」代码块换成真实实现**：`handleSave` 会先 `delete fontScalePercent`、
  再 `initializeLogger("options")`；`testApiKey` 成功后自动保存、3.5 秒（非 3 秒）后重置。
- 🔧 **删除「快捷键测试」**：该页只读展示快捷键并跳转 `chrome://extensions/shortcuts`，无测试功能。
- 🔧 测试现状更新为实测的 **396 用例 / 33 文件**；覆盖率陈述改为可核验的表述
  （`Options.tsx` 不在 `test:coverage` 的 lcov 中，原因是该命令只跑 4 个非组件目录）。
- 📌 保留 2026-09-10 的两处关键更正：`apiKey` 永不入 `storage.sync`；提示词模板**不支持变量**。

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