# 人话翻译器

人话翻译器是一个基于 WXT、React 和 Chrome Extension Manifest V3
开发的浏览器扩展。它使用用户配置的 AI 接口，将行业黑话、专业术语和
复杂表达解释成更容易理解的中文。

## 功能

### 翻译入口

- 在 Popup 中输入文字并翻译。
- 在网页中选中文字，通过右键菜单翻译。
- 选中文字后按 `Alt+H` 快速翻译。
- 在 Popup 中粘贴剪贴板图片，交给支持视觉输入的模型处理。

### 翻译体验

- 流式显示正文和 Provider 返回的 reasoning 内容。
- 支持 Markdown、代码块和代码复制。
- 支持快速回复和深度思考模式。
- 支持停止生成、失败后手动重试。
- 空响应和 API 错误会显示明确提示。
- Popup 关闭后自动恢复未提交的文字和图片草稿。

### 历史记录

- 历史记录保存在 `browser.storage.local`，最多保留最近 100 条。
- 支持模糊搜索、恢复、重新翻译、复制原文和复制译文。
- 支持删除单条记录、清空全部记录。
- 支持 JSON 导入和导出。

### 设置

- 配置 API Key、API 地址和模型 ID。
- 调整 Temperature 和提示词模板。
- 测试当前 API 配置是否可用。
- 设置深度思考、日志级别和界面主题。
- 查看并打开 Chrome 扩展快捷键设置页面。

### 稳定性与诊断

- 每次翻译使用独立 `requestId` 管理生命周期。
- 同一展示位置的新请求会取消旧请求，不影响其他标签页或 Popup。
- Popup 和页面浮窗会忽略迟到的旧请求结果。
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
2. 右键选择“人话翻译”，或者按 `Alt+H`。
3. 翻译结果会直接显示在页面浮窗中。

快捷键可以在扩展设置页中查看和修改。

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
├── background/              # 请求、翻译、历史和浏览器事件
├── content/                 # 页面浮窗与 Content Script
├── options/                 # 设置和问题诊断页面
├── popup/                   # Popup 翻译与历史界面
└── shared/
    ├── logger/              # 结构化日志与诊断存储
    ├── requestProtocol.ts   # Request ID 和展示目标协议
    ├── constants/           # 消息、设置和界面常量
    └── settingsUtils.ts     # 设置读取、兼容和保存

shared/
├── styles/                  # Popup 与页面浮窗共享样式
└── utils/                   # Markdown 等共享工具
```

核心请求链路：

```text
Popup / 右键菜单 / Alt+H
        ↓
Background MessageHandler
        ↓
RequestManager + TranslationService
        ↓
用户配置的 AI Provider
        ↓
带 requestId 的流式更新
        ↓
Popup 或页面翻译浮窗
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
