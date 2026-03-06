# Seshflow Development Backlog (v1.2.0 / v1.3.0 / v1.4.0)

## Usage
- This file is the execution backlog for `docs/development.md`.
- One section maps to one GitHub issue.
- Recommended labels: `core`, `web`, `api`, `hooks`, `mode`, `v1.2.0`, `v1.3.0`, `v1.4.0`.

## v1.2.0 - Execution Core + Minimal Control Plane

### 1.2.0-01 Introduce TaskTransitionService as Single Entry
- Type: `feat`
- Priority: P0
- Depends on: none
- Scope:
  - define `startTask(taskId, context)`
  - define `doneTask(taskId, context)`
  - enforce transition validation and state legality
- Definition of Done:
  - CLI and existing transition calls use this service
  - invalid transition is rejected consistently
  - transition service unit tests are in place

### 1.2.0-02 Define Transition Contract and Shared Schemas
- Type: `feat`
- Priority: P0
- Depends on: none
- Scope:
  - define transition event schema
  - define hook result schema
  - define transition context schema
  - add error taxonomy and event id contract
- Definition of Done:
  - schemas live in shared/domain layer
  - schemas are versioned and documented
  - contract tests validate mandatory fields

### 1.2.0-03 Hook Registry + Serial Executor (Minimal Closed Loop)
- Type: `feat`
- Priority: P0
- Depends on: `1.2.0-01`, `1.2.0-02`
- Scope:
  - hook points: `before_start`, `after_start`, `before_done`, `after_done`
  - mode: `blocking` / `non_blocking`
  - serial execution with deterministic ordering
  - timeout + retry (minimal policy)
- Definition of Done:
  - blocking failure stops transition
  - non-blocking failure appends warning and continues
  - timeout/retry behavior is observable and tested

### 1.2.0-04 Idempotency and Compensation Strategy
- Type: `feat`
- Priority: P0
- Depends on: `1.2.0-01`, `1.2.0-03`
- Scope:
  - enforce idempotency keys for repeated start/done operations
  - define compensation policy for `after_*` failures
  - define hook side-effect boundary
- Definition of Done:
  - duplicate requests are handled deterministically
  - compensation behavior is explicit and documented
  - side-effect policy is validated in tests

### 1.2.0-05 Web Data Adapter and Minimal Board
- Type: `feat`
- Priority: P0
- Depends on: `1.2.0-01`
- Scope:
  - replace mock data path with adapter-backed reads/writes
  - keep UI scope minimal (no feature-heavy Kanban expansion)
  - show reliable loading/error states
- Definition of Done:
  - board data is fully real-data driven
  - failed updates provide actionable feedback
  - no mock path remains in main board flow

### 1.2.0-06 Web Control Plane Views (Minimum)
- Type: `feat`
- Priority: P1
- Depends on: `1.2.0-05`, `1.2.0-03`
- Scope:
  - task board summary view
  - current session context view (`ncfr`, next task)
  - execution log view (hook results + warnings)
  - mode/data-source badge
- Definition of Done:
  - users can observe execution behavior from web
  - mode and source of truth are visible at all times

### 1.2.0-07 Replace `react-beautiful-dnd`
- Type: `feat`
- Priority: P1
- Depends on: none
- Scope:
  - migrate to maintained alternative (`@hello-pangea/dnd` preferred)
  - keep drag interaction behavior stable
- Definition of Done:
  - no deprecated DnD package in dependency tree
  - drag flows pass existing integration checks

### 1.2.0-08 Release Hardening for Core
- Type: `chore`
- Priority: P0
- Depends on: all v1.2.0 issues
- Scope:
  - add transition/hook regression suites
  - run release gates
  - update docs
- Definition of Done:
  - `pnpm lint`, `pnpm test`, `pnpm build` all pass
  - docs updated: web README + plan + backlog
  - release notes explain control-plane scope boundary

## v1.3.0 - API-first Development Modes

### 1.3.0-01 API Contract First (Task/Hook/Mode)
- Type: `feat`
- Priority: P0
- Depends on: none
- Scope:
  - define task orchestration endpoints
  - define hook management endpoints
  - define mode management endpoints
  - define contract versioning policy
- Definition of Done:
  - API contract is documented and reviewable
  - contract conformance tests are added

### 1.3.0-02 Mode Resolver and Runtime Switching
- Type: `feat`
- Priority: P0
- Depends on: `1.3.0-01`
- Scope:
  - define `default`/`api`/`custom` mode resolver
  - runtime mode read + validation
  - explicit fallback behavior
- Definition of Done:
  - unknown mode fails safely
  - default mode remains stable fallback

### 1.3.0-03 API Orchestration Path for CLI/Web
- Type: `feat`
- Priority: P0
- Depends on: `1.3.0-01`, `1.3.0-02`
- Scope:
  - route list/start/done/edit through mode-aware orchestration
  - API mode uses API as source of truth
  - preserve default mode behavior
- Definition of Done:
  - same operation works in both modes
  - behavior difference is intentional and documented

### 1.3.0-04 Custom Mode Definition and Validation
- Type: `feat`
- Priority: P1
- Depends on: `1.3.0-02`
- Scope:
  - define custom mode schema
  - support mode-level hook override
  - support user-defined orchestration rules (safe subset)
- Definition of Done:
  - user can register and activate at least one custom mode
  - invalid mode config is rejected with clear diagnostics

### 1.3.0-05 Migration Guide and Compatibility Tests
- Type: `docs`
- Priority: P1
- Depends on: all v1.3.0 issues
- Scope:
  - write migration guide from `default` to `api`
  - add compatibility tests for both modes
- Definition of Done:
  - migration steps are reproducible
  - compatibility matrix documented

## v1.4.0 - Realtime + Visualization

### 1.4.0-01 WebSocket Realtime Sync
- Type: `feat`
- Priority: P1
- Depends on: all v1.3.0 P0 issues
- Scope:
  - realtime events for task/hook/mode changes
  - reconnect and ordering strategy
- Definition of Done:
  - multi-tab change propagation works reliably
  - reconnect behavior is predictable and tested

### 1.4.0-02 Dependency Graph and Advanced Observability
- Type: `feat`
- Priority: P2
- Depends on: `1.4.0-01`
- Scope:
  - dependency graph view
  - richer execution analytics panels
- Definition of Done:
  - graph and observability views read from real runtime events
  - rendering remains responsive on medium datasets

## Suggested Execution Order
1. Complete v1.2.0 P0 issues with core-first order: service -> contract -> executor.
2. Release `1.2.0` after core regression suites pass.
3. Complete v1.3.0 P0 issues: contract first, then resolver and orchestration.
4. Release `1.3.0`.
5. Execute v1.4.0 realtime/visualization scope.
