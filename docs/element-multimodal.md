# 网页标记与多模态问答（未发布）

## 使用与边界

在侧栏点击「选择网页元素」，网页悬停高亮、点击锁定，填写问题后「加入待发送」。可扩大父级、返回上一层、按 Esc 取消锁定（再次 Esc 退出）。确认只生成快照，不调用模型。侧栏展开「查看实际发送快照」检查内容，统一「发送给AI」。发送期间不允许从标记清单抢占既有请求；既有输入框排队/取消逻辑保持原样。标记发送后保留并显示「已发送」，后续只发送新标记或修改了问题的标记，避免重复提交。可删除不再需要的标记。

每页最多6个标记；每个文本最多8000字符，问题最多2000字符，PNG最长边1600像素、最多512KB。表格用制表符区分单元格，代码保留换行。截图只包含所选元素与当前视口交集，不自动滚动拼接，范围说明显示截断情况。表单、iframe/object/embed、自定义元素及可识别的Shadow DOM在截图中遮盖，表单文本不提取。双指缩放拒绝截图并提示重选，普通浏览器缩放和DPR由实际截图尺寸/视口尺寸换算。浏览器截图API先返回视口画面，后台立即裁切及遮盖；完整画面不保存、不传给侧栏或模型。

目标引用仅存在内容脚本内，不跨扩展消息；目标删除、文本或图片来源变化后标记失效，不靠选择器重新绑定其他节点。发送前重新校验。已发送快照作为消息文本和图片持久化，追问和重开侧栏复用快照；页面刷新后待发送标记不会恢复为活动DOM目标。

最终不新增host_permissions，沿用原有activeTab。首次截图前需在当前网页点击扩展图标，或执行原有右键菜单「打开人话侧边栏」；Chrome原生命令快捷键也可授予临时访问。单纯在持久侧栏或内容脚本内点击不是授权依据；截图被拒绝时给出上述提示，不自动申请全站权限。仍只在确认标记后截图。受限浏览器页面不支持选择。没有复制VisBug源码，选择器是独立只读实现，未引入编辑、删除网页或剪贴板操作。

## DeepSeek官方接口核实（2026-10-17）

- https://api-docs.deepseek.com/ ：`deepseek-flash` 当前由 DeepSeek-V4.1-Flash-1017 提供。
- https://api-docs.deepseek.com/guides/vision/ ：图片位于user消息的content数组，`{type:"image_url",image_url:{url:"data:image/png;base64,..."}}`；可与text块并列。每请求48MiB，图片只允许user角色。
- https://api-docs.deepseek.com/guides/thinking_mode/ ：顶层`thinking:{type:"enabled"|"disabled"}`；启用时默认high，响应思考字段`reasoning_content`。普通无工具追问不必回传思考内容。

配置沿用现有完整地址 `https://api.deepseek.com/v1/chat/completions`、模型 `deepseek-flash`；不新增凭据，不做纯文本降级。API错误经现有请求错误通道显示；不支持图片的模型应更换配置，不能静默剥离截图。测试仅本地mock，不验证用户实际账号配额或密钥。

## 交互参考

参考 GoogleChromeLabs/ProjectVisBug（https://github.com/GoogleChromeLabs/ProjectVisBug）和 node-projects/ProjectVisBug2（https://github.com/node-projects/ProjectVisBug2）的悬停、锁定和父层导航思路。两者以Apache-2.0授权；本实现未复制其源码，因此没有引入它们的网页编辑工具及副作用。

## What's changed（中文）

- 新增元素选择模式和就地问题输入；支持父层扩大/返回、编号标记、摘要悬停、退出与Esc取消。
- 新增侧栏标记清单，支持双向悬停回显、修改问题、删除和统一发送；生成快照不调用模型。
- 新增有界文本及局部真实截图附件，显式显示截图范围/文本截断，并遮盖表单等嵌入内容；失效目标需重新选择。
- 复用原多模态发送、请求身份、取消、预算与会话恢复路径；已发送截图参与后续追问。
- 设置页补充DeepSeek视觉模型说明，图片API错误给出可操作提示；未更改用户密钥或版本号。

## 本轮验证结果与交付

基线为最新 `origin/main` 的 `4121b75c40981fd2e241820303baee9975d9b411`，工作分支 `work`；开始时工作区干净。代码本地提交保留（提交号见交付BUILD_INFO），未推送、未发布，版本仍为1.8.0。

- Bun 1.4.0：类型检查通过；快速测试502通过，组件测试60通过；Chrome生产构建通过。WXT现有Vite选项弃用提示不影响构建。
- Chromium 154普通页面浏览器测试：1通过。使用真实ElementPicker、ElementMarks、后台裁切与消息序列化模块，只模拟扩展传输/浏览器截图API入口。截图来自Playwright的实际页面渲染；覆盖DPR=2、裁切尺寸、遮盖像素、去除overlay、代码换行、文本上限、双向hover、父层导航、修改问题、待发送/已发送、多标记、视口外范围、追问恢复、失效和清理。
- 侧栏App组件集成测试验证真实发送入口的请求ID、截图payload、持久化和恢复后追问；未调用真实模型或读取用户密钥。
- **真实扩展全链路E2E尚未完成**：选定系统Chromium受 `/etc/chromium/policies/managed/extensions.json` 的 `ExtensionInstallBlocklist: ["*"]` 限制，加载扩展被拒绝，测试停在harness setup；Playwright官方浏览器下载被网络策略以403拒绝。没有修改受管策略。真实扩展E2E用例已补入 `tests/e2e/extension.pw.ts`，需在允许加载扩展的环境运行全部回归。
- 当前构建：`/workspace/humanTextReact/.output/chrome-mv3`（含BUILD_INFO.txt）；证据：`artifacts/element-evidence/`。没有同步用户Mac上的Chrome加载目录，本执行环境是Linux且没有该目录。
- 支持普通浏览器缩放和DPR换算；双指缩放目前明确拒绝并提示重选。截图遮盖可识别表单、嵌入内容和自定义元素；不穿透不可访问的封闭DOM。

