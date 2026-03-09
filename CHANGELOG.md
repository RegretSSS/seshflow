# Changelog

All notable changes to this project are documented in this file.

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
