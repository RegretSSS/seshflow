# Seshflow v1.3.0 发版说明

`v1.3.0` 是第一个把 `contractfirst` 从“规划概念”落成真实“契约先行开发模式”的版本。

## 核心更新

- `seshflow init contractfirst` 可直接初始化契约先行工作区
- API/RPC contract 成为一等对象，具备存储、校验和注册能力
- 任务、受控 Markdown 规划和实现文件都可以显式绑定 contract
- `ncfr`、`next`、`show`、`rpc shell` 现在会输出 contract-first 上下文和显式 `contextPriority`
- 增加了 contract drift reminder、contract 任务视图和 contract-aware runtime seams
- hook seams 现在有显式 taxonomy 和紧凑 payload envelope
- `rpc shell` 会暴露 mode capabilities，方便机器侧消费
- 边界与包消费最佳实践已经正式文档化

## 包版本

- `@seshflow/cli@1.3.0`
- `@seshflow/shared@1.3.0`
- `@seshflow/web@1.3.0`

## 相比 v1.2.0 的变化

- 增加 contract-first 的 `contractfirst` mode
- 增加 contract registry 与校验流程
- 增加 contract/task/file binding
- 增加 drift reminder 与契约优先上下文恢复
- 增加显式 AI 上下文优先级 payload
- 增加 hook taxonomy、hook payload envelope 和 hook result kind
- 增加有限的 mode profile override
- 增加 workspace index 与 RPC capability surface
- 增加明确的边界最佳实践文档

## 备注

- `v1.4.0` 仍处于规划阶段，尚未开始。
- realtime sync 和高级 graph/observability 不在本次 release 范围内。