复验命令（正常可加载扩展的环境）：`bun run test`、`bun run compile`、`bun run build`、`bun run test:e2e:built`。普通页面模块验证可单独运行 `bunx playwright test tests/e2e/element-browser.pw.ts`。

## 最终权限diff

与4121b75相比：`wxt.config.ts`无差异；构建manifest的permissions、host_permissions、optional_host_permissions与基线相同。permissions仍为contextMenus、storage、activeTab、tabs、sidePanel；host_permissions和optional_host_permissions均不存在。content_scripts.matches的<all_urls>是原有设置，并不是新增host permission。已撤回早期草稿中新增的host_permissions行。

Chrome官方依据：https://developer.chrome.com/docs/extensions/develop/concepts/activeTab 。action、扩展右键菜单和commands API的用户调用授予临时访问；普通网页click或sidepanel按钮本身不列为授权手势。captureVisibleTab仍由浏览器检查授权，拒绝时不保存快照、不调用模型。本环境未能实测真实授权成功路径，因此不声称已验证该路径。

## 测试数量与覆盖审计

基线快速测试495、组件59，共554项。先前报告559项的净新增5项为：elementSnapshot.test.ts中4项（裁切边界、快照重放、DeepSeek thinking字段、图片错误提示）以及SidepanelApp.component.tsx中1项（真实App发送入口/请求ID/持久化追问）。既有2处监听器断言随新增监听器更新，不计为新增测试。

最终快速测试502、组件60，共562项：本轮另加3项，验证截图授权拒绝提示、会话容量预检和来源URL去除查询参数/片段/凭据。另有1项独立普通页面浏览器测试通过；新增真实扩展E2E用例1项尚未执行到功能断言，不计入通过数。

普通页面浏览器断言：点选期间不触发页面button；Esc取消锁定；hover有高亮；扩大父级/返回后选中正确区域；填写并确认后出现编号和问题；确认时没有模型payload；网页dot→侧栏与侧栏→网页双向高亮；实际PNG尺寸等于CSS尺寸×DPR2；表单区域像素为遮盖色，边缘像素为原页面背景色（无overlay边框）；文本不含input值、保留代码换行；真实提取器截断9000字符到上限；编辑问题后只在统一发送时生成image_url+text；localStorage往返后的追问保留同一image；退出模式后页面button正常；第二标记显示超视口范围；已发送标记失效不阻塞新的待发送项，待发送项失效则禁止发送；删除与destroy清理标记。

未验证：真实Chrome扩展加载、activeTab授权成功、真实captureVisibleTab、真实runtime/tabs路由与service worker生命周期；真实侧栏打开/关闭；真实提供商与账号配额；任意浏览器缩放百分比、双指缩放（当前明确拒绝）、跨源iframe/封闭Shadow DOM/自定义元素遮盖的全部组合；六张最大图片、真实storage.local配额耗尽、截图期间滚动/导航/DOM变动的并发压力；旧功能全部浏览器E2E回归。本轮普通页面的截图入口和消息传输被模拟，裁切/遮盖与UI模块为生产源码；不能等同完整扩展E2E。

## 快照边界审计

- 每标记8000文本字符+2000问题字符，单页最多6标记；6个满文本标记已超过原有48000请求字符预算，发送会暂停，需选择更小区域或分批删除/发送。原预算也包含历史与系统提示，未为标记绕过限制。
- 每图512KiB原始PNG，base64约683KiB，6图约4MiB；API接收数组中的图片与文本。持久化images中只保存一份图片，elementSnapshots只保留元数据，不再重复保存图片。未做图片token估算；保留原文本字符预算，DeepSeek实际图片token由服务商计算。
- 新增标记发送前，对全部会话JSON+候选消息按UTF-8字节预检，保守上限6MiB并预留1KiB结构空间，超限不发请求、不删数据、保留待发送标记。该上限为后续答案及其他本地键留余量，但不保证所有storage.local键总和永不超额；真实写入失败沿用串行存储失败提示，明确关闭后可能不能恢复。普通旧图片上传路径未被重写。
- 待发送DOM目标仅存内存；标签页切换/清单变动会要求检查预览，已删除、隐藏、URL变化、文本/图片来源变化会失效，不按CSS选择器猜测重绑。CSS背景/Canvas动画等不在指纹全面检测范围内；已保存截图是历史快照，不是实时同步画面。
- 页面普通input/textarea/select/contenteditable文本不提取，截图遮盖其矩形；iframe/object/embed、自定义元素和可识别shadow宿主整体遮盖。无法识别附着于普通元素的封闭shadow根，也不做任意网页敏感文本分类；这些情况必须由用户预览判断。整页原始截图仅在后台暂存以裁切，从不存储或交给模型。截图期间目标/几何/遮罩变化会丢弃本次结果，但相关并发分支未做真实扩展压力验证。

来源URL只保留origin+pathname，移除query、fragment和URL用户凭据，防止将查询参数中的表单值或token作为来源信息发送；完整URL仅留在内容脚本内用于失效判断。路径本身及用户选择的普通可见文本不进行通用敏感内容分类。
