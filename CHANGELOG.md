# Changelog

All notable changes to this project are documented in this file.

## [1.4.2] - 2026-03-11

### Fixed

- Added the missing published runtime dependency from `@seshflow/cli` to `@seshflow/shared`, restoring `contracts`, `rpc shell`, handoff, and other shared-surface commands for npm-installed CLI users.

## [1.4.1] - 2026-03-11

### Added

- `seshflow done --start-next` to complete the current task and immediately start the next ready task without changing the default `next` / `start` command boundaries.

### Changed

- Refined the task-flow UX so the recommended “complete then continue” path can use one explicit shortcut instead of repeating `done -> next -> start`.
- Updated README and CLI docs to describe the new shortcut and keep the `next` / `start` boundary clear.

## [1.4.0] - 2026-03-11

### Added

- Delegated git worktree handoff model with explicit lifecycle objects, stable handoff ids, executor metadata, and bounded parent-managed truth.
- `seshflow handoff create/list/show` plus lifecycle actions `activate`, `pause`, `submit`, `abandon`, `reclaim`, and `close`.
- Agent-consumable handoff manifest and bounded bundle generation for delegated worktrees.
- Parent delegation registry surfaced through `ncfr`, `next`, `show`, `rpc shell`, workspace overview, and lightweight search.
- Lightweight expected-artifact warnings on `done` and `handoff submit`.

### Changed

- Reframed `v1.4.0` around delegated handoff instead of realtime dashboards or visualization-heavy follow-ups.
- Added actionable git preflight guidance for `handoff create` when the repository has no initial commit.
- Added cleanup guidance to `handoff close` and `handoff show` without taking over merge or deletion semantics.
- Updated README, CLI docs, release notes, and skills to reflect the delegated handoff boundary.

## [1.3.1] - 2026-03-10

### Changed

- Split primary CLI help from advanced integration help so `rpc shell`, workspace index inspection, and other developer surfaces no longer distract normal usage flows.
- Clarified `contractfirst` guidance across README, CLI docs, skills, and init quick-start output.
- Tightened high-frequency command payloads so `ncfr`, `next`, `start`, `done`, and `show` default to smaller, non-empty summaries.
- Clarified contract bundle import guidance for JSON objects, JSON arrays, and JSONL bundles.

### Fixed

- Made pre-init probes such as `seshflow ncfr` side-effect free; probing an uninitialized directory no longer creates partial `.seshflow` state.
- Relaxed contract `kind` and `protocol` handling so descriptive values like `event-stream` work consistently for both single-file and batch imports.
- Reduced repeated empty contract/runtime/process sections in AI-facing JSON responses.
- Added lightweight `contractStatus` and `inspectionHint` hints so high-frequency commands stay discoverable without inflating default output.

## [1.3.0] - 2026-03-09

### Added

- Contract-first workspace bootstrap through `seshflow init contractfirst`.
- First-class API/RPC contract registry with validation, single-file add, and bundle import.
- Explicit task, Markdown, and file binding to contracts.
- Contract-first context on `ncfr`, `next`, `show`, and `rpc shell`.
- Contract drift reminders, workspace index, and mode capability payloads.
- Hook taxonomy, hook payload envelopes, and hook result kinds for stable integration seams.
- Boundary and package-consumption best-practices documentation.

### Changed

- Elevated `contractfirst` as the preferred public term while keeping `apifirst` compatible.
- Relaxed contract handling to support broader payloads through `payload`, `metadata`, and `extensions`.
- Omitted empty fields from `currentContract` and contract inspection payloads by default.
- Added stable command aliases for common high-frequency flows.

### Fixed

- Reduced workspace and contract output noise for AI-first usage.
- Aligned skills, README, CLI docs, and release status around the `v1.3.0` contract-first boundary.

## [1.2.0] - 2026-03-09

### Added

- Unified task transition service for `start`, `done`, `suspend`, `skip`, and `next`.
- Task-scoped runtime recording for commands, logs, output roots, artifacts, and notes.
- Task-scoped background process registry and process summaries.
- Explicit dependency management commands with circular and self-dependency validation.
- Managed Markdown planning contract with stable task identity and `import --update`.
- Hook registry, persisted runtime events, and announcement abstraction.
- Runtime-backed web control plane with bilingual UI support.

### Changed

- Repositioned Seshflow as an AI development runtime control plane instead of a generic task board.
- Defaulted AI-facing CLI commands to structured JSON output.
- Reduced default payload size for high-frequency commands while preserving `--full` expansion.
- Clarified planning-layer Markdown versus runtime-layer JSON responsibilities.
- Improved workspace detection, source-of-truth reporting, and UTF-8 handling.

### Fixed

- Removed stale blocker persistence by deriving dependency blockers at read time.
- Fixed workspace consistency regressions across `init`, `list`, `query`, and `show`.
- Stabilized modal behavior, scrolling, and locale switching in the web UI.
- Improved Markdown validation and import diagnostics plus output contract consistency.
