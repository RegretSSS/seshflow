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

## v1.3.0 - API-first Contract-first Development Mode

- Authoritative target model, contract examples, CLI walkthrough, and default-vs-apifirst output differences are defined in `docs/apifirst-mode.md` and `docs/apifirst-mode.zh-CN.md`.

### 1.3.0-00 `init apifirst` Mode Bootstrap

- Priority: P0
- Scope: add `seshflow init apifirst` and create the planning/contract scaffolding required for contract-first delivery.
- Done: a new workspace can explicitly opt into API-first mode from initialization instead of relying on ad-hoc conventions.

### 1.3.0-01 API / RPC Contract Model

- Priority: P0
- Scope: define contract identity, versioning, request/response or message schema fields, ownership, and compatibility notes.
- Done: contracts are first-class objects instead of prose scattered across markdown and code.

### 1.3.0-02 Task-to-Contract Binding

- Priority: P0
- Scope: bind tasks, markdown planning items, and implementation work to one or more API / RPC contracts.
- Done: Seshflow can answer which task serves which contract without repo-wide guesswork.

### 1.3.0-03 Contract-first Context Resolution

- Priority: P0
- Scope: make `ncfr`, `next`, and `show` surface the active contract, related tasks, and unresolved protocol questions before broader repo context.
- Done: AI receives protocol truth first when working inside API-first mode.

### 1.3.0-03a Explicit AI Context Priority

- Priority: P0
- Scope: make context-priority ordering explicit in API-first payloads and RPC shell seams so Agent code does not need to infer which sections are primary, secondary, or suppressed.
- Done: `ncfr`, `next`, `show`, and `rpc shell` expose a stable context-priority contract instead of relying on implicit field order.

### 1.3.0-04 Contract Drift and Conflict Reminders

- Priority: P0
- Scope: detect when task plans, bound files, or implementation notes diverge from the declared API / RPC contract and raise explicit reminders.
- Done: AI is reminded of protocol drift instead of re-deriving or silently violating the contract.

### 1.3.0-05 Dependency and Markdown Planning Alignment

- Priority: P1
- Scope: align dependency management and managed Markdown planning with contract ownership and contract-linked task groups.
- Done: dependency chains and planning updates stay anchored to the contract they implement.

### 1.3.0-06 Mode Resolver and Compatibility

- Priority: P1
- Scope: keep explicit mode resolution for `default` and `apifirst`, plus safe fallback and migration guidance.
- Done: mode selection is explicit, documented, and testable.

### 1.3.0-07 RPC/API/Hook Extension Surface

- Priority: P1
- Scope: reserve the RPC/API/hook seams that external Agent code will consume without pulling Agent-specific runtime policy into Seshflow.
- Done: Agent integrations can bind to Seshflow through stable seams instead of patching the core.

### 1.3.0-08 Workspace Index and Multi-Workspace Overview

- Priority: P2
- Scope: add a global workspace registry/index and overview path for multiple workspaces without redefining `apifirst`.
- Done: multi-workspace visibility exists without redefining what API-first means.

### 1.3.0-09 Boundary Hardening and Package-consumption Best Practices

- Priority: P1
- Scope: codify what belongs in Seshflow, how Agent-side code should consume its seams, and which feature classes must stay outside the package core.
- Done: package consumers and future maintainers can evaluate scope changes against an explicit best-practices guide instead of ad hoc discussion.

## v1.4.0 - Realtime + Visualization

### 1.4.0-01 WebSocket Realtime Sync

- Priority: P1
- Scope: realtime events with reconnect and ordering policy.
- Target: multi-tab propagation and reconnect behavior are reliable.

### 1.4.0-02 Dependency Graph and Advanced Observability

- Priority: P2
- Scope: dependency graph and richer analytics views based on real runtime events.
- Target: rendering remains responsive for medium datasets.

## Deferred / Not This Stage

- Full bidirectional Markdown/JSON sync across arbitrary user edits.
- Reverse-sync of runtime/session/process/artifact data back into free-form Markdown files.
- Dependency graph visualization before dependency-management contracts are stable.
- Agent-side model routing, prompt policy, autonomous loop logic, and general conversation orchestration inside Seshflow.
