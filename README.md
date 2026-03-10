# Seshflow

Runtime control plane for AI-assisted software development.

Seshflow is not a generic project board. It keeps planning state, active-task context, runtime logs, process records, transition events, and recovery hints in one workspace so an AI can resume engineering work without re-deriving the entire repo state.

## Why choose Seshflow

Use Seshflow when you want an AI assistant to work like a consistent engineering collaborator instead of a stateless chat window.

What it gives you:

- task state that survives across chats
- explicit "what should I do now" context through `seshflow ncfr`
- recoverable runtime history: commands, logs, artifacts, background processes, transition events
- contract-first planning when API, RPC, or message agreements must be established before implementation
- contract bundles can be imported from a JSON array or JSONL file
- controlled contract extension fields through `metadata` and `extensions`
- thin CLI, Web, and RPC seams over the same workspace truth

Seshflow is 100% AI-oriented, but the documentation and command flow should still be readable and operable by humans.

## Status

- `v1.3.1` is the current release line.
- `v1.3.0` scope: contract-first `apifirst` mode, explicit AI context priority, hook/RPC seams, workspace index, and boundary best practices on top of the `v1.2.0` execution core.
- `v1.3.0` design target is documented in `docs/apifirst-mode.md`.
- `v1.4.0` is now in development on `development` and is focused on delegated git worktree handoff.

## Install

```bash
npm install -g @seshflow/cli
# or
pnpm add -g @seshflow/cli
# or
yarn global add @seshflow/cli
```

The executable remains `seshflow`.

## Core features

- AI-first workspace bootstrap:
  - `seshflow init`
  - `seshflow ncfr`
  - `seshflow next`
- managed planning:
  - single-task add/edit flows
  - batch Markdown planning with stable task ids and `import --update`
- execution recovery:
  - `start`, `suspend`, `done`
  - `record` for commands, logs, output roots, artifacts
  - `process add/list` for background jobs
  - persisted runtime events and announcements
- dependency control:
  - explicit dependency mutation
  - blocker derivation and dependency views
- contract-first mode:
  - contract registry
  - single-file or batch contract import
  - task/Markdown/file binding
  - drift reminders
  - contract-first context and explicit `contextPriority`
- integration seams:
  - hook taxonomy and result kinds
  - RPC shell payloads
  - workspace index and mode capabilities
- delegated handoff foundation (`v1.4.0` in progress):
  - parent-managed handoff records
  - delegated git worktree creation
  - execution-surface manifests and bounded handoff bundles without creating a second task truth
  - delegated tasks are skipped by `next` and guarded by `start` unless explicitly reclaimed with `--force`

## Typical human-readable usage

If you are driving Seshflow manually and do not want JSON on screen, use:

```bash
seshflow ncfr --pretty
seshflow next --compact
seshflow show <taskId> --pretty
```

You can also opt out globally:

```bash
SESHFLOW_OUTPUT=pretty
```

Default JSON remains the correct mode for AI, automation, and tool integrations.

Use `--full` cautiously on inspection commands. It is intentionally high-context output and should be reserved for focused deep inspection.

Integration-facing commands such as `rpc shell`, workspace index inspection, and `magic` are hidden from the default help surface. Use `seshflow --help --advanced` when you explicitly need those seams.

## Human-friendly starting flow

```bash
seshflow init
seshflow ncfr
seshflow next
```

Use this path when the workspace is still ordinary task/execution management and no explicit API, RPC, or message contract has become the main coordination truth yet.

Recommended sequence:

1. run `seshflow init` once per workspace
2. start each new AI conversation with `seshflow ncfr`
3. follow the returned focus into planning, inspection, or execution

AI-facing commands now default to structured JSON, so `ncfr` already returns the minimal workspace snapshot needed to decide what to do next.

What the three core commands return:

- `seshflow init`
  - creates `.seshflow/config.json`, `.seshflow/tasks.json`, and starter planning templates
  - prints the resolved workspace location and the mode that was initialized
- `seshflow ncfr`
  - returns the current workspace snapshot
  - tells AI whether there is an active task, a next ready task, or no immediate focus
  - in `contractfirst`, it also returns `currentContract`, `contractReminderSummary`, and `contextPriority`
  - `currentContract` only includes non-empty fields
- `seshflow next`
  - returns the next actionable task, or the currently active task if one is already running
  - includes blocker information and workspace mode metadata
  - in `contractfirst`, it also carries the primary contract context for that task
  - high-frequency commands like `ncfr`, `next`, `start`, and `done` omit empty sections by default and keep `--full` for larger inspection payloads

## Contract-first mode (`v1.3.0`, current command aliases: `contractfirst`, `apifirst`)

```bash
seshflow init contractfirst
seshflow contracts import .seshflow/contracts/contracts.bundle.json
seshflow contracts import .seshflow/contracts/contracts.bundle.jsonl
seshflow contracts add .seshflow/contracts/contract.user-service.create-user.json
seshflow contracts add .seshflow/contracts/contract.board-service.move-card.json
seshflow validate .seshflow/plans/api-planning.md
seshflow import .seshflow/plans/api-planning.md --update
seshflow contracts check
```

