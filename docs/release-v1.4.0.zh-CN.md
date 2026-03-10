# Seshflow v1.4.0 发版说明

`v1.4.0` 把 delegated git worktree handoff 正式做成了 Seshflow 的一等能力。

## 核心更新

- 可以从 parent 管理的任务直接创建 delegated handoff
- 可以物化隔离的 git worktree，同时不创建第二套任务真相源
- 会为外部 coding agent 或人工执行者生成受控、局部闭包的 handoff manifest 与 bundle
- parent workspace 可以通过 `ncfr`、`next`、`show`、`handoff list/show` 和 workspace overview 持续看到 delegated 状态
- handoff lifecycle 与 task lifecycle 明确分离，`submit`、`reclaim`、`close` 都不会假装任务已经自动完成

## 包版本

- `@seshflow/cli@1.4.0`
- `@seshflow/shared@1.4.0`
- `@seshflow/web@1.4.0`

## 相比 v1.3.1 的变化

- 新增 parent workspace 内的一等 handoff 模型与持久化
- 新增 `handoff create` 和 git worktree 物化
- 新增受控 manifest / bundle 生成，用于 delegated execution
- 在高频 parent workspace 命令里暴露 delegated task 状态
- 新增 handoff lifecycle control 与 inspection surfaces
- 新增最小 workspace overview 与 handoff search 支撑 delegated flow
- 新增 expected-artifact 轻量 warning 与 handoff cleanup guidance

## 边界说明

- Seshflow 管理的是 handoff truth 和 binding，不是 autonomous agent execution。
- handoff worktree 是 execution surface，不是新的任务真相源。
- 这个版本不会引入 agent runtime、自动 merge/review 语义、realtime dashboard sync，或重型可视化。
