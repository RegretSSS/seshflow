# Seshflow v1.4.0 Release Notes

`v1.4.0` makes delegated git worktree handoff a first-class Seshflow capability.

## Highlights

- create delegated handoffs directly from parent-managed tasks
- materialize isolated git worktrees without creating a second source of task truth
- generate bounded handoff bundles for external coding agents or human executors
- keep delegated state visible from the parent workspace through `ncfr`, `next`, `show`, `handoff list/show`, and workspace overview
- separate handoff lifecycle from task lifecycle so `submit`, `reclaim`, and `close` never pretend a task is automatically done

## Package versions

- `@seshflow/cli@1.4.0`
- `@seshflow/shared@1.4.0`
- `@seshflow/web@1.4.0`

## What changed since v1.3.1

- Added first-class handoff model storage in the parent workspace
- Added `handoff create` and git worktree materialization
- Added bounded manifest/bundle generation for delegated execution
- Surfaced delegated task state through high-frequency parent workspace commands
- Added handoff lifecycle control and inspection surfaces
- Added minimal workspace overview and handoff search support for delegated flows
- Added lightweight expected-artifact warnings and handoff cleanup guidance

## Boundary notes

- Seshflow manages handoff truth and binding, not autonomous agent execution.
- A handoff worktree is an execution surface, not a new source of task truth.
- This release does not add an agent runtime, automatic merge/review semantics, realtime dashboard sync, or heavy visualization.
