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

在 `contractfirst` 模式下，还会额外返回：

- `currentContract`
- `relatedContracts`
- `openContractQuestions`
- `contractReminders`
- `contractReminderSummary`
- `contextPriority`

### `seshflow next`

当你想得到“下一步可执行动作”时使用。

它会返回什么：

- 如果已经有 in-progress 任务，则优先返回当前活动任务
- 否则返回 next ready task
- workspace mode 元数据
- 相关的 blocker / unmet dependency 信息

在 `contractfirst` 模式下，它还会把该任务的主契约一起带出来。

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
