# 测试维护说明

## 一、测试分层

测试按责任放入固定目录，文件位置表达它保护的边界：

- `unit/`：纯函数、独立状态机和无需浏览器环境的单模块行为。失败通常能直接定位到一个模块。
- `contracts/`：校验静态源码、样式令牌和跨文件约定，防止构建前就能发现的结构契约漂移。
- `integration/`：覆盖多个生产模块协作，或需要 Browser API、DOM、网络等受控环境替身的流程。
- `helpers/`：测试公共工具及其自测。工具自测属于默认测试集，避免隔离基础设施本身失真。
- `components/`：挂载真实 React 组件，执行组件内部 Hook、状态和存储编排；只替换 Browser API 与外部请求边界。
- `e2e/`：启动真实 Chromium 和构建后的 MV3 扩展，验证 Content、Background、扩展页面、Storage 与本地模型夹具之间的完整链路。

当前阶段保留已有混合测试文件的完整业务链路，不为追求目录纯度改写或删减用例。新增测试应优先放入职责最匹配的层级。

## 二、验证命令

```bash
# 默认测试集：先执行快速测试，再执行组件测试
bun run test

# 396 个快速测试：unit、contracts、integration 和 helpers
bun run test:fast

# 快速测试分层执行
bun run test:unit
bun run test:contract
bun run test:integration

# 单 Worker 共享进程，默认使用随机种子检测快速测试污染
bun run test:shared

# 指定随机种子，便于复现顺序相关问题
TEST_SEED=123456 bun run test:shared

# 独立 Happy DOM Runner，挂载真实 React 组件（Options / PromptQueue / SidepanelApp）
bun run test:components

# 输出 text 报告，并生成 coverage/lcov.info
bun run test:coverage

# 首次在本机安装 Playwright Chromium
bunx playwright install chromium

# Linux 或 CI 首次安装浏览器及系统依赖
bunx playwright install --with-deps chromium

# 先构建 Chrome MV3，再运行真实扩展 E2E
bun run test:e2e

# 已确认 .output/chrome-mv3 为当前源码构建时，仅运行 E2E
bun run test:e2e:built

# TypeScript 静态检查
bun run compile
```

项目根目录的 `.bun-version` 固定 Bun 1.4.0。持续集成在 `push` 和 `pull_request` 上从该文件读取版本，依次执行冻结锁文件安装、类型检查、快速测试、共享进程随机顺序测试、组件测试和覆盖率报告。独立 E2E Job 安装 Playwright Chromium、构建扩展并运行真实 MV3 流程。覆盖率以 text 与 LCOV 两种格式输出到已忽略的 `coverage/`；Playwright 截图、Trace 和 HTML 报告输出到已忽略的 `artifacts/`。CI 即使前序步骤失败也会尝试上传这些诊断目录。工作流只读仓库内容，不部署，也不读取业务密钥。

## 三、隔离规范

- 测试覆盖 `browser`、`chrome`、`window`、`document`、`navigator`、`fetch` 或计时器前，使用 `preserveGlobals` 保存完整属性描述符。
- 使用 `setTestGlobal` 安装测试值；在 `afterEach` 或 `finally` 中调用恢复函数。原属性不存在时，恢复后仍应不存在。
- 只修改当前用例新建 Mock 的内部字段。共享对象、生产类静态方法和模块级替身必须在用例结束时恢复。
- 异步测试等待真实回调、事件或受控 Promise，禁止用固定毫秒数猜测完成时间。
- 通用存储替身使用 `tests/helpers/testEnvironment.js`；场景特有行为留在测试文件内，避免公共 Mock 隐藏业务条件。
- 安全边界保持独立断言，包括跨站脚本攻击（XSS）、密钥脱敏、危险 URL、权限失败、超时和请求竞态。

## 四、覆盖率的含义与盲区

`bun run test:coverage` 报告 396 个快速测试实际加载到的生产文件覆盖率。`bunfig.toml` 使用 `coveragePathIgnorePatterns = ["tests/**"]`，因此 text 与 LCOV 都排除了测试和辅助文件。本次核对时运行 `bun run test:coverage` 的输出为函数覆盖率 77.52%、行覆盖率 77.20%（口径：396 个快速测试、Bun 1.4.0、该次提交的源码），LCOV 的 `SF:` 路径仅包含 `entrypoints/**` 和 `shared/**`。这是核对当时的快照，不是承诺值，请以重新运行的输出为准。

