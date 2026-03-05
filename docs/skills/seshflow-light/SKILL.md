# seshflow-light

Lightweight skill for AI assistants using `seshflow` in real projects.

## When to use

- You are in a repo that uses `seshflow`.
- You need minimal, repeatable task flow.
- You want low context cost and stable command patterns.

## Core policy

1. Prefer `--json` for machine steps.
2. Keep command set small.
3. Do not add process complexity.
4. Fix blockers first, then continue task flow.

## Standard flow

1. Load context:
   - `seshflow ncfr --json`
2. Pick current work:
   - `seshflow next --json`
3. Execute code/test loop in the repo.
4. Complete task:
   - `seshflow done --note "<what changed>"`
   - Add `--hours` only if the team requires time tracking.
5. Move forward:
   - `seshflow next --json`

## Fast diagnostics

- Task list:
  - `seshflow list --json`
- Filtered query:
  - `seshflow query --priority P0 --status todo --json`
- Dependency check:
  - `seshflow deps <taskId> --json`
- Progress:
  - `seshflow stats --json`

## Error handling

- Unknown task id:
  - run `seshflow list --json`, then retry with valid id.
- Import/format issue:
  - run `seshflow validate <file>`, fix warnings, re-import.
- Blocked task:
  - use `deps` output and switch to unblocked P0/P1 work.

## Scope guardrails

- Do not add team-collaboration, notification, or UI workflows here.
- Do not require extra tools to use this skill.
- Keep this skill as an execution guide, not a framework.
