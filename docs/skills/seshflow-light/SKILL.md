---
name: seshflow-light
description: Lightweight progressive-disclosure workflow for repositories using seshflow. Use when an AI assistant should start each new conversation with minimal context cost by running seshflow init (or seshflow init apifirst when appropriate) and seshflow ncfr first, then reveal only one intent-matched next command at a time.
---

# seshflow-light

Lightweight skill for AI assistants using `seshflow` with progressive disclosure.

## Disclosure model (important)

Expose only two commands up front:

1. `seshflow init`
2. `seshflow ncfr`

When the repository clearly needs contract-first work, the allowed initialization variant is:

- `seshflow init apifirst`

Treat `apifirst` as the current command name for Seshflow's contract-first mode, not as a claim that the work must be frontend/backend coding only.

Everything else must be introduced only when needed by intent.

## One-time bootstrap per conversation

Run these at most once per new conversation:

1. Initialize workspace if missing:
   - `seshflow init`
   - for large API/RPC projects, use `seshflow init apifirst`
2. Load context snapshot:
   - `seshflow ncfr`

Notes:

- Both commands may be run from a nested subdirectory; `seshflow` resolves the active workspace upward.
- Read the returned `workspace.source` metadata when repository roots may have moved or when multiple workspaces are possible.
- `seshflow` now defaults to structured JSON for AI-facing commands. Use `--pretty` or `--compact` only when a human-readable view is actually needed.
- When the workspace is explicitly in `apifirst` mode, treat contract truth as primary. Prefer `seshflow contracts add`, `seshflow contracts check`, and contract-linked Markdown planning before broad implementation work.
- `seshflow ncfr` is intentionally minimal by default; only use `seshflow ncfr --full` when the task actually needs dependency snapshots, recent completions, or extra path metadata.
- In `ncfr`, `currentTask` is only non-null when a real active session exists. Otherwise, use `nextReadyTask`.
- In `apifirst`, read `contextPriority`, `currentContract`, `contractReminderSummary`, and `openContractQuestions` before broader repo context.
- `workspaces list` is now summary-first by default. Only use `seshflow workspaces list --full` when a multi-workspace investigation truly needs every registered path.

Do not repeatedly run `init` or `ncfr` unless user asks to refresh context explicitly.

## Intent-based next-step hints

After `init`, suggest one next step based on user intent:

- If user wants to start work now:
  - suggest `seshflow next`
- If user wants to review backlog first:
  - suggest `seshflow list`
- If user wants to import tasks:
  - suggest `seshflow import <file>`
- If user wants to plan many tasks or revise a plan:
  - suggest editing a managed Markdown task file, then `seshflow validate <file>` and `seshflow import <file>`
- If user wants contract-first setup for large API/RPC work:
  - suggest `seshflow init apifirst` for new workspaces
  - suggest `seshflow mode set apifirst` for existing workspaces as soon as API/RPC/message coordination becomes part of the task

After `ncfr`, suggest one next step based on detected state:

- If there is an active task/session:
  - suggest `seshflow show <taskId>` or continue coding directly
- If there is no active session and ready tasks exist:
  - suggest `seshflow next`
- If the workspace is in `apifirst` mode and no contracts exist yet:
  - suggest authoring a starter contract file under `.seshflow/contracts/` and then `seshflow contracts add <file>`
- If the workspace is in `apifirst` mode and reminders exist:
  - suggest `seshflow contracts check`
- If top candidate is blocked:
  - suggest `seshflow deps <taskId>`

## On-demand command reveal

Only reveal commands that match the immediate user intent:

- Execution: `next`, `start`, `done`, `suspend`
- Runtime capture: `record`
- Background processes: `process add`, `process list`
- Announcements: `announce progress`
- API-first contracts: `contracts add`, `contracts list`, `contracts show`, `contracts check`, `mode show`, `mode set`
- Agent/RPC seams: `rpc shell`
- Multi-workspace overview: `workspaces current`, `workspaces list`
- Inspection: `show`, `list`, `query`, `stats`, `deps`
- Data flow: `import`, `export`, `validate`

For dependency work, prefer explicit mutation commands over manual file edits:

- add a dependency: `seshflow add-dep <taskId> <dependsOnTaskId> --json`
- remove a dependency: `seshflow remove-dep <taskId> <dependsOnTaskId> --json`
- bulk dependency edits during task edits: `seshflow edit <taskId> --add-dep <taskId>` or `--remove-dep <taskId>`

For high-frequency inspection commands, prefer the summary JSON shape first:

- `seshflow list`
- `seshflow query`
- `seshflow show <taskId>`

Only request full task payloads when the next step actually needs them:

- `seshflow list --full`
- `seshflow query --full`
- `seshflow show <taskId> --full`

For batch planning, treat managed Markdown as the planning surface and `.seshflow/tasks.json` as the runtime state store.
Use stable task ids in Markdown (`[id:task_xxx]`) and prefer dependency ids (`[dependency:task_other]`).
To revise a plan, edit the same Markdown file and run `seshflow import <file> --update`.
Do not assume arbitrary bidirectional Markdown/JSON sync exists; runtime state remains in JSON.

In `apifirst`, managed Markdown should also preserve contract grouping:

- use `## Contract: <contractId>` to scope grouped tasks
- keep `[contracts:<contractId>]` explicit when a task crosses groups
- do not clear an existing `contractRole` unless the plan explicitly changes it

When switching away from an active task, prefer explicit intent:

- normal pause: `seshflow suspend`
- direct task handoff: `seshflow start <taskId> --switch`

Structured JSON is already the default for AI-facing machine steps. Use plain commands first and only add `--pretty`/`--compact` when needed.

When an executed command, log file, output directory, or produced artifact matters for resuming work, persist it explicitly:

- `seshflow record --command "<cmd>" --cwd "<dir>" --log "<logfile>" --output-root "<dir>" --artifact "<file1,file2>"`

When a long-running background job matters for resuming work, register and refresh it explicitly:

- `seshflow process add --pid <pid> --command "<cmd>" --cwd "<dir>" --output-root "<dir>"`
- `seshflow process list --refresh`

When a progress checkpoint should be made explicit for downstream recovery or notification plumbing, emit a task-scoped announcement event:

- `seshflow announce progress --percent <number> --note "<checkpoint>"`

Transition-triggered hooks now write persisted runtime events. Treat blocking `before_*` hook failures as authoritative and inspect `show <taskId> --full` for `recentRuntimeEvents` when a transition fails unexpectedly.

Hook-aware and Agent-aware guidance:

- `hook` results are not all equal; treat `guard` as blocking authority, `advisory` as warning, and `enrichment` as optional context
- `rpc shell` is a compact machine seam. Prefer it only when an external agent needs capability discovery or stable surface contracts
- In `apifirst`, trust `contextPriority.primarySection` instead of guessing field importance from payload order
- Avoid expanding low-value surfaces (`show --full`, `workspaces list --full`) unless the next action explicitly depends on them

When the lightweight web control plane is available, treat it as a read-only runtime surface backed by `.seshflow/tasks.json`:

- use it to inspect current focus, runtime summaries, process summaries, and recent runtime events
- do not assume drag-and-drop board edits are authoritative
- keep state mutation in the CLI contract until the web/API control plane is explicitly expanded

## Guardrails

- Keep command set minimal in each turn.
- Do not introduce process complexity unless requested.
- Fix blockers first, then resume flow.
- In `apifirst`, do not jump to broad repo inspection until contract context and reminders are understood.
- Default to summary outputs for high-frequency commands; reach for `--full` only with a concrete reason.
- This skill is an execution guide, not a full framework.
