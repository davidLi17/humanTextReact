# 标签页独立侧栏预览

基于 v1.9.0（9f24234），仅在 feat/tab-bound-sidepanel 开发验证，不发布商店。

## 官方语义与实现

- [Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)：必须先提交 tabId 对应的 path 和 enabled 配置，再 open({tabId})。真实 Chrome 153 测试发现等待 setOptions Promise 后再 open 会丢失用户手势；实现按顺序立即提交两个调用，最后联合等待结果。只传 tabId 可能回退到全局侧栏。官方明确说明，切到未启用标签页时隐藏，返回原标签页时恢复。
- [官方按站点示例](https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.sidepanel-site-specific/service-worker.js)：用每个标签页的 setOptions 控制可用性。
- [官方打开示例](https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.sidepanel-open/service-worker.js)：打开需要用户手势；旧示例的调用顺序不能直接替代本项目关闭全局面板后的配置流程。
- [Service Worker 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)：全局变量不能作为重启后的持久状态。

禁用默认全局侧栏。用户明确打开时，才为当前标签页配置独立路径 sidepanel.html?tabId=ID。浏览器负责切换时的显示/隐藏；onClosed 后禁用对应标签页，直到用户明确打开。不在切换标签页事件里自动 open，也不把 getOptions 的 enabled 误当成可见状态。侧栏从自身地址获取归属，读取网页时定位该标签页。

保留共享历史；活动会话与未发送草稿按标签页存储在 storage.session。历史写入在 Web Lock 内合并变化记录，避免隐藏页用旧快照覆盖另一页的新内容。待处理划词/阅读上下文也按标签页隔离。关闭标签页清理临时草稿与待处理项，保留历史消息。

## Chromium 边界与待验证项

- [355266358](https://issues.chromium.org/issues/355266358)、[344767733](https://issues.chromium.org/issues/344767733)：用户手势相关问题，需真实扩展浏览器验证，mock 不能证明可打开。
- [40912790](https://issues.chromium.org/issues/40912790)：侧栏所属标签页识别；通过自有配置路径显式携带归属。
- [403765214](https://issues.chromium.org/issues/403765214)：关闭事件能力演进。onOpened 从 Chrome 141，onClosed 从 142 提供；本功能依赖后者，最低版本从 141 调整为 142。
- [Chromium 关闭通知实现](https://chromium.googlesource.com/chromium/src.git/+/f7bbb7bc33939a62ded71554c29a24ddda72b995)：关闭/替换均可能发事件，不能简单解释成用户点击关闭。
- [Chrome 154 后台标签页关闭报告](https://issuetracker.google.com/issues/567713217)及[复现代码](https://github.com/pixiebrix/chrome-154-sidepanel-background-tab-close)：报告存在关闭后台已配置标签页时前台侧栏被关闭的问题。未确认当前版本修复，不为所有标签页预配置侧栏，仍需单独验收此浏览器边界。

部分 issue 正文需要登录；以上不宣称其已修复或有官方稳定承诺。

Chrome 153 实测仅调用 close({tabId}) 后，切至另一个已打开侧栏的标签页再返回，会恢复原侧栏。因此不能只依赖原生 close 记忆；需 onClosed 中禁用该标签页，明确打开时再次启用。

## 验收路线

A 打开并输入草稿 → B/C 未开启时隐藏 → A 恢复 → B 独立开启并输入另一草稿 → A/B 各自保留 → A 刷新/导航 → 关闭 A 侧栏 → 切换后 A 仍关闭 → 手动重开恢复草稿。另查多窗口、后台标签页关闭、worker 重启、划词归属和已有翻译/标记流程。

本地类型检查与 567 项单元/组件测试已通过。[真实扩展 CI 39068988577](https://github.com/davidLi17/humanTextReact/actions/runs/39068988577) 已通过：14 项浏览器测试（13 项真实扩展、1 项 mock transport 浏览器测试），Chromium 153.0.8010.12。其中原生侧栏覆盖 A/B/C 切换、独立草稿、关闭不重开、重开恢复、刷新/导航、多窗口、Worker 停止后唤醒、后台已配置标签页关闭。实际原生侧栏截图见交付包 native-tab-A.png。本地浏览器受管理策略限制，未绕过策略。自动化 close API 不能等同于人工点击浏览器 X，仍需用户在目标 Chrome 上人工验收点击 X；Chrome 142 最低版本与 Chrome 154 的报告尚未分别实测。

当前环境为 Linux，无法更新 AGENTS.md 中的 /Users/bytedance/lhg-Project/ 固定 Chrome 加载目录；通过预览包交付。

## What's changed

1. 侧栏跟随当前标签页：未开启的页面不展示，返回已开启页面恢复。
2. 每个标签页保留自己的活动会话、草稿、图片和选区上下文，共享可检索历史。
3. 原生关闭后禁用该标签页侧栏，切回不自动重开；明确打开时恢复草稿。
4. 网页读取、标记与待处理划词消息使用明确标签页归属，防止串页。
5. 最低 Chrome 版本升到 142，以使用原生关闭事件。

预览验收时把 ZIP 解压到独立目录，通过 chrome://extensions 开发者模式加载已解压扩展。本次未改 main、未打标签、未提交商店。请勿将此包当作已发布 1.9.0 商店包。
