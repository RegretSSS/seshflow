# CLI 指南

这不是完整命令词典，而是解释 Seshflow 正常工作流里最关键的 CLI 面。

## 核心流程

### `seshflow init [mode]`

每个 workspace 只需执行一次。

它会做什么：

- 创建 `.seshflow/config.json`
- 创建 `.seshflow/tasks.json`
- 创建起始规划模板
- 当 `mode` 是 `contractfirst` / `apifirst` 时，还会创建：
  - `.seshflow/contracts/`
  - `.seshflow/plans/api-planning.md`

它会返回什么：

- 解析到的 workspace 位置
- source/root 信息
- 初始化模式
- quick-start 引导

### `seshflow ncfr`

每次开启新的 AI 对话时使用。

它会返回什么：

- workspace 快照
- 如果存在真实活动 session，则返回当前活动任务
- 如果没有活动 session，则返回 next ready task
- 告诉 AI 下一步应该先查看什么的 focus 信息

如果当前目录还没有初始化：

- `ncfr` 只会返回一个轻量 bootstrap 提示
- 不会偷偷创建 `.seshflow/`
- 不会替你猜应该执行 `init` 还是 `init contractfirst`

在 `contractfirst` 模式下，还会额外返回：

- `currentContract`
- `relatedContracts`
- `openContractQuestions`
- `contractReminders`
- `contractReminderSummary`
- `contextPriority`
- 这些 contract 字段默认只返回非空值
- 高频命令默认只保留非空上下文区块

### `seshflow next`

当你想得到“下一步可执行动作”时使用。

它会返回什么：

- 如果已经有 in-progress 任务，则优先返回当前活动任务
- 否则返回 next ready task
- workspace mode 元数据
- 相关的 blocker / unmet dependency 信息

在 `contractfirst` 模式下，它还会把该任务的主契约一起带出来。

`next`、`start`、`done` 的默认 JSON 有意保持为摘要层：

- 空的 contract/runtime/process 区块不会默认返回
- `task` 默认返回动作摘要，而不是完整任务文档
- 如果要看更大的检查 payload，请转用 `show --full`

### `seshflow query --text ... --contract ...`

当你需要在中型 workspace 里快速找到要 delegated 或恢复检查的对象时，优先用 `query` 的轻量搜索过滤，而不是引入新的搜索系统。

当前支持：

- `--text`：匹配 task id、title、description、contract id、tag、bound file
- `--contract`：按绑定的 contract id 过滤

这是轻量查找面，不是搜索引擎，也不承诺 BM25 或复杂排序。

### `seshflow handoff create <taskId>`

当你要把一个任务委派到隔离的 git worktree，交给外部 coding agent 或人工执行者时，使用这个命令。

它会做什么：

- 在 parent workspace 中创建 handoff 记录
- 在独立分支上物化一个 git worktree
- 在 delegated worktree 里写入 handoff manifest 和受控闭包 bundle

它不会做什么：

- 不会创建第二套任务真相源
- 不会自动把任务标记为 `done`
- 不会在 Seshflow 内部启动 agent loop

它会返回什么：

- `handoffId`
- `sourceTaskId`
- 目标 branch/path
- manifest 路径
- bundle 路径
- 当前 lifecycle 状态

被 delegated 的任务仍由 parent 管理：

- `next` 默认不会再推荐存在 active handoff 的任务
- `show <taskId>` 会暴露当前 delegation 摘要
- `start <taskId>` 默认阻止误接管，除非显式传入 `--force`

### `seshflow handoff submit|pause|reclaim|abandon|close <handoffId>`

当 delegated worktree 已经开始执行后，使用这些命令管理 handoff 自己的生命周期。

它们会做什么：

- 只修改 handoff lifecycle
- 同步更新 parent workspace 记录、manifest 和 bundle
- 允许记录 lifecycle note，以及在 `submit` 时写入 `resultRef`

它们不会做什么：

- 不会自动把 source task 标记为 `done`
- 不会把 delegated worktree 变成新的任务真相源

关键边界：

- `submit` 表示“已提交结果给 parent 审查”，不是任务已完成
- `reclaim` 表示 parent 重新接管，任务会重新回到可推荐状态
- `close` 只关闭 handoff 记录，不等于任务完成

### `seshflow handoff list` / `seshflow handoff show <handoffId>`

用来恢复 delegated 状态，而不是重新猜 worktree 或 branch。

它们会返回：

- handoff 当前 lifecycle 状态
- source task / contract 绑定摘要
- target worktree 路径与 branch
- manifest / bundle 路径
- 最新 resultRef 和 note 摘要

`handoff show --full` 会进一步展开 manifest 和 bundle 文件内容，适合调试和恢复，但上下文成本明显更高。

## 契约先行的关联链路

Seshflow 不会靠任意代码扫描去猜 contract 关联。

真正的 contract-first 链路是：

1. 契约文件存在于 `.seshflow/contracts/<contractId>.json`
2. 规划层通过以下方式绑定工作：
   - 托管 Markdown 里的 `## Contract: <contractId>`
   - 任务元数据里的 `[contracts:<contractId>]`
3. 任务记录里保存：
   - `contractIds`
   - `contractRole`
   - `boundFiles`
4. `ncfr`、`next`、`show` 再根据这些绑定解析出 `currentContract`

注意：

- Seshflow 不靠源码扫描猜 contract
- `currentContract` 的返回只依赖显式绑定
- contract 文件里更宽泛的协议内容可以放进 `payload`、`metadata`、`extensions`
- `kind` 和 `protocol` 都是描述性元数据；像 `event-stream` 这样的自定义字符串是允许的
- `seshflow contracts import <file>` 支持：
  - `.json`：单个 contract object
  - `.json`：contract 数组
  - `.jsonl`：每行一个 contract

## 对人类友好的输出

Seshflow 默认输出 JSON，因为它首先是 AI-first 的。

给人类使用时：

- `--pretty` 输出更可读的文本
- `--compact` 输出低噪音文本
- `--no-json` 显式关闭默认 JSON

示例：

```bash
seshflow ncfr --pretty
seshflow next --compact
seshflow show <taskId> --pretty
```

全局覆盖：

```bash
SESHFLOW_OUTPUT=pretty
```

`--full` 这类检查命令要谨慎使用。它们本来就是高上下文输出，只适合在需要深度检查时显式调用。

`rpc shell`、workspace index、`magic` 这类高级集成面默认不会出现在根 help 里。只有明确需要这些接缝时，再使用 `seshflow --help --advanced`。

## 稳定别名

推荐使用的契约先行模式名：

- `contractfirst`
- `contract-first`
- `apifirst` 仍然兼容

稳定命令别名：

- `contract` -> `contracts`
- `workspace` -> `workspaces`
- `proc` -> `process`
- `pause` -> `suspend`
- `rm` -> `delete`
