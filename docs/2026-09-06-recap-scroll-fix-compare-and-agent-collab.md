# 2026-09-06 纪要：滚动修复对比结论、main 打包状态与多 Agent 协作模型

> 本次会话主线：用 Herdr 双子 Agent 对比本地/远端滚动修复 → 拍板以远端为准 → 切 main 打包验证 → 沉淀多 Agent 协作模型。

---

## 1. 分支拓扑：同源分叉，不是两套实现

```
b2def98（共同基础：GPT式智能滚动 + 浮动胶囊 + Popup按钮修复，已在 origin/main）
├── 本地 feat/sidepanel-scroll-ux-opt → 46baf03（强化滚轮感知，仅改 App.tsx +44/-9）
└── 远端 origin/main → 55992f8（Alt+S真开关 + 抽取 scrollState.ts 纯函数模块）
                        └── 20a2674（docs merge，现 main HEAD）
```

- merge-base(HEAD, origin/main) = `b2def98`，即本地独有的只有 `46baf03` 一个提交
- 真正的对比对象：**本地 `46baf03` vs 远端 `55992f8`**

## 2. 滚动修复对比结论

### 相同点（共同继承 + 一致思路）

- 核心模型一致：`isAtBottom` 贴底判定 + `userHasScrolledUp` 上滑锁，自动跟随 effect 均以 `!userHasScrolledUpRef.current` 为前置，杜绝流式输出抢滚动权
- 均有 `wheel`/`touch`/`keydown` 用户意图感知，且挂 `passive: true`；滚回底部自动恢复跟随
- 胶囊指示器、`scrollToBottom()` 清锁均来自共同的 b2def98

### 不同点

| 维度 | 本地 `46baf03` | 远端 `55992f8` |
|---|---|---|
| 方向 | UX 健壮性：防抢占做到极致 | 架构重构 + Alt+S 真开关新功能 |
| 离底阈值 | **15px**（b2def98 的 40px 会让轻微上滑被拽回） | **40px** |
| 滚轮感知 | `deltaY < 0` **立即置锁**，抢在 scroll 事件前覆盖刚离底窗口期 | `markUserScrollIntent` 清程序滚动标志，靠 scroll 位置判定 |
| 跟随滚动 | **瞬时赋值** `scrollTop = scrollHeight`，弃用平滑动画 | 保留平滑滚动 + **750ms 程序滚动豁免窗口** + `isProgrammaticScroll` 防自我误判 |
| 代码位置 | 全部内联 `App.tsx` | 抽出 `scrollState.ts`（34行纯函数）+ 2 个测试文件 |
| 独有功能 | 4 个发消息入口主动清锁；触屏 15px 兜底 | Alt+S 真 close/open（Chrome ≥141 + 500ms 去重）；切会话无条件回底；Alt+H→Alt+D |

### 决策与后续选项

- **本次拍板：以远端为准**（已执行，见 §3），本地 `feat/sidepanel-scroll-ux-opt` 分支原样保留（HEAD `46baf03` 未删）
- 若日后想择优回搬：本地的「wheel 立即置锁」+ 远端的「程序滚动豁免窗口」理论上是更优组合
- 合并命令（在 main 上，冲突以 main/远端为准）：`git merge -X ours feat/sidepanel-scroll-ux-opt`

## 3. 仓库当前状态（2026-09-06）

| 项 | 状态 |
|---|---|
| 分支 | **main @ `20a2674`**（含远端 bug 修复 `55992f8`） |
| 打包 | `bun run build` ✅ 793ms → `.output/chrome-mv3/`（729KB），直接加载该目录即可 |
| 测试 | `bun test` ✅ **187 pass / 0 fail**（645 断言 / 17 文件，含 `sidepanelScrollState` 用例） |
| 本地配置 | `.claude/settings.local.json` 改动经 stash/pop 保留在工作区 |
| Chrome 版本 | 远端版要求 `minimum_chrome_version: 141`（Alt+S 关闭方向依赖）；当前 Chrome 始终最新，无影响 |

## 4. Herdr 使用结论（全链路验证可用）

- 环境：`HERDR_ENV=1` + CLI v0.8.2，workspace/tab/pane 上下文注入正常
- 验证过的能力：`pane split`（--cwd/--no-focus 保工作目录和焦点）→ `agent start`（kind: claude/codex…）→ `herdr-turn prompt`（一次阻塞回合，并行跑多个后台任务）→ transcript 回捞（面板 scrollback 截断时，从 `~/.claude/projects/<dir>/<session-id>.jsonl` 直接取完整答案）
- 实操要点：子 Agent 任务包要小（目标/边界/只读约束/输出格式）；分析类给 10 分钟超时；完成后确认 `idle` 再 `pane close`
- 定位：Herdr 面板 agent 适合「想亲眼盯着、随时插手」的任务；纯后台产出用 Agent 工具/workflow 更省屏幕

## 5. 多 Agent 协作模型（本次讨论核心结论）

### 5.1 容量速查（18 核 / 48GB 机器）

| 方式 | 上限 |
|---|---|
| Workflow 编排 | 同时并发 **16**（= min(16, CPU-2)）；单次规模指引 ≤15（/config 可调）；生命周期硬上限 1000 |
| Agent 工具子 Agent | 无硬上限，实践 3~5 个/次，十几个封顶 |
| Herdr 面板 agent | CLI 无限制，瓶颈是屏幕空间和注意力 |

### 5.2 拓扑决策表（判断标准：需要做几次「跨任务仲裁」）

| 场景 | 拓扑 |
|---|---|
| 同仓库同一摊活 | **1 主 + N 子**（默认） |
| 不同项目/仓库 | 每仓库一个主 Agent（现 workspace 三 tab 形态） |
| 同仓库并行写独立 feature | 主 Agent 各自带 git worktree/分支隔离 |
| 只读分析/调研 | 随便多开 |

### 5.3 分工（+2 / +1 / 大头兵）

```
你（+2）──────── 只管：划地盘（领域不重叠）+ 看汇总（裁决上报的决策点）
 ├── 主 Agent A（+1）── 自主决定开几个大头兵（1~5 个无需请示）
 ├── 主 Agent B（+1）── 大规模 workflow 编排（几十个 agent）需你点头
 └── 主 Agent C（+1）
```

- 子 Agent 间协调免费（汇合在主 Agent 上下文里）；主 Agent 间协调昂贵（靠你的脑子汇合）→ **+1 层数量取决于你愿当几次仲裁者**
- 产出瓶颈在 +1 的任务拆解质量，不在大头兵数量；三路并行时让各路负责互不重叠的领域

### 5.4 核心原则：Context 决定控制权归属

- 谁握有最全的执行上下文，谁拿那一级决策权：**怎么干的细节归主 Agent；干什么/优先级/地盘/花钱闸门归你**
- 反推同样重要：你比它懂的事，正确做法是**把独有 context 灌下去**（CLAUDE.md / memory / 派活时明说），而不是留着控制权亲自管——**每灌下去一条 context，就少一个需要亲自控制的点**
- 即管理上的「任务式指挥」：只交代 what 和 why，how 归一线

---

*生成于 2026-09-06，依据当日会话：Herdr 双 Agent 对比分析 → main 切换打包 → 多 Agent 协作讨论。*
