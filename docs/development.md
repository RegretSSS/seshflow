# Seshflow Product Development Plan

## 1. Product Constraint (Non-negotiable)
- Web is the visible control plane of Seshflow runtime.
- Seshflow is not a generic Kanban product.
- All roadmap decisions must strengthen cross-session execution continuity for AI-assisted development.

## 2. Architecture Principle
- Single business entry for task transitions:
  - `TaskTransitionService.startTask(taskId, context)`
  - `TaskTransitionService.doneTask(taskId, context)`
- CLI, Web, and API must call the same transition service.
- API is an orchestration shell, not the domain core.

## 3. Core Transition Contract (v1)
- Start flow:
  - `before_start` -> transition -> `after_start`
- Done flow:
  - `before_done` -> transition -> `after_done`
- Required invariants:
  - idempotency for repeated start/done calls
  - deterministic hook ordering
  - timeout per hook
  - retry policy per hook
  - structured error taxonomy
  - unique transition event id
  - explicit side-effect boundary for hooks
  - explicit compensation policy when `after_*` fails

## 4. Error Taxonomy (Minimum)
- `CONFIG_ERROR`: invalid hook/mode config.
- `VALIDATION_ERROR`: invalid task state transition.
- `TIMEOUT_ERROR`: hook execution timeout.
- `RUNTIME_ERROR`: hook execution failure.
- `CANCELLED_ERROR`: transition canceled by user/system.

## 5. Version Roadmap

### v1.2.0 - Execution Core + Minimal Control Plane
- Build and stabilize transition core first.
- Deliver minimal web control plane, not feature-heavy board UX.
- Keep hook system minimal and deterministic.

### v1.3.0 - API-first Orchestration + Mode Resolver
- Expose core contracts through stable API.
- Introduce runtime mode resolver: `default`, `api`, `custom`.
- Route CLI/Web through mode-aware orchestration path.

### v1.4.0 - Realtime + Visualization
- Add WebSocket realtime updates.
- Add dependency graph and richer observability surfaces.

## 6. v1.2.0 Scope
- `TaskTransitionService` single entry implementation.
- Hook registry + serial executor:
  - blocking/non-blocking
  - timeout
  - retry (minimal strategy)
  - execution logs
- Shared contracts (move to shared/domain layer):
  - transition event schema
  - hook result schema
  - transition context schema
- Web control plane (minimum views):
  - task board summary
  - current session context (`ncfr`, current next task)
  - execution log stream
  - mode/data-source badge
- Frontend dependency risk control:
  - replace deprecated `react-beautiful-dnd` before deepening interactions

## 7. v1.3.0 Scope
- API contracts for task/hook/mode.
- Mode resolver + runtime switching.
- Mode-level hook override support.
- CLI/Web parity through orchestration path.
- Custom mode schema + validation.

## 8. Release Gates
- Required checks:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Required test suites:
  - transition contract tests
  - blocking/non-blocking integration tests
  - hook timeout/retry tests
  - persistence adapter tests
  - mode resolver tests
  - CLI/Web parity tests

## 9. Versioning Policy (To be fixed in this cycle)
- Define clear release semantics for monorepo:
  - unified versioning or independent versioning
- Document relationship between:
  - `seshflow`
  - `@seshflow/cli`
  - `@seshflow/web`
  - shared/domain package(s)

## 10. Execution Backlog
- Task-level issue breakdown:
  - `docs/development-backlog.md`
