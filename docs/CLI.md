# CLI Guide

This file is not a full command dictionary. It explains the CLI surfaces that define the normal Seshflow workflow.

## Core flow

### `seshflow init [mode]`

Use this once per workspace.

What it does:

- creates `.seshflow/config.json`
- creates `.seshflow/tasks.json`
- creates starter planning templates
- when `mode` is `contractfirst` / `apifirst`, also creates:
  - `.seshflow/contracts/`
  - `.seshflow/plans/api-planning.md`

What it returns:

- resolved workspace location
- source/root information
- initialized mode
- quick-start suggestions

### `seshflow ncfr`

Use this at the start of a new AI conversation.

What it returns:

- workspace snapshot
- current active task if a real session exists
- next ready task if no active session exists
- focus information that tells AI what to inspect next

If the current directory has not been initialized yet:

- `ncfr` returns a lightweight bootstrap hint only
- it does not create `.seshflow/` as a side effect
- it does not guess whether you meant `init` or `init contractfirst`

In `contractfirst`, it additionally returns:

- `currentContract`
- `relatedContracts`
- `openContractQuestions`
- `contractReminders`
- `contractReminderSummary`
- `contextPriority`
- those contract fields omit empty values by default
- high-frequency commands keep only non-empty context sections by default

### `seshflow next`

Use this when you want the next actionable step.

What it returns:

- the current in-progress task if one already exists
- otherwise the next ready task
- workspace mode metadata
- blocker/unmet-dependency information when relevant

In `contractfirst`, it additionally carries the primary contract context for that task.

Default JSON for `next`, `start`, and `done` is intentionally summary-oriented:

- empty contract/runtime/process sections are omitted
- task payloads are returned as action summaries, not full task documents
- use `show --full` when you want larger inspection output

### `seshflow handoff create <taskId>`

Use this when a task should be delegated into an isolated git worktree for an external coding agent or a human executor.

What it does:

- creates a parent-managed handoff record in the source workspace
- materializes a git worktree on a dedicated branch
- writes a handoff manifest and a bounded handoff bundle into the delegated worktree

What it does not do:

- it does not create a second source of task truth
- it does not mark the task `done`
- it does not run an agent loop

What it returns:

- `handoffId`
- `sourceTaskId`
- target branch/path
- manifest path
- bundle path
- lifecycle status

Delegated tasks remain parent-managed:

- `next` skips tasks that already have an active handoff
- `show <taskId>` surfaces the active delegation summary
- `start <taskId>` blocks delegated tasks unless you explicitly pass `--force`

### `seshflow handoff submit|pause|reclaim|abandon|close <handoffId>`

Use these commands to control the handoff lifecycle after a delegated worktree exists.

What they do:

- update only the handoff lifecycle
- sync the parent record, manifest, and bundle
- optionally attach a lifecycle note and a `resultRef` on `submit`

What they do not do:

- they do not mark the source task as `done`
- they do not turn the delegated worktree into a new source of task truth

Key boundaries:

- `submit` means "result submitted back to the parent workspace", not "task completed"
- `reclaim` returns control to the parent workspace so the task can be resumed locally
- `close` closes the handoff record only

## Contract-first linkage

Seshflow does not guess contract linkage from arbitrary code scans.

The contract-first chain is:

1. contract file exists in `.seshflow/contracts/<contractId>.json`
2. planning binds work through:
   - `## Contract: <contractId>` in managed Markdown
   - `[contracts:<contractId>]` metadata on tasks
3. task records store:
   - `contractIds`
   - `contractRole`
   - `boundFiles`
4. `ncfr`, `next`, and `show` resolve `currentContract` from those bindings

Notes:

- Seshflow does not infer contracts from source-code scans
- `currentContract` depends only on explicit bindings
- broader protocol content inside a contract file can live in `payload`, `metadata`, and `extensions`
- `kind` and `protocol` are descriptive metadata; custom strings like `event-stream` are allowed
- `seshflow contracts import <file>` accepts:
  - `.json` containing one contract object
  - `.json` containing a contract array
  - `.jsonl` containing one contract per line

## Human-readable output

Default output is JSON because Seshflow is AI-first.

For humans:

- `--pretty` gives readable text
- `--compact` gives low-noise text
- `--no-json` explicitly disables JSON on commands that default to it

Examples:

```bash
seshflow ncfr --pretty
seshflow next --compact
seshflow show <taskId> --pretty
```

Global override:

```bash
SESHFLOW_OUTPUT=pretty
```

Use `--full` cautiously on inspection commands. It is intentionally high-context output and should be reserved for focused deep inspection.

Advanced integration surfaces such as `rpc shell`, workspace index inspection, and `magic` are hidden from the default root help. Use `seshflow --help --advanced` when you explicitly need them.

## Stable aliases

Preferred contract-first mode names:

- `contractfirst`
- `contract-first`
- `apifirst` remains compatible

Stable command aliases:

- `contract` -> `contracts`
- `workspace` -> `workspaces`
- `proc` -> `process`
- `pause` -> `suspend`
- `rm` -> `delete`
