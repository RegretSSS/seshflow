# Seshflow

Runtime control plane for AI-assisted software development.

Seshflow is not a generic project board. It keeps planning state, active-task context, runtime logs, process records, transition events, and recovery hints in one workspace so an AI can resume engineering work without re-deriving the entire repo state.

## Status

- `v1.3.0` is the current release line.
- `v1.3.0` scope: contract-first `apifirst` mode, explicit AI context priority, hook/RPC seams, workspace index, and boundary best practices on top of the `v1.2.0` execution core.
- `v1.3.0` design target is documented in `docs/apifirst-mode.md`.
- `v1.4.0` remains planned and has not started.

## Install

```bash
npm install -g @seshflow/cli
# or
pnpm add -g @seshflow/cli
# or
yarn global add @seshflow/cli
```

The executable remains `seshflow`.

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

## Contract-first mode (`v1.3.0`, current command: `apifirst`)

```bash
seshflow init apifirst
seshflow contracts add .seshflow/contracts/contract.user-service.create-user.json
seshflow contracts add .seshflow/contracts/contract.board-service.move-card.json
seshflow validate .seshflow/plans/api-planning.md
seshflow import .seshflow/plans/api-planning.md --update
seshflow contracts check
```

Use this mode as soon as API, RPC, or message contracts become the thing multiple tasks or agents must agree on before implementation.

For an existing workspace, migrate instead of re-initializing:

```bash
seshflow mode set apifirst
```

That preserves the current task/runtime state and upgrades the workspace into contract-first operation.

Accepted mode names today:

- `apifirst`
- `contractfirst`
- `contract-first`

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

- `docs/skills/seshflow-light/SKILL.md`
- `docs/skills/INSTALL.md`

Skill guidance follows the same boundary:

- start with `seshflow init` for ordinary task work
- switch immediately to contract-first mode with `seshflow init apifirst` or `seshflow mode set apifirst` once API/RPC coordination becomes part of the work

Stable convenience aliases:

- `seshflow contract ...` for `seshflow contracts ...`
- `seshflow workspace ...` for `seshflow workspaces ...`
- `seshflow proc ...` for `seshflow process ...`
- `seshflow pause` for `seshflow suspend`
- `seshflow rm <taskId>` for `seshflow delete <taskId>`

## License

MIT
