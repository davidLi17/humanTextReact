# 测试维护说明

## 维护原则

- 一个用例只保护一个可观察的业务边界；组合纯函数不能冒充端到端测试。
- 同类输入优先使用表驱动，异常分支和跨模块契约保持独立用例。
- 异步测试等待真实回调或受控 Promise，禁止用固定毫秒数猜测完成时间。
- 修改 `browser`、`chrome`、`window`、`document`、`navigator` 或计时器后，必须恢复进入测试前的全局属性。
- 通用存储和全局恢复使用 `tests/helpers/testEnvironment.js`，场景特有行为通过局部覆盖表达。
- 安全边界不能因精简而合并掉，包括 XSS、密钥脱敏、危险 URL、权限失败和请求竞态。

## 验证命令

```bash
bun test
bun test --randomize
bun test --randomize --no-isolate
bun run compile
```

## 仍需浏览器回归覆盖

当前单元测试使用轻量 DOM 和 Browser API Mock，尚不能证明以下真实浏览器行为：

- Chrome 与 Firefox 中扩展消息通道、Service Worker 唤醒和 Side Panel 生命周期。
- 页面真实 Selection、Shadow DOM、跨节点选区及 `contenteditable` 嵌套行为。
- Clipboard 权限拒绝、`execCommand` 兜底和复制成功态的真实计时显示。
- `chrome://`、商店页、跨域 iframe 和站点注入权限下的正文提取。
- 扩展安装、升级、刷新后的 storage.sync/local 数据迁移与配额限制。

## 本轮单测优化结果

- 测试文件由 19 个精简为 17 个，测试用例由 247 个精简为 205 个；`tests/**` 相对优化前净减少 775 行源码。
- 生词本消息协议和设置监听中的 9 处 `20ms` 固定等待已移除，改为等待真实回调或受控 Promise。
- 重复协议、测试内切片自证及未接入入口的 helper 专属测试已清理；内存存储 Mock 增加深拷贝隔离回归，真实安全、竞态、存储降级和后台多模态边界继续保留。
- 本轮仅调整 `tests/**`，业务源码、依赖、包管理及构建配置均未修改。

## 已核实但尚未修复的业务问题

以下结论来自生产代码静态数据流核对，尚未完成真实浏览器复现，本轮也未修改业务源码。

1. **历史图片会在后续请求中丢失**
   - 证据：[常规历史只映射 role/content](../entrypoints/sidepanel/App.tsx#L1027-L1043)，后台仅根据收到的 `msg.images` 组装历史图片：[translationService.ts](../entrypoints/background/translationService.ts#L120-L137)。
   - 触发条件：先发送带图消息，随后发送不带新图的追问；续读及编辑、重试中的更早历史轮次也存在同类映射。
   - 修复方向：侧边栏统一使用多模态历史构建函数，或在历史映射中保留 `images`。

2. **网页通读消息没有保存可重放正文**
   - 证据：首次 `pageMeta` 仅保存标题、地址和字数：[App.tsx](../entrypoints/sidepanel/App.tsx#L741-L751)；编辑和重试使用 `excerpt || 展示文本`：[App.tsx](../entrypoints/sidepanel/App.tsx#L1176-L1188)、[App.tsx](../entrypoints/sidepanel/App.tsx#L1280-L1292)。
   - 触发条件：网页通读完成或失败后，对网页消息执行编辑、重新生成或错误重试。
   - 修复方向：先确定首段正文持久化、重新提取网页或禁用重放能力的产品存储策略。

3. **续读请求失败仍会推进或删除进度**
   - 证据：进度在请求前更新，最后一段直接删除：[App.tsx](../entrypoints/sidepanel/App.tsx#L896-L911)；失败分支只更新错误卡片，没有恢复进度：[App.tsx](../entrypoints/sidepanel/App.tsx#L936-L964)。
   - 触发条件：发送任一续读分段时发生消息传输失败或后台返回失败响应。
   - 修复方向：确认响应成功后再提交进度，失败时保留当前分段供重试。

4. **API Key 校验值与请求头使用值不一致**
   - 证据：校验使用 `params.apiKey || config.apiKey`，请求头却固定使用 `config.apiKey`：[translationService.ts](../entrypoints/background/translationService.ts#L181-L218)。
   - 触发条件：调用参数携带的 Key 与后台读取到的配置 Key 不同，例如设置更新竞态或调用方显式覆盖。
   - 修复方向：Authorization 请求头使用已经解析并通过校验的 `apiKey` 变量。

## 多模态测试边界说明

当前保留的多模态测试只保护 `translationService` 的后台载荷格式化、图片去重、当前轮图片注入和 system 消息边界。`chatTypes` 中未被 `App.tsx` 接入的 payload helper 专属测试已经移除；测试不证明真实侧边栏入口会保留历史图片，也不代表删除了已接线的真实业务行为。
