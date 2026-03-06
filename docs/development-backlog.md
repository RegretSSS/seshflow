# Seshflow Development Backlog (v1.2.0 / v1.3.0 / v1.4.0)
# Seshflow 开发待办清单（v1.2.0 / v1.3.0 / v1.4.0）

## Usage
## 使用说明
- This file is the execution backlog for `docs/development.md`.
- 本文件是 `docs/development.md` 的执行待办清单。
- One section maps to one GitHub issue.
- 每个章节对应一个 GitHub issue。

## v1.2.0 - Execution Core + Minimal Control Plane
## v1.2.0 - 执行内核 + 最小控制面

### 1.2.0-01 Introduce TaskTransitionService as Single Entry
### 1.2.0-01 引入 TaskTransitionService 作为单一入口
- Priority: P0
- 优先级：P0
- Scope: define `startTask`/`doneTask`, enforce transition legality.
- 范围：定义 `startTask`/`doneTask`，强制迁移合法性。
- Done: CLI and web-facing flows call this service.
- 完成：CLI 与 Web 相关流程都调用该服务。

### 1.2.0-02 Define Transition Contract and Shared Schemas
### 1.2.0-02 定义迁移契约与共享 Schema
- Priority: P0
- 优先级：P0
- Scope: transition event, transition context, hook result, error taxonomy.
- 范围：迁移事件、迁移上下文、Hook 结果、错误分类。
- Done: schemas documented, versioned, and contract-tested.
- 完成：schema 已文档化、版本化，并具备契约测试。

### 1.2.0-03 Hook Registry + Serial Executor
### 1.2.0-03 Hook 注册表 + 串行执行器
- Priority: P0
- 优先级：P0
- Scope: `before_start/after_start/before_done/after_done`, `blocking/non_blocking`, timeout, minimal retry.
- 范围：`before_start/after_start/before_done/after_done`、`blocking/non_blocking`、超时、最小重试。
- Done: deterministic ordering; blocking stops transition; non-blocking logs warning.
- 完成：顺序确定；blocking 阻断迁移；non-blocking 记录 warning 并继续。

### 1.2.0-04 Deterministic Duplicate Handling + Compensation Policy
### 1.2.0-04 确定性重复处理 + 补偿政策
- Priority: P0
- 优先级：P0
- Scope: deterministic duplicates for repeated start/done, compensation policy for `after_*`, side-effect boundary.
- 范围：重复 start/done 的确定性处理、`after_*` 补偿政策、副作用边界。
- Done: no distributed idempotency framework in v1.2.0; no auto-rollback.
- 完成：v1.2.0 不引入分布式幂等框架；不做自动回滚。

### 1.2.0-05 Runtime Event Storage and Retention Model
### 1.2.0-05 运行时事件存储与保留模型
- Priority: P0
- 优先级：P0
- Scope: define event storage owner/path, task/event-id binding, retention/truncation rules.
- 范围：定义事件存储归属/路径、task/event-id 绑定、保留/截断规则。
- Done: web execution logs read real persisted events.
- 完成：Web 执行日志读取真实持久化事件。

### 1.2.0-06 Replace `react-beautiful-dnd` (Precondition)
### 1.2.0-06 替换 `react-beautiful-dnd`（前置条件）
- Priority: P0
- 优先级：P0
- Scope: migrate to maintained alternative (prefer `@hello-pangea/dnd`) with behavior parity.
- 范围：迁移到受维护替代方案（优先 `@hello-pangea/dnd`），保持行为一致。
- Done: no deprecated DnD dependency remains.
- 完成：不再保留已弃用 DnD 依赖。

### 1.2.0-07 Web Data Adapter and Minimal Board
### 1.2.0-07 Web 数据适配层与最小看板
- Priority: P0
- 优先级：P0
- Scope: remove mock path, add adapter-backed reads/writes, reliable loading/error handling.
- 范围：移除 mock 路径，接入适配器读写，提供可靠 loading/error 处理。
- Done: main board flow is fully real-data driven.
- 完成：主看板流程完全由真实数据驱动。

