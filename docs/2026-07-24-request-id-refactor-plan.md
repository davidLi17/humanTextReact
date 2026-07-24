# Request ID 完整重构计划

## 目标

为每次翻译分配唯一 `requestId`，让请求创建、流式更新、完成、错误和取消都能精确
对应同一次翻译。重构后，迟到的旧消息不能覆盖新结果，不同标签页和不同入口也不会
互相误取消。

本计划只描述后续重构，不在当前 Bug 修复中实施。

## 消息协议

在共享类型中新增以下字段：

```ts
interface TranslationMessageBase {
  requestId: string;
}

type TranslationTarget =
  | { kind: "popup" }
  | { kind: "tab"; tabId: number; surface: "selection" };
```

协议规则：

1. Popup 发起普通翻译、重试或历史重译时，使用 `crypto.randomUUID()` 生成
   `requestId`。
2. 右键菜单和快捷键由后台生成 `requestId`，并在
   `showTranslationPopup` 中一并发送给 Content Script。
3. `translate`、`updatePopupTranslation`、`updateContentTranslation` 和
   `cleanup` 都携带 `requestId`。
4. 完成和错误继续使用现有更新消息，通过 `done` 或 `error` 表示，但必须携带
   同一个 `requestId`。
5. `requestId` 只存在于运行时状态，不写入设置或历史记录。

## 请求管理器

`RequestManager` 改为维护两张表：

```ts
Map<string, {
  controller: AbortController;
  targetKey: string;
  tabId?: number;
}>

Map<string, string> // targetKey -> active requestId
```

`targetKey` 规则：

- Popup 使用 `popup`。
- 页面选中文字翻译使用 `tab:${tabId}:selection`。后续新增侧边栏等入口时使用新的
  `surface`，不会与当前页面弹窗互相取消。

管理接口：

- `createRequest(requestId, target)`：取消相同 `targetKey` 的旧活动请求，登记新请求。
- `cleanupRequest(requestId)`：只取消指定请求。
- `cleanupTarget(target)`：取消一个 Popup 或标签页上的全部请求，用于兼容和页面关闭。
- `completeRequest(requestId)`：删除请求；只有该 ID 仍是目标当前活动请求时，才清理
  `activeByTarget`。
- `isActiveRequest(requestId, target)`：供发送更新前检查请求是否仍然有效。

任何旧请求完成或报错时，都不能删除后来创建的新请求。

## 各入口数据流

### Popup

1. 用户点击翻译时生成 `requestId`，写入 Popup 的 `activeRequestId`。
2. 发送 `translate`，后台按 `popup` 目标创建请求。
3. Popup 只处理 ID 等于 `activeRequestId` 的流式更新、完成和错误。
4. 重试和历史重译生成新 ID，不复用失败请求的 ID。
5. 停止按钮和 Popup 关闭事件发送 `{ action: "cleanup", requestId }`。

### 右键菜单和快捷键

1. 后台生成 `requestId`。
2. 后台按 `tab:${tabId}:selection` 创建请求，并向 Content Script 发送包含该 ID 的
   `showTranslationPopup`。
3. `PopupManager` 保存当前页面弹窗的 `requestId`。
4. Content Script 只将匹配当前 ID 的更新交给弹窗，迟到消息直接忽略。
5. 关闭页面弹窗时发送包含当前 ID 的 `cleanup`。

### 标签页关闭

`tabs.onRemoved` 调用 `cleanupTarget({ kind: "tab", tabId })`，清理该标签页仍在运行的
全部请求，不依赖某一个 ID。

## 兼容策略

扩展更新时，旧 Content Script 可能继续存在于已打开的页面中，因此采用一版宽松
兼容：

- 后台收到没有 `requestId` 的 `translate` 时生成 ID，并按发送者推断目标。
- 后台收到没有 `requestId` 的 `cleanup` 时，按发送者标签页或 Popup 目标取消当前
  活动请求。
- 新 Popup 或 Content Script 收到没有 ID 的旧更新时，仅在当前恰好有一个活动请求
  时接收；否则忽略并记录调试日志。
- 旧 Content Script 会忽略新增字段，因此新后台发送带 ID 的消息仍可正常显示。

兼容逻辑保留一个版本周期，后续确认旧页面比例足够低后再单独删除。

## 错误和取消

- API、网络、解析和空响应错误都携带原请求 ID。
- 用户主动取消不展示为失败；界面进入已停止状态，并忽略该 ID 后续到达的消息。
- 消息接收端关闭时，只取消对应 ID，不影响同一标签页未来可能存在的其他请求。
- 后台发送每次更新前检查请求是否仍然活动，避免取消后的缓冲内容继续投递。

## 测试计划

使用 Bun 内置测试能力，不增加测试框架依赖：

1. `RequestManager`：创建、完成、按 ID 取消、按目标取消，以及旧请求完成不删除新请求。
2. Popup：匹配 ID 的更新生效，不匹配 ID 的更新被忽略。
3. Content Script：旧页面弹窗不接收新弹窗之外的迟到消息。
4. 兼容：缺少 ID 的旧翻译和取消消息仍可工作。
5. 并发：两个标签页同时翻译互不影响。
6. 切换：同一标签页快速发起两次翻译，只显示第二次结果。
7. 取消：停止一个请求不会取消另一个标签页请求。
8. 回归：普通 Popup、历史重译、右键菜单和 `Alt+H` 均能完成。

验证命令：

```bash
bun test
bun run compile
bun run build
```

## 实施顺序和提交

1. `refactor: add request id protocol types`
   - 增加共享消息类型、目标类型和兼容字段。
2. `refactor: manage translation requests by id`
   - 重写请求管理器并补充 Bun 单元测试。
3. `refactor: route background translations by request id`
   - 更新后台翻译、右键菜单、快捷键、取消和标签页清理。
4. `refactor: guard popup and content updates by request id`
   - 更新 Popup 状态和页面弹窗消息过滤。
5. `test: cover request id translation flows`
   - 补齐跨入口和兼容场景，运行完整构建验证。

每个提交都必须通过相关测试和 `bun run compile`；最后统一运行 `bun run build`。

## 验收标准

- 每个翻译请求和每条更新都能通过同一个 `requestId` 追踪。
- 旧响应无法覆盖新请求的界面状态。
- 精确取消不会影响其他请求。
- 两个标签页可以同时翻译。
- 更新期间旧 Content Script 不会立即失效。
- 设置、历史记录和 API 请求体保持兼容。
