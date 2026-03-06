# Seshflow Development Boundaries and Engineering Constraints
# Seshflow 开发边界与工程约束

Use these boundaries as hard constraints, not inspiration.
将以下边界作为硬约束执行，而不是作为发散灵感。
Do not expand scope beyond the current version.
不要将范围扩展到当前版本边界之外。
Prefer explicit exclusions over vague future flexibility.
优先写清“明确不做什么”，而不是保留模糊的未来弹性。
When wording is ambiguous, choose the more conservative interpretation.
当表述有歧义时，选择更保守的解释。
Do not rewrite Seshflow as a generic Kanban or workflow engine.
不要把 Seshflow 改写为通用 Kanban 或通用工作流引擎。
Preserve a single domain core and keep UI/API as thin shells around it.
保持单一领域内核，UI/API 仅作为外层薄壳。

## 1. Product Identity (Non-negotiable)
## 1. 产品身份（不可谈判）
- Seshflow is not a generic Kanban product.
- Seshflow 不是通用 Kanban 产品。
- Seshflow is a cross-session task sequencer for AI-assisted development.
- Seshflow 是面向 AI 辅助开发的跨会话任务序列器。
- Web capability is the visible control plane of Seshflow runtime.
- Web 能力是 Seshflow 运行时的可视化控制面。

## 2. Core Architecture Boundary
## 2. 核心架构边界
- There is one and only one business entry for task state transitions.
- 任务状态迁移必须且只能有一个业务入口。
- Canonical entry:
- 规范入口：
  - `TaskTransitionService.startTask(taskId, context)`
  - `TaskTransitionService.startTask(taskId, context)`
  - `TaskTransitionService.doneTask(taskId, context)`
  - `TaskTransitionService.doneTask(taskId, context)`
- CLI, Web, and API must call the same transition service.
- CLI、Web、API 必须调用同一迁移服务。
- API is an orchestration shell, not the domain core.
- API 是编排外壳，不是领域内核。

## 3. Non-goals (Current Cycle)
## 3. 非目标（当前周期）
- No generic workflow engine.
- 不做通用工作流引擎。
- No WebSocket/realtime in v1.2.0 or v1.3.0.
- v1.2.0 与 v1.3.0 不做 WebSocket/实时同步。
- No dependency graph in v1.2.0 or v1.3.0.
- v1.2.0 与 v1.3.0 不做依赖关系图。
- No automatic rollback engine in v1.2.0.
- v1.2.0 不做自动回滚引擎。
- No custom mode DSL in v1.3.0.
- v1.3.0 不做 custom mode DSL。

## 4. v1.2.0 Boundary: Execution Core + Minimal Control Plane
## 4. v1.2.0 边界：执行内核 + 最小控制面
- Must include single transition entry, shared schemas, hook registry/executor, and real-data web control plane.
- 必须包含单一迁移入口、共享 schema、Hook 注册/执行，以及真实数据的 Web 控制面。
- Must not include realtime sync, dependency graph, plugin platform, or heavy Kanban expansion.
- 严禁包含实时同步、依赖图、插件平台、重功能 Kanban 扩展。

## 5. Transition Contract Boundary
## 5. 迁移契约边界
- Start flow: `before_start -> transition -> after_start`
- Start 流程：`before_start -> transition -> after_start`
- Done flow: `before_done -> transition -> after_done`
- Done 流程：`before_done -> transition -> after_done`
- Required guarantees:
- 必要保证：
  - deterministic hook ordering
  - Hook 顺序确定性
  - transition validation
  - 迁移合法性校验
  - explicit error taxonomy
  - 明确错误分类
  - unique transition event id
  - 唯一迁移事件 ID
  - deterministic duplicate handling
  - 确定性重复处理

## 6. Hook System Boundary
## 6. Hook 系统边界
- Allowed: `before_start`, `after_start`, `before_done`, `after_done`
- 允许：`before_start`、`after_start`、`before_done`、`after_done`
- Modes: `blocking`, `non_blocking`
- 模式：`blocking`、`non_blocking`
- Serial execution only.
- 仅允许串行执行。
- Timeout and minimal retry policy are required.
- 必须支持超时与最小重试策略。
- `after_*` failures do not auto-rollback state in v1.2.0.
- v1.2.0 中 `after_*` 失败不得自动回滚状态。

## 7. Idempotency and Compensation Boundary
## 7. 幂等与补偿边界
- Require deterministic duplicate handling, not distributed idempotency framework.
- 要求确定性重复处理，而不是分布式幂等框架。
- v1.2.0 defines compensation policy only; no automatic transactional rollback.
- v1.2.0 仅定义补偿政策；不实现自动事务回滚。

## 8. Persistence and Runtime Event Boundary
## 8. 持久化与运行时事件边界
- Must define storage location for transition events and hook results.
- 必须定义迁移事件与 Hook 结果的存储位置。
- Must bind logs to task id and transition event id.
- 必须将日志关联到 task id 与 transition event id。
- Must define retention/truncation policy.
- 必须定义保留/截断策略。
- Web log view must read persisted events, not inferred UI state.
- Web 日志视图必须读取持久化事件，而不是 UI 推断状态。

## 9. API Boundary (v1.3.0)
## 9. API 边界（v1.3.0）
- Must include task/hook/mode contracts, versioning policy, resolver, and runtime switching.
- 必须包含 task/hook/mode 契约、版本策略、解析器、运行时切换。
- Must keep CLI/Web parity through a shared orchestration path.
- 必须通过共享编排路径保持 CLI/Web 一致性。

## 10. Testing and Release Boundary
## 10. 测试与发布边界
- Required: transition contract, hook integration, timeout/retry, persistence adapter, mode resolver, CLI/Web parity tests.
- 必需：迁移契约、Hook 集成、超时/重试、持久化适配器、模式解析器、CLI/Web 一致性测试。
- Release gates: `pnpm lint`, `pnpm test`, `pnpm build`.
- 发布门禁：`pnpm lint`、`pnpm test`、`pnpm build`。

## 11. Engineering Red Lines
## 11. 工程红线
- No UI-specific transition logic.
- 禁止 UI 私有迁移逻辑。
- No silent hook failures.
- 禁止 Hook 静默失败。
- No split semantics across CLI/Web/API.
- 禁止 CLI/Web/API 语义分裂。
- No scope expansion across version boundaries.
- 禁止跨版本边界扩范围。

## 12. Execution Backlog
## 12. 执行清单
- Task-level issue breakdown is maintained in `docs/development-backlog.md`.
- 任务级 issue 拆分维护在 `docs/development-backlog.md`。