Use this mode as soon as API, RPC, or message contracts become the thing multiple tasks or agents must agree on before implementation.

For an existing workspace, migrate instead of re-initializing:

```bash
seshflow mode set contractfirst
```

That preserves the current task/runtime state and upgrades the workspace into contract-first operation.

Accepted mode names today:

- `apifirst`
- `contractfirst`
- `contract-first`

This mode is not limited to classic frontend/backend coding. Use it whenever multiple tasks or agents must align on a declared contract before execution.

Contract authoring rules today:

- one contract per JSON file still works well for small workspaces
- batch contract bootstrap is supported through `seshflow contracts import <file>`
- recommended batch formats:
  - `.json` with a JSON array of contracts
  - `.jsonl` with one contract per line
- supported import bundle formats:
  - JSON object
  - JSON array
  - JSONL
- batch import examples:
  - `seshflow contracts import .seshflow/contracts/contracts.bundle.json`
  - `seshflow contracts import .seshflow/contracts/contracts.bundle.jsonl`
- Seshflow only depends on a small set of core fields for binding, reminders, and context recovery:
  - `id`
  - `version`
  - `kind`
  - `protocol`
  - `name`
- broader protocol content can live in:
  - `payload`
  - `metadata`
  - `extensions`
- `kind` and `protocol` are descriptive in `v1.3.x`; custom values such as `event-stream` are stored as-is
- `currentContract` and `contracts show` omit empty fields by default

Where contract linkage comes from:

1. contract truth is stored in `.seshflow/contracts/<contractId>.json`
2. contract-first planning is usually authored in `.seshflow/plans/api-planning.md`
3. task-to-contract linkage is created by:
   - `## Contract: <contractId>` groups in managed Markdown
   - `[contracts:<contractId>]` metadata on specific Markdown tasks
   - explicit task fields such as `contractIds`, `contractRole`, and `boundFiles`
4. `ncfr`, `next`, and `show` read that binding data and decide which contract to surface first

## Planning flow

For one-off tasks:

```bash
seshflow add "Implement runtime event retention" --priority P1
```

For batch planning and revisions:

```bash
seshflow validate tasks.md
seshflow import tasks.md
seshflow import tasks.md --update
```

Managed Markdown is the planning surface. `.seshflow/tasks.json` remains the runtime state store.

For humans, the practical rule is:

- use `add` for one-offs
- use Markdown for large plans and repeated revisions
- keep runtime state in Seshflow, not in free-form notes

## Execution flow

```bash
seshflow start <taskId>
seshflow record --command "pnpm test" --cwd packages/cli
seshflow process add --pid 12345 --command "vite dev"
seshflow done <taskId>
```

Key AI-facing commands:

- `seshflow ncfr`
- `seshflow next`
- `seshflow show <taskId>`
- `seshflow list`
- `seshflow query`
- `seshflow start <taskId>`
- `seshflow suspend`
- `seshflow done <taskId>`
- `seshflow add-dep <taskId> <dependsOnTaskId>`
- `seshflow remove-dep <taskId> <dependsOnTaskId>`
- `seshflow contracts list`
- `seshflow contracts show <contractId>`
- `seshflow mode show`

Human-readable examples:

```bash
seshflow list --pretty
seshflow show <taskId> --pretty
seshflow stats --compact
```

## Web control plane

The web package is a lightweight, read-only runtime surface over the same workspace data. It shows current focus, task summaries, runtime records, process summaries, and recent runtime events. State mutation remains CLI-first until the API mode is expanded.

## Boundary

Seshflow stops at the development kernel:

- tasks, dependencies, runtime context, contracts, hooks, and modes
- thin CLI/Web/RPC seams over the same domain rules

Seshflow does not aim to become the full Agent product. Future Agent-specific concerns such as model routing, long-running autonomous loops, prompt policy, and cross-tool orchestration should live in the Agent project and integrate through Seshflow's RPC/API/hooks.

For package-consumption and scope decisions, use `docs/best-practices.md`.

## Output modes

- default: structured JSON for AI/tooling
- `--compact`: low-noise text
- `--pretty`: human-readable text
- `--no-json`: explicit text fallback for commands that default to JSON

Defaults:

- AI-facing commands: `json`
- opt out per call with `--pretty`, `--compact`, or `--no-json`
- override globally with `SESHFLOW_OUTPUT=json|compact|pretty`

## Skills

- `docs/CLI.md`
- `docs/skills/seshflow-light/SKILL.md`
- `docs/skills/INSTALL.md`

Skill guidance follows the same boundary:

- start with `seshflow init` for ordinary task work
- switch immediately to contract-first mode with `seshflow init contractfirst` or `seshflow mode set contractfirst` once API/RPC coordination becomes part of the work

Stable convenience aliases:

- `seshflow contract ...` for `seshflow contracts ...`
- `seshflow workspace ...` for `seshflow workspaces ...`
- `seshflow proc ...` for `seshflow process ...`
- `seshflow pause` for `seshflow suspend`
- `seshflow rm <taskId>` for `seshflow delete <taskId>`

## License

MIT
