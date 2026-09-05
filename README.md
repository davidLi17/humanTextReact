# 人话翻译器

人话翻译器是一个基于 WXT、React 和 Chrome Extension Manifest V3
开发的浏览器扩展。它使用用户配置的 AI 接口，将行业黑话、专业术语和
复杂表达解释成更容易理解的中文。

支持四种使用方式：Popup 翻译、网页划词翻译（右键菜单 / 快捷键 /
浮动操作栏）、对话式侧边栏，以及侧边栏通读整个网页。

## 功能

### 翻译入口

- 在 Popup 中输入文字并翻译。
- 在网页中选中文字，通过右键菜单翻译。
- 选中文字后按 `Alt+D` 快速翻译；macOS 对应 `Option+D`。
- 选中文字后页面会出现浮动操作栏，一键选择「浮窗翻译」或「侧边栏人话」。
- 按 `Alt+S` 打开或收起侧边栏；macOS 对应 `Option+S`。
- 在 Popup 中粘贴剪贴板图片，交给支持视觉输入的模型处理。

### 翻译体验

- 流式显示正文和 Provider 返回的 reasoning 内容。
- 支持 Markdown、代码块和代码复制。
- 支持快速回复和深度思考模式。
- 支持停止生成、失败后手动重试。
- 空响应和 API 错误会显示明确提示。
- Popup 关闭后自动恢复未提交的文字和图片草稿。

### 侧边栏对话

- 类似主流 AI 助手的多会话对话界面，支持图片多模态输入。
- 网页中选中文字后点击「侧边栏人话」，自动带上引用进入侧边栏追问。
- 侧边栏内选中回复文字，浮出「追问」胶囊继续提问，输入框上方显示引用预览条。
- 支持消息编辑后重新生成。
- 支持流式输出时的 GPT 式智能滚动：自动跟随生成，用户上滑即暂停，
  并以浮动胶囊提示「回到底部」或「AI 生成中」。
- 对话可复制，支持导出 Markdown 和 JSON。
- 右键菜单「通读网页」可将当前页面正文提取后送入侧边栏解读。

### 黑话生词本

- 侧边栏抽屉内置生词本，可保存、编辑、删除和星标词条。
- 支持生词本 2.0 格式的 JSON 导入和导出。

### 历史记录

- 历史记录保存在 `browser.storage.local`，最多保留最近 142 条。
- 支持模糊搜索、恢复、重新翻译、复制原文和复制译文。
- 支持删除单条记录、清空全部记录。
- 支持 JSON 导入和导出。

### 设置

- 配置 API Key、API 地址和模型 ID。
- 调整 Temperature 和提示词模板。
- 测试当前 API 配置是否可用。
- 设置深度思考、日志级别和界面主题。
- 开关网页划词浮动操作栏。
- 查看并打开 Chrome 扩展快捷键设置页面。

### 稳定性与诊断

- 每次翻译使用独立 `requestId` 管理生命周期。
- 同一展示位置的新请求会取消旧请求，不影响其他标签页或 Popup。
- Popup 和页面浮窗会忽略迟到的旧请求结果。
- 快捷键采用 Background 与 Content Script 双通道保活，避免 Service
  Worker 休眠后失灵，并做了去重防止重复触发。
- 设置页可以开启 30 分钟问题诊断。
- 诊断日志覆盖 Background、Content Script、Popup 和 Options。
- 支持复制日志、下载 JSON、清空日志和提前停止诊断。
- API Key、Authorization、原文、译文和图片内容会自动脱敏。

## 使用方法

### 初次配置

1. 点击扩展图标打开 Popup。
2. 进入设置页面。
3. 填写 API Key、Chat Completions 接口地址和模型 ID。
4. 点击“测试连接”。
5. 保存设置。

扩展直接请求用户配置的 AI Provider。模型需要兼容当前使用的
Chat Completions 流式响应格式；图片翻译还要求模型支持图片输入。

### Popup 翻译

1. 输入需要解释的内容，或使用 `Ctrl+V` 粘贴图片。
2. 根据需要选择快速回复或深度思考。
3. 点击翻译。
4. 生成过程中可以停止，失败后可以手动重试。

