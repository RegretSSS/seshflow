# Seshflow

Cross-session task sequencer for AI-assisted development.

## Install

```bash
npm install -g seshflow
# or
pnpm install -g seshflow
# or
yarn global add seshflow
```

Legacy package name is still available: `@seshflow/cli`.

## Quick Start

```bash
seshflow init
seshflow add "My first task" --priority P1
seshflow next
seshflow done --hours 1 --note "finished"
```

Batch import from markdown:

```bash
seshflow import tasks.md
```

## Core Commands

- `seshflow init`
- `seshflow add <title>`
- `seshflow list`
- `seshflow next`
- `seshflow start <taskId>`
- `seshflow done [taskId]`
- `seshflow show <taskId>`
- `seshflow query`
- `seshflow stats`
- `seshflow import <file>`
- `seshflow export [output]`

Compatibility:

- `seshflow complete <taskId>` is kept as an alias of `seshflow done <taskId>`.

## Output Modes

- `--json`: structured output for tools
- `--compact`: low-noise text output
- `--pretty`: human-friendly output

Defaults:

- TTY: `pretty`
- non-TTY: `compact`
- override with `SESHFLOW_OUTPUT=compact|pretty`

## AI Usage

```bash
seshflow ncfr --json
seshflow next --json
seshflow show <task-id> --json
seshflow query --priority P0 --json
```

## Skill Docs

- Lightweight skill: `docs/skills/seshflow-light/SKILL.md`
- Install guide: `docs/skills/INSTALL.md`

## License

MIT
