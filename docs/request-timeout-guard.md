# 请求超时保护

## 默认边界

- 等待 `fetch` 响应头：20 秒。
- 等待首个有效正文或 reasoning：普通模式 60 秒，深度思考 180 秒。
- 已开始输出后的有效内容空闲时间：60 秒。
- 单次翻译总时限：10 分钟。
- 非 2xx 错误响应体读取、API 连接测试：15 秒。

心跳、仅包含 role 的事件和空白增量不属于有效模型输出，不会刷新首次输出或
空闲计时。超时保留已经送达或累计的正文与思考内容，但请求保持失败状态，
不会写入成功历史，也不会推进网页续读进度。

## Chrome Service Worker 约束

Chrome 扩展 Service Worker 在空闲约 30 秒或 `fetch()` 响应超过约 30 秒时可能
被终止。Chrome 官方迁移指南建议长任务通过周期性调用扩展 API 保持活跃。

本项目只在 `TranslationService` 和 API 连接测试的有界请求生命周期中，每
25 秒调用一次可用的 `runtime.getPlatformInfo()`。请求成功、失败、取消、替换、
超时或收到 `[DONE]` 后立即停止；不使用全局常驻定时器、不读写 storage、
不申请额外权限，也不把保活调用视为模型输出。

- [Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Keep a service worker alive until a long-running operation is finished](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
