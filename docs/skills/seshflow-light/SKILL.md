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

Notes:

- Both commands may be run from a nested subdirectory; `seshflow` resolves the active workspace upward.
- Read the returned `workspace.source` metadata when repository roots may have moved or when multiple workspaces are possible.
- `seshflow ncfr --json` is intentionally minimal by default; only use `seshflow ncfr --json --full` when the task actually needs dependency snapshots, recent completions, or extra path metadata.
- In `ncfr --json`, `currentTask` is only non-null when a real active session exists. Otherwise, use `nextReadyTask`.

Do not repeatedly run `init` or `ncfr` unless user asks to refresh context explicitly.

## Intent-based next-step hints

After `init`, suggest one next step based on user intent:

- If user wants to start work now:
  - suggest `seshflow next --json`
- If user wants to review backlog first:
  - suggest `seshflow list --json`
- If user wants to import tasks:
  - suggest `seshflow import <file>`
- If user wants to plan many tasks or revise a plan:
  - suggest editing a managed Markdown task file, then `seshflow validate <file>` and `seshflow import <file>`

After `ncfr --json`, suggest one next step based on detected state:

- If there is an active task/session:
  - suggest `seshflow show <taskId> --json` or continue coding directly
- If there is no active session and ready tasks exist:
  - suggest `seshflow next --json`
- If top candidate is blocked:
  - suggest `seshflow deps <taskId> --json`

## On-demand command reveal

Only reveal commands that match the immediate user intent:

- Execution: `next`, `start`, `done`, `suspend`
- Runtime capture: `record`
- Background processes: `process add`, `process list`
- Announcements: `announce progress`
- Inspection: `show`, `list`, `query`, `stats`, `deps`
- Data flow: `import`, `export`, `validate`

For dependency work, prefer explicit mutation commands over manual file edits:

- add a dependency: `seshflow add-dep <taskId> <dependsOnTaskId> --json`
- remove a dependency: `seshflow remove-dep <taskId> <dependsOnTaskId> --json`
- bulk dependency edits during task edits: `seshflow edit <taskId> --add-dep <taskId>` or `--remove-dep <taskId>`

For high-frequency inspection commands, prefer the summary JSON shape first:

- `seshflow list --json`
- `seshflow query --json`

Only request full task payloads when the next step actually needs them:

- `seshflow list --json --full`
- `seshflow query --json --full`

For batch planning, treat managed Markdown as the planning surface and `.seshflow/tasks.json` as the runtime state store.
Use stable task ids in Markdown (`[id:task_xxx]`) and prefer dependency ids (`[dependency:task_other]`).
To revise a plan, edit the same Markdown file and run `seshflow import <file> --update`.
Do not assume arbitrary bidirectional Markdown/JSON sync exists; runtime state remains in JSON.

When switching away from an active task, prefer explicit intent:

- normal pause: `seshflow suspend`
- direct task handoff: `seshflow start <taskId> --switch`

Prefer `--json` for machine steps.

For state-changing machine steps, prefer structured output too:

- `seshflow start <taskId> --json`
- `seshflow done [taskId] --json`
- `seshflow suspend --json`
- `seshflow skip --json`

When an executed command, log file, output directory, or produced artifact matters for resuming work, persist it explicitly:

- `seshflow record --json --command "<cmd>" --cwd "<dir>" --log "<logfile>" --output-root "<dir>" --artifact "<file1,file2>"`

When a long-running background job matters for resuming work, register and refresh it explicitly:

- `seshflow process add --json --pid <pid> --command "<cmd>" --cwd "<dir>" --output-root "<dir>"`
- `seshflow process list --json --refresh`

When a progress checkpoint should be made explicit for downstream recovery or notification plumbing, emit a task-scoped announcement event:

- `seshflow announce progress --json --percent <number> --note "<checkpoint>"`

Transition-triggered hooks now write persisted runtime events. Treat blocking `before_*` hook failures as authoritative and inspect `show <taskId> --json` for `recentRuntimeEvents` when a transition fails unexpectedly.

When the lightweight web control plane is available, treat it as a read-only runtime surface backed by `.seshflow/tasks.json`:

- use it to inspect current focus, runtime summaries, process summaries, and recent runtime events
- do not assume drag-and-drop board edits are authoritative
- keep state mutation in the CLI contract until the web/API control plane is explicitly expanded

## Guardrails

- Keep command set minimal in each turn.
- Do not introduce process complexity unless requested.
- Fix blockers first, then resume flow.
- This skill is an execution guide, not a full framework.
