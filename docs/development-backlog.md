# Seshflow Development Backlog (`v1.2.0` / `v1.3.0` / `v1.4.0`)

## Usage

- This file is the execution backlog for `docs/development.md`.
- One section maps to one implementation issue or milestone.
- Anything listed under `Deferred / Not This Stage` must not silently enter the current cycle.

## v1.2.0 - Execution Core + Minimal Control Plane

### 1.2.0-00 Explicit Dependency Management and Validation

- Priority: P0
- Scope: add direct dependency mutation flows, cycle/self-dependency validation, and AI-friendly dependency guidance in CLI/help/docs.
- Done: dependency creation, edit, and removal are discoverable and contract-tested.

### 1.2.0-00a Managed Markdown Planning Contract

- Priority: P0
- Scope: define stable task identity in Markdown, `md -> json` update rules, and ownership boundary between planning fields and runtime fields.
- Done: Markdown can be treated as the planning source without implying full bidirectional sync.

### 1.2.0-01 Introduce `TaskTransitionService` as Single Entry

- Priority: P0
- Scope: define `startTask` and `doneTask`, enforce transition legality.
- Done: CLI and Web-facing flows call this service.

### 1.2.0-02 Define Transition Contract and Shared Schemas

- Priority: P0
- Scope: transition event, transition context, hook result, error taxonomy.
- Done: schemas are documented, versioned, and contract-tested.

### 1.2.0-03 Hook Registry and Serial Executor

- Priority: P0
- Scope: `before_start`, `after_start`, `before_done`, `after_done`, `blocking`, `non_blocking`, timeout, minimal retry.
- Done: deterministic ordering; blocking stops transition; non-blocking logs warning.

### 1.2.0-04 Deterministic Duplicate Handling and Compensation Policy

- Priority: P0
- Scope: deterministic duplicate handling for repeated start/done, compensation policy for `after_*`, side-effect boundary.
- Done: no distributed idempotency framework in `v1.2.0`; no auto-rollback.

### 1.2.0-05 Runtime Event Storage and Retention Model

- Priority: P0
- Scope: define event storage owner/path, task/event-id binding, retention/truncation rules.
- Done: Web execution logs read real persisted events.

### 1.2.0-06 Replace `react-beautiful-dnd` (Precondition)

- Priority: P0
- Scope: migrate to a maintained alternative with behavior parity.
- Done: no deprecated DnD dependency remains.

### 1.2.0-07 Web Data Adapter and Minimal Board

- Priority: P0
- Scope: remove mock path, add adapter-backed reads/writes, reliable loading and error handling.
- Done: main board flow is fully real-data driven.

### 1.2.0-08 Web Control Plane Minimum Views

- Priority: P1
- Scope: board summary, current session context, execution logs, mode/data-source badge.
- Done: runtime behavior is visible and inspectable.

### 1.2.0-09 External Positioning Alignment for `@seshflow/web`

- Priority: P1
- Scope: update package description and keywords to match the runtime/control-plane narrative.
- Done: metadata and README no longer conflict with product identity.

### 1.2.0-10 Release Hardening for Core

- Priority: P0
- Scope: regression suites, release gates, docs sync.
- Done: `pnpm lint`, `pnpm test`, and `pnpm build` pass.

## v1.3.0 - API-first Development Modes

### 1.3.0-00 Dependency and Planning Contracts on Shared API Path

- Priority: P0
- Scope: expose dependency mutation/read contracts and managed Markdown sync orchestration through the same API-first path as CLI/Web.
- Done: dependency and planning orchestration no longer depend on CLI-only code paths.

### 1.3.0-01 API Contract First (Task/Hook/Mode)

- Priority: P0
- Scope: orchestration contracts and versioning policy.
- Done: contract conformance tests are in place.

### 1.3.0-02 Mode Resolver and Runtime Switching

- Priority: P0
- Scope: `default/api/custom` resolver with validation and explicit fallback.
- Done: unknown mode fails safely; default remains stable.

### 1.3.0-03 API Orchestration Path for CLI/Web

- Priority: P0
- Scope: `list/start/done/edit` routed through mode-aware orchestration.
- Done: behavior differences are intentional and documented.

### 1.3.0-04 Custom Mode Definition and Validation

- Priority: P1
- Scope: validated custom-mode schema with safe subset and mode-level hook override.
- Done: invalid configs are rejected with clear diagnostics.

### 1.3.0-05 Migration Guide and Compatibility Tests

- Priority: P1
- Scope: migration from `default` to `api`, plus compatibility matrix.
- Done: migration steps are reproducible.

## v1.4.0 - Realtime + Visualization

### 1.4.0-01 WebSocket Realtime Sync

- Priority: P1
- Scope: realtime events with reconnect and ordering policy.
- Done: multi-tab propagation and reconnect behavior are reliable.

### 1.4.0-02 Dependency Graph and Advanced Observability

- Priority: P2
- Scope: dependency graph and richer analytics views based on real runtime events.
- Done: rendering remains responsive for medium datasets.

## Deferred / Not This Stage

- Full bidirectional Markdown/JSON sync across arbitrary user edits.
- Reverse-sync of runtime/session/process/artifact data back into free-form Markdown files.
- Dependency graph visualization before dependency-management contracts are stable.
