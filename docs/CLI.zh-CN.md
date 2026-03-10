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
- `protocol` 是描述性元数据；像 `event-stream` 这样的自定义字符串是允许的
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
