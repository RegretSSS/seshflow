# Seshflow v1.3.0 Release Notes

`v1.3.0` is the first release that makes `contractfirst` a real contract-first development mode instead of a planning concept.

## Highlights

- `seshflow init contractfirst` bootstraps contract-first workspaces
- API/RPC contracts are first-class objects with contract storage, validation, and registration
- tasks, managed Markdown plans, and implementation files can bind to contracts explicitly
- `ncfr`, `next`, `show`, and `rpc shell` now expose contract-first context with explicit `contextPriority`
- contract drift reminders, contract-scoped task views, and contract-aware runtime seams are available
- hook seams now expose explicit taxonomy and compact payload envelopes
- `rpc shell` exposes mode capabilities for machine consumers
- boundary and package-consumption best practices are now documented

## Package versions

- `@seshflow/cli@1.3.0`
- `@seshflow/shared@1.3.0`
- `@seshflow/web@1.3.0`

## What changed since v1.2.0

- Added contract-first `contractfirst` mode
- Added contract registry and validation flows
- Added contract/task/file binding
- Added drift reminders and contract-aware context recovery
- Added explicit AI context-priority payloads
- Added hook taxonomy, hook payload envelopes, and hook result kinds
- Added bounded mode-profile overrides
- Added workspace index and RPC capability surface
- Added explicit boundary best-practices documentation

## Notes

- `v1.4.0` is still planned and has not started.
- realtime sync and advanced graph/observability remain outside this release.
