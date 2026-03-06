---
name: seshflow-light
description: Lightweight progressive-disclosure workflow for repositories using seshflow. Use when an AI assistant should start each new conversation with minimal context cost by running seshflow init (if needed) and seshflow ncfr --json first, then reveal only one intent-matched next command at a time.
---

# seshflow-light

Lightweight skill for AI assistants using `seshflow` with progressive disclosure.

## Disclosure model (important)

Expose only two commands up front:

1. `seshflow init`
2. `seshflow ncfr --json`

Everything else must be introduced only when needed by intent.

## One-time bootstrap per conversation

Run these at most once per new conversation:

1. Initialize workspace if missing:
   - `seshflow init`
2. Load context snapshot:
   - `seshflow ncfr --json`

Do not repeatedly run `init` or `ncfr` unless user asks to refresh context explicitly.

## Intent-based next-step hints

After `init`, suggest one next step based on user intent:

- If user wants to start work now:
  - suggest `seshflow next --json`
- If user wants to review backlog first:
  - suggest `seshflow list --json`
- If user wants to import tasks:
  - suggest `seshflow import <file>`

After `ncfr --json`, suggest one next step based on detected state:

- If there is an active task/session:
  - suggest `seshflow show <taskId> --json` or continue coding directly
- If there is no active session and ready tasks exist:
  - suggest `seshflow next --json`
- If top candidate is blocked:
  - suggest `seshflow deps <taskId> --json`

## On-demand command reveal

Only reveal commands that match the immediate user intent:

- Execution: `next`, `start`, `done`
- Inspection: `show`, `list`, `query`, `stats`, `deps`
- Data flow: `import`, `export`, `validate`

Prefer `--json` for machine steps.

## Guardrails

- Keep command set minimal in each turn.
- Do not introduce process complexity unless requested.
- Fix blockers first, then resume flow.
- This skill is an execution guide, not a full framework.
