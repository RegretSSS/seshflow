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