未提交的输入会作为草稿保存在当前浏览器本地。使用“清空”可以同时清除
当前输入、图片、结果和本地草稿。

### 网页划词翻译

1. 在网页中选中文字。
2. 右键选择“人话翻译”，按 `Alt+D`（macOS 使用 `Option+D`），
   或点击选区旁浮动操作栏中的「浮窗翻译」。
3. 翻译结果会直接显示在页面浮窗中。

也可以点击浮动操作栏中的「侧边栏人话」，将选中内容带入侧边栏继续追问。

快捷键可以在扩展设置页中查看和修改。

### 侧边栏对话

1. 按 `Alt+S`（macOS 使用 `Option+S`）打开侧边栏，或点击扩展图标。
2. 直接提问，或粘贴图片让支持视觉输入的模型解读。
3. 在网页中选中文字，用右键菜单「通读网页」或划词操作栏送入侧边栏。
4. 选中任意回复片段可发起引用追问。

### 历史复用

在 Popup 中打开翻译历史后，可以：

- 点击记录或“恢复”，恢复当时的原文、译文和 reasoning。
- 点击“重译”，使用历史原文立即发起一次新翻译。
- 分别复制原文或译文。
- 搜索、删除、清空、导入或导出历史记录。

历史记录只保存在当前浏览器本地，不通过 Chrome Sync 同步。

### 排查问题

遇到偶发问题时：

1. 打开设置页的“问题诊断”。
2. 点击“开启 30 分钟诊断”。
3. 回到出现问题的页面并复现一次。
4. 返回设置页，复制日志或下载 JSON。
5. 完成后停止诊断。

诊断数据只保存在当前浏览器会话中，并有数量和体积限制。

## 开发

### 环境

- [Bun](https://bun.sh/)
- Chrome 或其他 Chromium 浏览器

本项目统一使用 Bun。不要混用 npm、pnpm 或 yarn。

### 安装

```bash
bun install
```

### 启动开发环境

```bash
bun run dev
```

Firefox 开发模式：

```bash
bun run dev:firefox
```

### 类型检查和测试

```bash
bun run compile
bun test
```

测试覆盖快捷键双通道保活、请求生命周期管理、侧边栏滚动状态、
划词操作栏、生词本数据模型、Markdown XSS 转义、诊断日志等模块。

`docs/` 目录收录了开发回顾、请求 ID 重构方案、翻译链路修复方案
和 Chrome 诊断日志使用指南。

### 构建

```bash
bun run build
```

Chrome MV3 构建输出位于 `.output/chrome-mv3/`。

在 Chrome 中加载：

1. 打开 `chrome://extensions/`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择 `.output/chrome-mv3/`。

### 打包

```bash
bun run zip
```

Firefox 构建和打包：

```bash
bun run build:firefox
bun run zip:firefox
```

`.output/`、`artifacts/` 和生成的压缩包不应提交到 Git。

## 项目结构

```text
entrypoints/
├── background/              # 翻译请求、消息路由、快捷键和浏览器事件
├── content/                 # 页面翻译浮窗、划词操作栏和快捷键兜底
├── options/                 # 设置和问题诊断页面
├── popup/                   # Popup 翻译与历史界面
├── sidepanel/               # 侧边栏对话、生词本和智能滚动
└── shared/
    ├── logger/              # 结构化日志与诊断存储
    ├── requestProtocol.ts   # Request ID 和展示目标协议
    ├── constants/           # 消息、设置和界面常量
    ├── settingsUtils.ts     # 设置读取、兼容和保存
    └── sidepanelUtils.ts    # 侧边栏开关与状态工具

shared/
├── styles/                  # Popup 与页面浮窗共享样式
└── utils/                   # Markdown 等共享工具
```

核心请求链路：

```text
Popup / 右键菜单 / Alt+D（macOS 为 Option+D）/ 划词操作栏
        ↓
Background MessageHandler
        ↓
RequestManager + TranslationService
        ↓
用户配置的 AI Provider
        ↓
带 requestId 的流式更新
        ↓
Popup / 页面翻译浮窗 / 侧边栏
```

## 技术栈

- React 19
- TypeScript
- WXT 0.20
- Vite 7
- Bun
- Less
- Chrome Extension Manifest V3

## License

[MIT](LICENSE)