覆盖率适合发现已进入测试图的分支空白，但不能代表整个扩展的全量覆盖率：未被快速测试导入的文件不会自然出现在统计中。组件测试使用独立 Runner，当前没有并入这份覆盖率，避免把 Happy DOM 全局环境带入快速测试。配置语义见 [Bun 官方代码覆盖率指南](https://bun.com/docs/test/code-coverage)。

当前报告尤其不能证明以下真实浏览器行为：

- 组件测试只覆盖了三个文件（`SidepanelApp.component.tsx` 的真实输入发送、requestId 流式隔离、完成态持久化、监听清理与会话恢复，`Options.component.tsx` 的设置页渲染与保存交互，`PromptQueue.component.tsx` 的提示词排队）；Popup、Content Script 以及这三个组件的其余交互仍待补。
- Chrome 与 Firefox 的扩展消息通道、Service Worker 唤醒、Side Panel 生命周期和权限行为。
- 真实 Selection、Shadow DOM、跨节点选区、剪贴板、`contenteditable` 和跨域 iframe。
- 扩展安装、升级、刷新后的存储迁移、配额限制及完整用户主流程。

因此当前阶段只持续产出覆盖率报告，不设置缺少基线依据的覆盖率阈值。Happy DOM 能验证 React、Hook 与 DOM 交互，仍不能代替真实 Chrome 扩展端到端测试、布局计算、权限和跨上下文消息通道。

## 五、组件测试边界

- `tests/components/preload.ts` 负责注册 Happy DOM、补齐必要 DOM 能力，并通过 Bun 插件忽略 CSS/Less 内容。
- `*.component.tsx` 没有使用 Bun 默认识别的 `.test.*` 命名；`test:components` 通过显式目录通配符收集当前和未来组件文件。
- React Testing Library 每个用例后显式 `cleanup`，随后恢复 Browser API 全局描述符、根节点主题属性和完整原始 `style` 属性。
- 测试执行真实 `SidePanelApp`、`Options` 和 `PromptQueue` 组件、内部 Hook、状态转换、消息处理和存储协调器；Browser API 与后台通信是受控边界。
- 快速测试的 `test:shared` 固定 `--parallel=1 --no-isolate --randomize`。不设置 `TEST_SEED` 时每次生成随机种子，失败日志中的种子可用 `TEST_SEED=<seed>` 原样复现。

## 六、真实扩展 E2E 边界

- Playwright 使用 `chromium.launchPersistentContext`、临时独立 Profile、`channel: "chromium"` 和无头模式加载绝对路径 `.output/chrome-mv3`，从实际 Service Worker URL 解析扩展 ID；每个用例结束后关闭 Context 并删除临时 Profile，不连接日常 Chrome。实现方式遵循 [Playwright 官方 Chrome 扩展测试指南](https://playwright.dev/docs/chrome-extensions)。
- 本地 `node:http` 服务提供文章、长文和 OpenAI 兼容 SSE。API Key 仅为虚构夹具值，请求体会在进程内记录供断言；模型地址固定为回环地址，不消耗真实模型或外网额度。
- Browser Context Route 允许回环地址，阻止并记录意外 HTTP(S) 外网请求；测试结束时断言没有发生外网请求。
- 当前三条流程覆盖：真实 Range 选区到网页浮窗翻译；真实长文首段、关闭重开 Sidepanel 和继续第二段；Popup、Sidepanel、Options 与网页扩展浮层的字号 Storage 同步和宿主字号隔离。
- Sidepanel 与 Popup 在测试中作为普通扩展页面打开，因此覆盖 React 页面内容与扩展 API，未覆盖 Chrome 原生侧栏壳、工具栏弹出壳的尺寸和开关行为。
- Chrome 原生快捷键分发、浏览器安装/升级界面、真实权限弹窗、Service Worker 长时间休眠唤醒和 Firefox 仍需后续真实浏览器验证。本阶段不宣称全覆盖。
