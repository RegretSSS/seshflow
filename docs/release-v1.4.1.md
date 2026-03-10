# Seshflow v1.4.1

`v1.4.1` is a focused hotfix release for the high-frequency task flow.

## Highlights

- Added `seshflow done --start-next` so an AI or human operator can finish the current task and immediately start the next ready task in one explicit command.
- Kept the existing command boundary intact:
  - `next` remains the recommended sequential discovery flow
  - `start <taskId>` remains the explicit task-switching / task-selection flow
- Updated CLI and README documentation to explain when to use the shortcut versus the base commands.

## Why this release exists

Repeated real-world testing showed a common interaction loop:

1. `seshflow done`
2. `seshflow next`
3. `seshflow start <taskId>`

That loop is valid, but wasteful when the operator already trusts the default sequencing model. `v1.4.1` adds a shortcut without collapsing the command model or making task transitions implicit.

## Boundary preserved

This release does **not**:

- merge `next` and `start` into one command
- change `next` into a pure selector
- change `start` away from explicit task switching

The hotfix only adds a narrower “complete and continue” shortcut.
