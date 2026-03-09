# @seshflow/web

Runtime-backed web control plane for the active Seshflow workspace.

This package is intentionally read-only in `v1.2`. It renders the current workspace snapshot, task summaries, runtime summaries, process summaries, and recent runtime events from the same `.seshflow` data the CLI uses.

## Features

- Runtime-backed board grouped by task status
- Workspace summary for current focus, transitions, and event counts
- Task detail panel with bilingual UI support
- Runtime summary, process summary, and recent event visibility
- Lightweight polling for local workspace refresh

## Development

```bash
pnpm --filter @seshflow/web dev
```

Open `http://127.0.0.1:3000/`.

## Build

```bash
pnpm --filter @seshflow/web build
```

## Scope

- Reads the active local workspace snapshot
- Does not mutate task state directly
- Multi-workspace overview stays in the API-first roadmap, not `v1.2`

## License

MIT
