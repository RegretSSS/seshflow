# Seshflow Development Boundaries and Engineering Constraints

Use these boundaries as hard constraints, not inspiration.

- Do not expand scope beyond the current version boundary.
- Prefer explicit exclusions over vague future flexibility.
- When wording is ambiguous, choose the more conservative interpretation.
- Do not rewrite Seshflow as a generic Kanban or workflow engine.
- Preserve a single domain core and keep CLI/Web/API as thin shells around it.

## 1. Product Identity

- Seshflow is not a generic Kanban product.
- Seshflow is a cross-session task sequencer and runtime control layer for AI-assisted development.
- Web capability is the visible control plane of Seshflow runtime, not a separate product.
- Seshflow is the development kernel, not the future Agent application.

## 2. Core Architecture Boundary

- There is one and only one business entry for task state transitions.
- Canonical entry:
  - `TaskTransitionService.startTask(taskId, context)`
  - `TaskTransitionService.doneTask(taskId, context)`
- CLI, Web, and API must call the same transition service.
- API is an orchestration shell, not the domain core.

## 3. Non-goals (Current Cycle)

- No generic workflow engine.
- No WebSocket or realtime sync in `v1.2.0` or `v1.3.0`.
- No dependency graph visualization in `v1.2.0` or `v1.3.0`.
- No automatic rollback engine in `v1.2.0`.
- No custom mode DSL in `v1.3.0`.
- No automatic bidirectional Markdown/JSON sync in `v1.2.0`.
- No free-form Markdown patch reconciliation engine in `v1.2.0` or `v1.3.0`.
- No model routing, prompt orchestration, autonomous agent loop management, or cross-tool conversation control inside Seshflow.

## 4. Planning Source-of-Truth Boundary

- Markdown may be used as the authoring surface for batch planning and plan revisions.
- Runtime execution state remains canonical in `.seshflow/tasks.json`.
- Markdown is the planning contract, not the runtime event store.
- Current-cycle goal: make Markdown import/update stable through explicit task identity.
- Current-cycle non-goal: reflect every runtime/session/process/artifact field back into free-form Markdown.
- Any future reverse sync must be managed, field-scoped, and identity-based.

## 5. v1.2.0 Boundary: Execution Core + Minimal Control Plane

- Must include single transition entry, shared schemas, hook registry/executor, and real-data web control plane.
- Must include explicit dependency-management UX and validation. Dependency support is part of the task domain, not an optional add-on.
- Must define a managed Markdown planning contract (`md -> json`) with stable task identity before any future reverse-sync work.
- Must not include realtime sync, dependency graph visualization, plugin platform, or heavy Kanban expansion.

## 6. Transition Contract Boundary

- Start flow: `before_start -> transition -> after_start`
- Done flow: `before_done -> transition -> after_done`
- Required guarantees:
  - deterministic hook ordering
  - transition validation
  - explicit error taxonomy
  - unique transition event id
  - deterministic duplicate handling

## 7. Hook System Boundary

- Allowed hooks: `before_start`, `after_start`, `before_done`, `after_done`
- Modes: `blocking`, `non_blocking`
- Serial execution only.
- Timeout and minimal retry policy are required.
- `after_*` failures do not auto-rollback state in `v1.2.0`.

## 8. Idempotency and Compensation Boundary

- Require deterministic duplicate handling, not a distributed idempotency framework.
- `v1.2.0` defines compensation policy only; no automatic transactional rollback.

## 9. Persistence and Runtime Event Boundary

- Must define storage location for transition events and hook results.
- Must bind logs to task id and transition event id.
- Must define retention and truncation policy.
- Web log view must read persisted events, not inferred UI state.

## 10. API-first Boundary (`v1.3.0`)

- `API-first` in Seshflow means a contract-first development mode, not merely an HTTP service layer.
- The implementation target for this mode is defined in `docs/apifirst-mode.md`.
- Chinese companion: `docs/apifirst-mode.zh-CN.md`.
- Entry shape:
  - `seshflow init apifirst`
- Purpose:
  - large tasks must be organized around explicit API / RPC contracts before parallel implementation starts
  - AI should recover the signed contract first, not rediscover protocol details from scattered code
- Required contract objects:
  - API / RPC name
  - version
  - owner task(s)
  - producer/consumer or caller/callee mapping
  - request/response schema or message schema
  - compatibility notes and open questions
- Required behavior in this mode:
  - tasks can bind to one or more API / RPC contracts
  - planning files can bind implementation tasks to the contract they serve
  - `ncfr`, `next`, and `show` must surface the relevant contract before broad repo context
  - when tasks or plans drift from a bound contract, Seshflow must raise an explicit reminder instead of making AI guess
- Required implementation support:
  - contract storage and identity rules
  - task-to-contract binding
  - contract-aware context resolution
  - explicit AI context-priority contract for contract-first surfaces
  - conflict/drift reminder rules
- Supporting API/Web work is allowed only insofar as it serves this development mode.
- Multi-workspace overview is a secondary control-plane concern, not the definition of `API-first`.
- `v1.3.0` must be implementable from concrete contract storage, CLI flow, and output examples rather than abstract feature labels alone.

## 10a. Product Stop Line

- Seshflow should stop major scope growth once task/hook/mode/contract seams are stable enough for external Agent code to compose against them.
- After that point, Seshflow work should bias toward optimization, hardening, compatibility, and carefully bounded extension points.
- The future Agent project should consume Seshflow through RPC/API/hooks rather than forcing conversation policy or autonomous loop logic into the Seshflow core.

## 11. Testing and Release Boundary

- Required: transition contract, hook integration, timeout/retry, persistence adapter, mode resolver, CLI/Web parity tests.
- Required for planning/domain work: dependency validation tests, cycle detection tests, Markdown identity/update contract tests.
- Required for `API-first`: contract binding tests, conflict reminder tests, context-priority tests, RPC shell parity tests, and mode-init tests.
- Release gates: `pnpm lint`, `pnpm test`, `pnpm build`.

## 12. Engineering Red Lines

- No UI-specific transition logic.
- No silent hook failures.
- No split semantics across CLI/Web/API.
- No dual-write Markdown/JSON sync without explicit conflict and ownership rules.
- No scope expansion across version boundaries.

## 13. Execution Backlog

- Task-level issue breakdown is maintained in `docs/development-backlog.md`.