### 1.2.0-08 Web Control Plane Minimum Views
### 1.2.0-08 Web 控制面最小视图
- Priority: P1
- 优先级：P1
- Scope: board summary, current session context, execution logs, mode/data-source badge.
- 范围：看板摘要、当前会话上下文、执行日志、模式/数据源标识。
- Done: runtime behavior is visible and inspectable.
- 完成：运行时行为可见且可检查。

### 1.2.0-09 External Positioning Alignment for `@seshflow/web`
### 1.2.0-09 `@seshflow/web` 外部定位语义对齐
- Priority: P1
- 优先级：P1
- Scope: update package description/keywords to control-plane/runtime/orchestration narrative.
- 范围：将包描述/关键词改为 control-plane/runtime/orchestration 叙事。
- Done: metadata and README no longer conflict with product identity.
- 完成：元信息与 README 不再和产品身份冲突。

### 1.2.0-10 Release Hardening for Core
### 1.2.0-10 内核发布加固
- Priority: P0
- 优先级：P0
- Scope: regression suites, release gates, docs sync.
- 范围：回归测试集、发布门禁、文档同步。
- Done: `pnpm lint` + `pnpm test` + `pnpm build` pass.
- 完成：`pnpm lint` + `pnpm test` + `pnpm build` 全部通过。

## v1.3.0 - API-first Development Modes
## v1.3.0 - API 优先开发模式

### 1.3.0-01 API Contract First (Task/Hook/Mode)
### 1.3.0-01 API 契约优先（Task/Hook/Mode）
- Priority: P0
- 优先级：P0
- Scope: orchestration contracts + versioning policy.
- 范围：编排契约 + 版本策略。
- Done: contract conformance tests in place.
- 完成：契约一致性测试就位。

### 1.3.0-02 Mode Resolver and Runtime Switching
### 1.3.0-02 模式解析器与运行时切换
- Priority: P0
- 优先级：P0
- Scope: `default/api/custom` resolver with validation and explicit fallback.
- 范围：`default/api/custom` 解析器，含校验和明确兜底。
- Done: unknown mode fails safely; default remains stable.
- 完成：未知模式安全失败；default 保持稳定。

### 1.3.0-03 API Orchestration Path for CLI/Web
### 1.3.0-03 CLI/Web 的 API 编排路径
- Priority: P0
- 优先级：P0
- Scope: list/start/done/edit routed through mode-aware orchestration.
- 范围：list/start/done/edit 统一走模式感知编排路径。
- Done: behavior differences are intentional and documented.
- 完成：行为差异是有意设计且有文档说明。

### 1.3.0-04 Custom Mode Definition and Validation
### 1.3.0-04 Custom 模式定义与校验
- Priority: P1
- 优先级：P1
- Scope: validated custom-mode schema with safe subset and mode-level hook override.
- 范围：具备安全子集的 custom 模式 schema，并支持模式级 Hook 覆盖。
- Done: invalid configs are rejected with clear diagnostics.
- 完成：非法配置会被明确诊断并拒绝。

### 1.3.0-05 Migration Guide and Compatibility Tests
### 1.3.0-05 迁移指南与兼容性测试
- Priority: P1
- 优先级：P1
- Scope: migration from `default` to `api`, plus compatibility matrix.
- 范围：`default` 到 `api` 迁移方案与兼容性矩阵。
- Done: migration steps are reproducible.
- 完成：迁移步骤可复现。

## v1.4.0 - Realtime + Visualization
## v1.4.0 - 实时能力 + 可视化增强

### 1.4.0-01 WebSocket Realtime Sync
### 1.4.0-01 WebSocket 实时同步
- Priority: P1
- 优先级：P1
- Scope: realtime events + reconnect/ordering policy.
- 范围：实时事件 + 重连/顺序策略。
- Done: multi-tab propagation and reconnect behavior are reliable.
- 完成：多标签页传播与重连行为可靠。

### 1.4.0-02 Dependency Graph and Advanced Observability
### 1.4.0-02 依赖图与高级可观测性
- Priority: P2
- 优先级：P2
- Scope: dependency graph and richer analytics views based on real runtime events.
- 范围：基于真实运行时事件的依赖图和增强分析视图。
- Done: rendering remains responsive for medium datasets.
- 完成：中等规模数据渲染保持流畅。
