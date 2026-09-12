# 人话翻译器

[![从 Chrome 应用商店安装](https://img.shields.io/badge/Chrome%20应用商店-立即安装-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore/detail/opkeilhfflnbncnllnhlobmpiokpebgn)

**[立即安装人话翻译器 →](https://chrome.google.com/webstore/detail/opkeilhfflnbncnllnhlobmpiokpebgn)**

安装后需配置自己的 AI 接口与 API Key，详见[初次配置](#初次配置)。

![人话翻译器：把黑话翻译成人话](store-assets/02_store_marquee_1400x560.png)

人话翻译器是一个基于 WXT、React 和 Chrome Extension Manifest V3
开发的浏览器扩展。它使用用户配置的 AI 接口，将行业黑话、专业术语和
复杂表达解释成更容易理解的中文。

支持四种使用方式：Popup 翻译、网页划词翻译（右键菜单 / 快捷键 /
浮动操作栏）、对话式侧边栏，以及把当前网页正文附加到侧边栏后按范围提问。

## 功能预览

以下为产品宣传示意图，界面与示例数据用于展示功能概念；具体操作以当前版本为准。

### 把复杂表达讲清楚

![行业黑话与通俗解释示意](store-assets/04_feature_jargon_to_plain_1280x800.png)

### 网页划词，随手解释

![网页划词翻译与浮动操作栏示意](store-assets/05_feature_selection_toolbar_1280x800.png)

### 图片解读与深度思考

![多模态图片解读与深度思考示意](store-assets/06_feature_multimodal_reasoning_1280x800.png)

图片解读需要配置支持图片输入的模型。

### 收藏术语，积累自己的生词本

![黑话生词本与知识积累示意](store-assets/07_feature_jargon_vault_1280x800.png)

### 本地保存，自选模型

![本地存储与多模型接入示意](store-assets/08_feature_local_security_models_1280x800.png)

设置、历史记录和生词本都保存在浏览器存储中：历史记录和生词本仅保存在本机
（`storage.local`），设置会通过 Chrome 账号同步，但 API Key 例外、只保存在本机。
调用 AI 时，待解释的文字或图片会发送至你配置的模型服务，详见[隐私政策](PRIVACY.md)。

## 功能

### 翻译入口

- 在 Popup 中输入文字并翻译。
- 在网页中选中文字，通过右键菜单翻译。
- 选中文字后按 `Alt+D` 快速翻译；macOS 对应 `Option+D`。
- 选中文字后页面会出现浮动操作栏，一键选择「浮窗翻译」或「侧边栏人话」。
- 可在设置中显式开启「结合当前段落解释」，让划词解释结合选区所在的有限段落。
- 按 `Alt+S` 打开或收起侧边栏；macOS 对应 `Option+S`。
- 在 Popup 中粘贴剪贴板图片，交给支持视觉输入的模型处理。

### 翻译体验

- 流式显示正文和 Provider 返回的 reasoning 内容。
- 支持 Markdown、代码块和代码复制。
- 支持快速回复和深度思考模式。
- 可在设置中开启「多维视角三棱镜模式」，让模型按「🍼 直白人话版 / 👔 向上汇报版 / 🔪 犀利真相版」三段结构输出。
- 支持停止生成、失败后手动重试。
- 扩展界面字体可在 80%～160% 之间按 10% 调整；侧边栏顶栏与设置页共用同一比例并自动保存。
- 在侧边栏、Popup 或设置页按 `Command/Ctrl + +`、`Command/Ctrl + -` 调整，按 `Command/Ctrl + 0` 恢复 100%。网页内快捷键只有焦点位于人话翻译浮窗或划词工具条时才生效，不改变普通网页字号。
- 请求具有默认超时保护：等待响应头 20 秒；普通模式等待首次有效输出 60 秒，
  深度思考模式 180 秒；开始输出后连续 60 秒没有有效内容会停止，总请求最长
  10 分钟。
  超时会保留已经显示的正文和思考内容，并提供阶段说明与手动重试入口。
- 活跃请求按 Chrome 官方建议每 25 秒调用一次扩展 API 保持 Service Worker
  活跃，请求结束立即清理；详见 `docs/request-timeout-guard.md`。
- 空响应和 API 错误会显示明确提示。
- Popup 关闭后自动恢复未提交的文字和图片草稿。

### 侧边栏对话

- 类似主流 AI 助手的多会话对话界面，支持图片多模态输入。
- 网页中选中文字后点击「侧边栏人话」，自动带上引用进入侧边栏追问。
- 侧边栏内选中回复文字，浮出「追问」胶囊继续提问，输入框上方显示引用预览条。
- 支持消息编辑后重新生成。
- 流式生成过程中可以继续输入新问题：按 Enter 入队，当前回答结束后自动依次解答；
  也可以取消排队，或点「优先发送」/ 按 `Command/Ctrl + Enter` 打断当前输出立即提问。
- 支持流式输出时的 GPT 式智能滚动：自动跟随生成，用户上滑即暂停，
  并以浮动胶囊提示「回到底部」或「AI 生成中」。
- 对话可复制，支持导出 Markdown 和 JSON。
- 「通读当前网页」会先把当前网页正文附加到当前侧边栏会话，整个过程不请求模型。附加完成后，网页上下文卡片会显示标题、来源、已采集字符数、已保存字符数和页面可能未加载的范围。
- 网页上下文卡片按 16,000 字符分段，默认选中第 1 段。发送问题前可以勾选后续段落，也可以清空选择；选择范围会保存到当前消息，之后的提问、编辑和重试都会使用已选范围。
- 单篇网页快照最多保存 160,000 字符，所有会话合计最多保存 500,000 字符。页面正文超过保存空间时，卡片会显示已采集与已保存的差额，并提示页面可能还有未加载内容；删除不再需要的旧网页会话后，可以重新加入更完整的快照。
- 旧的 `contextOnly` 网页记录仍可在卡片中查看和调整已选范围；旧记录只保留首段时，重新加入同一网页即可获得当前可保存的完整快照。
- 每次请求有 48,000 字符的保守文本预算，计算系统提示词、历史消息和引用内容，不计算图片的 Base64 数据。超过预算时会拦截请求，输入草稿和排队问题都会保留，减少网页段落后可以重试。
- 历史会话中已有的网页速读消息继续支持长文分段续读、失败重试和主动生成全文总览；当前网页附加入口遵循“附加正文 → 选择范围 → 提问”的流程。
- 全部分段完成后，可主动点击「生成全文总览」；总览只基于各段已经完成的解读结果生成，不会自动请求模型。
- 总览的完整输入超过 48,000 字符时会直接阻止生成；缺少阅读运行标识的旧记录不支持全文总览。

### 黑话生词本

- 侧边栏抽屉内置生词本，可保存、编辑、删除和星标词条。
- 支持生词本 2.0 格式的 JSON 导入和导出。
- 单轮纯文本翻译会先在本地生词本中执行区分大小写的精确匹配。命中后直接显示已保存释义，标注「来自生词本」，无需 API Key；点击「重新生成」可明确跳过本地结果并调用模型。
- 图片、带选区段落上下文、侧边栏多轮追问和网页长文分段不会自动复用生词本；未命中、读取失败或读取超过 1 秒时继续执行正常翻译。生词本内容不会整本发送给模型。

### 历史记录

- 历史记录保存在 `browser.storage.local`，最多保留最近 142 条。
- 支持模糊搜索、恢复、重新翻译、复制原文和复制译文。
- 支持删除单条记录、清空全部记录。
- 支持 JSON 导入和导出。

### 设置

- 配置 API Key、API 地址和模型 ID。
- 调整 Temperature 和提示词模板。
- 测试当前 API 配置是否可用。
- API 连接测试最长等待 15 秒，超时后会提示检查地址、网络或代理。
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

设置页内置 6 个推荐服务商的请求地址与默认模型（DeepSeek、智谱AI (GLM)、
火山引擎、月之暗面、OpenRouter、通义千问），也可以填「自定义地址」。
默认地址为 `https://api.deepseek.com/v1/chat/completions`，默认模型为
`deepseek-flash`。

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

开启「结合当前段落解释」后，浮窗会先预览即将使用的当前段落。此时可以选择
「结合本段解释」或「仅解释选中文字」。送入侧边栏时，上下文会显示为可移除的
独立预览，并在点击发送后随该条消息保存，供编辑和重试继续使用。

也可以点击浮动操作栏中的「侧边栏人话」，将选中内容带入侧边栏继续追问。

快捷键可以在扩展设置页中查看和修改。

#### 划词上下文与隐私

- 此功能默认关闭，需要在设置页主动开启。
- 只读取选区所在的 `p`、`li`、`blockquote`、`pre`、`td` 或 `th`
  叶子语义段，最多约 2000 字；不会扫描整页、输入框、可编辑区域、脚本或隐藏内容。
- 跨段、iframe、选区不匹配或无法安全读取时自动退回纯文本解释。
- 只有确认「结合本段解释」或在侧边栏点击发送时，段落才会交给用户配置的
  AI 服务。页面标题和 HTTP(S) 来源 URL 仅保存在本地用于预览，不发送给模型。

### 侧边栏对话

1. 按 `Alt+S`（macOS 使用 `Option+S`）打开侧边栏，或点击扩展图标。
2. 直接提问，或粘贴图片让支持视觉输入的模型解读。
3. 把网页内容加入侧边栏：点击「通读当前网页」，或使用右键菜单中的同名入口。
   等待网页上下文卡片出现后，展开「预览已保存原文」，按需要勾选参与回答的段落，
   再输入问题并发送。只想带上选中文字时，用划词操作栏中的「侧边栏人话」。
4. 选中任意回复片段可发起引用追问。引用内容也会计入本次 48,000 字符预算。

侧边栏顶栏的 `A− / 百分比 / A+` 可随时调整扩展文字大小；点击中间百分比恢复 100%，修改会同步到 Popup、设置页、网页内翻译浮窗和划词工具条。

### 历史复用

在 Popup 中打开翻译历史后，可以：

- 点击记录或“恢复”，恢复当时的原文、译文和 reasoning。
- 点击“重译”，使用历史原文立即发起一次新翻译。
- 分别复制原文或译文。
- 搜索、删除、清空、导入或导出历史记录。

历史记录只保存在当前浏览器本地，不通过 Chrome Sync 同步。

设置页的全量备份首版不包含长文断点中的未读全文。恢复备份会同步清空旧断点，完成后需要关闭并重新打开侧边栏再继续使用。

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
bun run test
bun run test:fast
bun run test:unit
bun run test:contract
bun run test:integration
bun run test:shared
bun run test:components
bun run test:coverage
bunx playwright install chromium
bun run test:e2e
bun run test:e2e:built
```

`test` 会依次执行 396 个快速测试（`tests/unit`、`tests/contracts`、
`tests/integration`、`tests/helpers`）和 16 个组件测试（`tests/components` 下的
Options、PromptQueue、SidepanelApp 三个 `.component.tsx`，由独立 Happy DOM
Runner 执行）。
`test:shared` 会在单 Worker 共享进程中随机测试顺序；可通过
`TEST_SEED=123456 bun run test:shared` 指定种子复现问题。覆盖率只统计测试实际
加载到的生产文件，并通过 `bunfig.toml` 排除 `tests/**`。本次核对时运行
`bun run test:coverage`（396 个快速测试）输出为函数 77.52%、行 77.20%；
组件 Runner、未加载的浏览器入口和真实扩展生命周期不属于这份统计。
分层职责、隔离规范和浏览器回归盲区见 [`tests/README.md`](tests/README.md)。

`test:e2e` 会先构建 Chrome MV3 扩展，再使用 Playwright 的临时独立 Chromium
Profile 和本地 HTTP/SSE 夹具验证三条真实扩展流程。它不会连接日常 Chrome，也不会调用真实模型服务。
Linux 或 CI 首次安装使用 `bunx playwright install --with-deps chromium`。
参考 [Bun 官方代码覆盖率指南](https://bun.com/docs/test/code-coverage)和
[Playwright 官方 Chrome 扩展测试指南](https://playwright.dev/docs/chrome-extensions)。

仓库没有 ESLint / Prettier / Biome 配置文件，当前的质量闸门只有
`tsc --noEmit`（`bun run compile`，别名 `bun run typecheck`）与 `bun test`。
版本号 `1.5.3` 硬编码在 `wxt.config.ts`（决定进包 manifest 的版本）和
`package.json`（决定 zip 文件名）两处，发版时需要同时修改。项目根目录
`.bun-version` 里的 `1.4.0` 是 Bun 运行时的版本号，与扩展版本号无关。

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

MIT。仓库当前没有 `LICENSE` 文件，`package.json` 也没有 `license` 字段。
