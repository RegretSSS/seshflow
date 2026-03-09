# Seshflow

Runtime control plane for AI-assisted software development.

Seshflow is not a generic project board. It keeps planning state, active-task context, runtime logs, process records, transition events, and recovery hints in one workspace so an AI can resume engineering work without re-deriving the entire state of the repo.

## Install

```bash
npm install -g seshflow
# or
pnpm install -g seshflow
# or
yarn global add seshflow
```

Legacy package name remains available: `@seshflow/cli`.

## AI-first flow

```bash
seshflow init
seshflow ncfr --json
seshflow next --json
```

Use `ncfr --json` as the first step of a new AI conversation. It gives the minimal workspace snapshot needed to decide what to do next.

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
seshflow start <taskId> --json
seshflow record --json --command "pnpm test" --cwd packages/cli
seshflow process add --json --pid 12345 --command "vite dev"
seshflow done <taskId> --json
```

Key machine-friendly commands:

- `seshflow ncfr --json`
- `seshflow next --json`
- `seshflow show <taskId> --json`
- `seshflow list --json`
- `seshflow query --json`
- `seshflow start <taskId> --json`
- `seshflow suspend --json`
- `seshflow done <taskId> --json`
- `seshflow add-dep <taskId> <dependsOnTaskId> --json`
- `seshflow remove-dep <taskId> <dependsOnTaskId> --json`

## Web control plane

The web package is a lightweight, read-only runtime surface over the same workspace data. It shows current focus, task summaries, runtime records, process summaries, and recent runtime events. State mutation remains CLI-first until the API mode is expanded.

## Output modes

- `--json`: structured output for AI/tooling
- `--compact`: low-noise text
- `--pretty`: human-readable text

Defaults:

- TTY: `pretty`
- non-TTY: `compact`
- override with `SESHFLOW_OUTPUT=compact|pretty`

## Skills

- `docs/skills/seshflow-light/SKILL.md`
- `docs/skills/INSTALL.md`

## License

MIT
