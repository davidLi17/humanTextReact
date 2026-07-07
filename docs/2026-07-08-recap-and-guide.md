# 2026-07-08 Recap 与使用教程

## 今日完成内容

今天主要做了三类工作：仓库稳定化、popup 日常体验增强、历史记录复用增强，并完成构建和可分发 zip 打包。

### 1. 仓库与 Bun 工作流稳定化

已完成：

- 新增 `AGENTS.md`，明确项目默认使用 Bun 作为安装、启动、编译、构建、打包入口。
- 清理旧的已提交构建产物 `chrome-mv3/`。
- 删除 `package-lock.json`，避免 npm 与 Bun 工作流混用。
- 删除旧的已提交 zip 包 `人话翻译器增强版.zip`。
- 更新 `.gitignore`，忽略本地构建/分发产物。
- 将本地临时分发产物统一放到 `artifacts/` 或 `.output/`，不进入 git。

相关提交：

```bash
ace6249 chore: align repo artifacts with bun workflow
```

### 2. 翻译请求与错误链路稳定化

已完成：

- popup 发起的翻译请求现在也能被后台 `RequestManager` 管理。
- `cleanup` 可以取消 popup 当前翻译，不再只支持 content script 场景。
- 翻译中途失败时，background 会把错误主动推回 popup。
- API Key、网络、状态码等错误信息被转换成更容易理解的提示。
- 补齐 `SettingsUtils.clearCache()`，修复原有调用缺失问题。
- 修复 history/logger 相关 storage 读取类型，`bun run compile` 可通过。

相关提交：

```bash
086385f fix: harden translation request lifecycle
```

### 3. Popup 使用体验增强

已完成：

- popup 输入草稿自动保存。
- popup 关闭或刷新后，未发送的文本和图片会自动恢复。
- 新增 `清空` 按钮，可一次清理当前输入、图片、结果和草稿。
- API Key 未配置时，直接显示错误卡片，并提供 `去设置` 入口。
- 翻译失败时，不再把错误混进译文正文，而是展示独立错误卡片。
- 翻译失败后支持 `重试`。
- 翻译中支持 `停止`。
- 历史记录项新增：
  - `原文`：复制历史原文。
  - `译文`：复制历史译文。
  - `重译`：用历史原文重新发起翻译。
  - 保留原来的 `恢复` 和 `删除`。
- 历史记录复制成功后会短暂显示 `已复制`。

相关提交：

```bash
9e958a6 feat: improve popup translation workflow
```

## 当前分支与远端状态

当前开发分支：

```bash
feat-col_reasoning-lhg
```

远端仓库：

```bash
https://github.com/davidLi17/humanTextReact.git
```

今日最终推送范围：

```bash
1d87273..9e958a6  feat-col_reasoning-lhg -> feat-col_reasoning-lhg
```

## 构建与打包结果

已运行：

```bash
bun run build
bun run zip
```

结果：

- 构建目录：`.output/chrome-mv3/`
- 可分发 zip：`.output/human-language-translator-1.3.0-chrome.zip`
- zip 大小：约 `143.35 KB`

## 开发者教程

### 1. 克隆项目

```bash
git clone https://github.com/davidLi17/humanTextReact.git
cd humanTextReact
git checkout feat-col_reasoning-lhg
```

### 2. 安装依赖

项目约定使用 Bun：

```bash
bun install
```

如果本机出现证书错误，例如 `UNKNOWN_CERTIFICATE_VERIFICATION_ERROR`，优先检查本机网络代理、公司证书、Node/Bun 证书链配置。今天构建验证时，现有依赖环境可以正常执行 `bun run build`，但 `bun install` 曾因为本机证书校验失败中断。

### 3. 本地开发

Chrome 开发模式：

```bash
bun run dev
```

Firefox 开发模式：

```bash
bun run dev:firefox
```

TypeScript 检查：

```bash
bun run compile
```

生产构建：

```bash
bun run build
```

生成可分发 zip：

```bash
bun run zip
```

### 4. 本地加载 Chrome 扩展

1. 打开 Chrome。
2. 进入 `chrome://extensions/`。
3. 打开右上角 `开发者模式`。
4. 点击 `加载已解压的扩展程序`。
5. 选择项目下的：

```text
.output/chrome-mv3/
```

### 5. 分发给其他用户

发送这个 zip 文件即可：

```text
.output/human-language-translator-1.3.0-chrome.zip
```

对方如果是普通使用者，可以解压后在 Chrome 扩展页加载解压目录。若后续上架 Chrome Web Store，则使用该 zip 作为提交包的基础。

## 用户使用教程

### 1. 配置 API Key

1. 打开扩展 popup。
2. 点击 `设置`。
3. 填写 API Key、API 地址、模型名等配置。
4. 保存后回到 popup。

如果 API Key 没有配置，点击翻译时会显示明确错误，并提供 `去设置` 按钮。

### 2. 翻译文本

1. 在输入框粘贴或输入要翻译的文本。
2. 点击 `翻译`。
3. 也可以使用 `Ctrl + Enter` 发送。
4. 翻译过程中可以点击 `停止`。
5. 如果失败，可以点击 `重试`。

### 3. 使用图片输入

1. 聚焦 popup 的翻译区域。
2. 使用 `Ctrl + V` 粘贴剪贴板图片。
3. 图片会出现在预览区。
4. 点击图片角上的删除按钮可移除图片。
5. 带图片时点击 `翻译`，会将图片和文本一起提交。

### 4. 草稿恢复

现在 popup 会自动保存未发送草稿：

- 输入中的文本会自动保存。
- 粘贴的图片也会自动保存。
- popup 关闭后重新打开，会恢复草稿。
- 点击 `清空` 会删除当前草稿、图片和结果。

### 5. 使用历史记录

点击 `历史记录` 可查看历史翻译。

每条历史现在支持：

- `原文`：复制历史原文。
- `译文`：复制历史译文。
- `重译`：用这条历史原文重新翻译。
- `恢复`：恢复原文、译文和思维链结果。
- `删除`：删除这条历史。

历史面板底部支持：

- `清空`：清空全部历史。
- `导出`：导出历史 JSON。
- `导入`：导入历史 JSON。

## 今日验证记录

今日已验证：

```bash
bun run compile
bun run build
bun run zip
```

验证结果：

- TypeScript 检查通过。
- Chrome MV3 生产构建通过。
- zip 打包通过。
- git 推送完成。

## 后续建议

短期不要继续堆太多新功能。下一阶段更适合做小范围打磨：

1. 历史记录搜索结果展示原文摘要 + 译文摘要。
2. README 同步 Bun 工作流和分发教程。
3. 解决本机 `bun install` 证书问题，确认稳定 lockfile。
4. 做一次手动回归：API Key 配置、普通文本翻译、图片粘贴、失败重试、历史重译、zip 加载。
