# Changelog

All notable changes to this project are documented in this file.

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
