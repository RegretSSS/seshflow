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

## 10. API Boundary (`v1.3.0`)

- Must include task, hook, and mode contracts, versioning policy, resolver, and runtime switching.
- Must keep dependency mutation and read contracts on the same orchestration path as CLI and Web.
- Must define the managed Markdown sync boundary before any reverse-sync API is introduced.
- Must keep CLI/Web parity through a shared orchestration path.

## 11. Testing and Release Boundary

- Required: transition contract, hook integration, timeout/retry, persistence adapter, mode resolver, CLI/Web parity tests.
- Required for planning/domain work: dependency validation tests, cycle detection tests, Markdown identity/update contract tests.
- Release gates: `pnpm lint`, `pnpm test`, `pnpm build`.

## 12. Engineering Red Lines

- No UI-specific transition logic.
- No silent hook failures.
- No split semantics across CLI/Web/API.
- No dual-write Markdown/JSON sync without explicit conflict and ownership rules.
- No scope expansion across version boundaries.

## 13. Execution Backlog

- Task-level issue breakdown is maintained in `docs/development-backlog.md`.
