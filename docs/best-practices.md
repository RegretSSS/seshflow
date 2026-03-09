# Seshflow Best Practices

This document is the package-consumption and boundary-hardening guide for Seshflow.

Use it when deciding:

- whether a feature belongs inside Seshflow or outside it
- how an Agent project should consume Seshflow
- how to extend Seshflow without turning it into a generic workflow engine

## 1. Treat Seshflow as a development kernel

Seshflow should remain the development kernel, not the full Agent product.

Good fits for Seshflow:

- task lifecycle and dependency state
- contract-first planning and task binding
- runtime records, process records, and recovery state
- hook seams, mode profiles, and RPC shell payloads
- compact context surfaces for AI recovery

Bad fits for Seshflow:

- model routing and model selection policy
- prompt orchestration and conversation memory policy
- autonomous agent loop management
- broad cross-tool orchestration logic
- user-facing chat UX as a primary product concern

## 2. Use Seshflow through stable seams

Agent-side code should consume Seshflow through its explicit seams:

- CLI JSON outputs for human/AI terminal workflows
- `rpc shell` payloads for stable machine-readable workspace, task, and contract context
- hook seams for lifecycle integration
- persisted runtime events for recovery and observability

Do not rely on:

- undocumented file layout beyond declared contract/planning/runtime stores
- implicit field ordering in JSON payloads
- ad hoc parsing of human-readable text output
- source-code comments as protocol truth

## 3. Prefer contract truth over repo guesswork

In `apifirst` workspaces:

- define API/RPC contracts first
- bind tasks and files to contracts explicitly
- let `ncfr`, `next`, `show`, and `rpc shell` recover protocol truth
- use drift reminders instead of asking AI to rediscover agreements from code

Do not treat:

- function names
- route file names
- scattered markdown notes
- old chat history

as stronger truth than the declared Seshflow contract object.

## 4. Keep context small and ordered

Seshflow should optimize for:

- minimal default context
- explicit priority of sections
- stable JSON contracts
- suppression of empty or low-value sections by default

When adding a new output field, ask:

1. Is this primary context, secondary context, or supplemental context?
2. Is it needed on every call, or only in `--full`/special surfaces?
3. Does it reduce AI guessing, or just add more text?

If the field does not reduce ambiguity or recovery cost, it should not be in the default path.

## 5. Keep mode composition bounded

Modes in Seshflow are profile-based, not a free-form DSL.

Allowed:

- a small number of validated preset modes
- bounded overrides on a few explicit fields
- capability summaries exposed through `mode show` and `rpc shell`

Not allowed:

- arbitrary user-defined mode logic
- hidden behavior switches with unclear persistence rules
- separate semantics between CLI, Web, and RPC

## 6. Keep hook semantics explicit

Hooks should remain:

- serial
- schema-based
- compact in payload shape
- explicit in `family`, `surface`, `phase`, `trigger`, and `resultKind`

Current hook result meanings:

- `guard`: blocking gate before state mutation
- `advisory`: warning/reminder style result
- `enrichment`: non-guard success that adds follow-up context

Do not let hooks become:

- an unbounded plugin runtime
- a hidden source of business truth
- a backdoor for Agent policy

## 7. Decide scope with a simple test

A feature likely belongs in Seshflow if all of these are true:

1. It improves task, contract, runtime, hook, mode, or recovery truth.
2. It benefits any consumer of the Seshflow package, not just one future Agent app.
3. It can be exposed through stable seams without embedding app-specific policy.

A feature likely belongs outside Seshflow if any of these are true:

1. It mainly serves conversation control or prompt shaping.
2. It mainly serves model behavior or routing.
3. It mainly serves autonomous planning/execution policy.
4. It only helps one specific Agent UI/application and provides no package-level kernel value.

## 8. Recommended adoption pattern

For package consumers:

1. Use `seshflow init` or `seshflow init apifirst` to create an explicit workspace shape.
2. Use JSON-first command outputs in automation.
3. Use `rpc shell` for stable machine-readable consumption.
4. Use hook seams and runtime events to integrate external policy.
5. Keep Agent-specific logic outside the Seshflow repository unless the change strengthens a public seam.

## 9. Anti-patterns

Avoid these:

- adding features because they help one private workflow but do not strengthen the package
- pushing Agent runtime policy into hooks, mode logic, or core services
- making default outputs larger to compensate for weak seam design
- treating Seshflow like a general-purpose workflow engine
- creating hidden state outside the documented workspace/runtime stores

## 10. Related documents

- `docs/development.md`
- `docs/development-backlog.md`
- `docs/apifirst-mode.md`
- `docs/hook-seams.md`
