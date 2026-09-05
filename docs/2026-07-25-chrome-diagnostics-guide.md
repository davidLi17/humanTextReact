# Chrome 扩展诊断日志指南

## 遇到问题时

1. 打开扩展设置页，找到“问题诊断”。
2. 点击“开启 30 分钟诊断”。
3. 回到出现问题的页面，重新执行翻译、右键菜单或 `Alt+D`（macOS 为 `Option+D`）。
4. 返回设置页，确认记录数量和错误数量已更新。
5. 点击“复制日志”发送给开发者，或点击“下载 JSON”保留文件。
6. 完成后点击“停止诊断”；不再需要时点击“清空日志”。

诊断会话在 30 分钟后自动停止。记录仅保存在当前浏览器会话中，浏览器重启、扩展
更新或重载后会清除。

## 诊断记录内容

每条记录包含：

- 时间、日志级别和扩展版本。
- Background、Content Script、Popup 或 Options 执行上下文。
- 日志命名空间。
- 可用时记录翻译 `requestId`，用于串联一次翻译的完整过程。
- 已脱敏的错误和结构化调试信息。

以下内容不会进入诊断文件：

- API Key、Authorization、Token、Cookie 和密码。
- 完整原文、译文、提示词和思考内容。
- 图片 Base64 数据。
- 完整网页 URL；只保留协议和站点。

## Chrome 原生控制台

诊断导出不足以定位问题时，可以查看 Chrome 原生控制台：

- Background：打开 `chrome://extensions`，启用开发者模式，在扩展详情中点击
  Service Worker 的“检查视图”。
- Popup：打开扩展 Popup，在 Popup 内右键并选择“检查”。
- Content Script：打开问题页面的 DevTools，在 Console 的执行上下文中选择扩展
  Content Script。
- Options：在扩展设置页右键并选择“检查”。

打开 Service Worker DevTools 会让 Worker 保持活动。验证 Service Worker 休眠恢复
问题时，应关闭 DevTools 后重新复现。

## 实现约束

- 日志设置使用 `browser.storage`，不使用网页 `localStorage`。
- 日志级别通过 `storage.onChanged` 同步到各扩展上下文。
- 诊断记录由 Background 汇总到 `storage.session`。
- 最多保存 500 条或 512 KB，超出后删除最早记录。
- 日常未开启诊断时不发送诊断收集消息。

参考：

- [Debug extensions](https://developer.chrome.com/docs/extensions/get-started/tutorial/debug)
- [chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
