# API-first Mode (`v1.3.0`)

This document makes `apifirst` concrete enough to implement.

In Seshflow, `API-first` means a contract-first development mode for large tasks. It does not mean "add a generic HTTP service layer to Seshflow".

## User-visible outcome

A developer should notice `apifirst` in three places:

1. `seshflow init apifirst` creates contract-oriented scaffolding instead of only task scaffolding.
2. `seshflow ncfr`, `seshflow next`, and `seshflow show` surface bound API/RPC contracts before broad repo context.
3. When implementation work drifts from the declared contract, Seshflow raises a contract reminder instead of making AI rediscover protocol truth from code.

## Workspace layout

`seshflow init apifirst` should create or update these files:

```text
.seshflow/
  config.json
  tasks.json
  contracts/
    README.md
    contract.user-service.create-user.json
    contract.board-service.move-card.json
  plans/
    api-planning.md
```

Expected differences from the default mode:

- `.seshflow/config.json` stores `"mode": "apifirst"`.
- `.seshflow/contracts/` becomes the canonical contract store.
- `.seshflow/plans/api-planning.md` becomes the starter planning surface for contract-linked work.
- Existing task/runtime behavior remains unchanged outside contract-aware features.

Mode migration is allowed. A default workspace may later run:

```bash
seshflow mode set apifirst
```

That migration must create the missing scaffold without destroying existing tasks.

## Config shape

Minimal `.seshflow/config.json` additions:

```json
{
  "version": 1,
  "mode": "apifirst",
  "contractsDir": ".seshflow/contracts",
  "plansDir": ".seshflow/plans",
  "defaultPlan": ".seshflow/plans/api-planning.md"
}
```

## Contract storage and identity

- Storage location: `.seshflow/contracts/*.json`
- Format: JSON only in `v1.3.0`
- One file per contract
- File name rule: stable contract id, not version

Example path:

```text
.seshflow/contracts/contract.user-service.create-user.json
```

Starter RPC example:

```text
.seshflow/contracts/contract.board-service.move-card.json
```

Why JSON:

- it matches the existing AI-first CLI defaults
- it avoids format branching in the first contract-aware release
- JSON Schema fragments can be embedded directly without inventing a new DSL

Version lives inside the file, not in the filename.

## Contract object

This is the target first-class contract shape for `v1.3.0`:

```json
{
  "schemaVersion": 1,
  "id": "contract.user-service.create-user",
  "version": "1.0.0",
  "kind": "api",
  "protocol": "http-json",
  "name": "Create User",
  "owner": {
    "service": "user-service",
    "team": "identity",
    "ownerTaskIds": [
      "task_api_create_user_contract"
    ]
  },
  "lifecycle": {
    "status": "draft",
    "compatibility": "backward-compatible",
    "supersedes": [],
    "replacedBy": null
  },
  "endpoint": {
    "method": "POST",
    "path": "/users"
  },
  "requestSchema": {
    "type": "object",
    "required": [
      "name",
      "email"
    ],
    "properties": {
      "name": {
        "type": "string"
      },
      "email": {
        "type": "string",
        "format": "email"
      }
    }
  },
  "responseSchema": {
    "type": "object",
    "required": [
      "id",
      "name",
      "email"
    ],
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "email": {
        "type": "string",
        "format": "email"
      }
    }
  },
  "consumers": [
    {
      "name": "web-app",
      "role": "caller"
    }
  ],
  "implementationBindings": [
    {
      "path": "packages/api/src/routes/users.ts",
      "kind": "route",
      "ownerTaskIds": [
        "task_impl_create_user_route"
      ]
    }
  ],
  "openQuestions": [
    {
      "id": "question_create_user_duplicate_email",
      "title": "How should duplicate email conflicts be returned?",
      "status": "open",
      "ownerTaskId": "task_api_create_user_contract"
    }
  ],
  "notes": [
    "This endpoint must stay backward-compatible for web-app callers."
  ]
}
```

For RPC contracts, `kind` becomes `"rpc"` and `endpoint` becomes `rpc`:

```json
{
  "service": "UserService",
  "method": "CreateUser"
}
```

When `contracts add` rejects a malformed contract, the CLI should return issue-level validation details, field-specific hints, and starter example paths. AI should not need to guess the missing RPC fields.

The schema language in `v1.3.0` is JSON Schema fragments only. No TypeScript-type parsing and no custom DSL.

## Ownership

`owner` means the domain/service/team responsible for keeping the contract true.

It is used for:

- prioritizing the contract in `ncfr` and `show`
- attaching tasks to the right contract group
- deciding which contract drift warnings matter to the current task

It does not imply org-chart features or permission management.

## Task-to-contract binding

Tasks gain these fields:

```json
{
  "contractIds": [
    "contract.user-service.create-user"
  ],
  "contractRole": "producer",
  "boundFiles": [
    "packages/api/src/routes/users.ts"
  ]
}
```

Binding rules:

- `contractIds` is the canonical task-level binding
- `contractRole` is one of `producer`, `consumer`, `reviewer`
- `boundFiles` is optional and must stay path-based

A task may bind to multiple contracts when it deliberately coordinates them, for example:

- API gateway task touching two downstream contracts
- compatibility review task spanning request and event contracts

That should stay uncommon. The primary path is one task group per contract.

## Markdown planning bindings

Managed Markdown must support explicit contract grouping.

Recommended shape:

```md
## Contract: contract.user-service.create-user

- [ ] Draft request and response schema [id:task_api_create_user_contract] [contracts:contract.user-service.create-user] [P0]
- [ ] Implement POST /users route [id:task_impl_create_user_route] [contracts:contract.user-service.create-user] [depends:task_api_create_user_contract] [P0]
- [ ] Update web form submit flow [id:task_consume_create_user] [contracts:contract.user-service.create-user] [depends:task_impl_create_user_route] [P1]
```

Rules:

- `## Contract: ...` establishes the default contract group for child tasks
- `[contracts:...]` may override or add bindings explicitly
- `import --update` must preserve stable task identity first, then contract binding

## Contract-first context resolution

`currentContract` resolution order:

1. the active task's primary contract
2. an explicitly focused contract stored in workspace state
3. the next ready task's primary contract
4. the most recent contract with an open drift reminder

If the active task binds multiple contracts:

- return `currentContract` as the first primary binding
- return the rest in `relatedContracts`
- aggregate `contractReminders` and `contractReminderSummary` across tasks bound to the primary contract

API-first surfaces must not rely on field order alone to communicate importance. `ncfr`, `next`, `show`, and `rpc shell` should expose an explicit `contextPriority` object that tells Agent code:

- which section is primary
- which sections are required before broader repo/runtime context
- which sections are supplemental
- which sections were suppressed because they were empty

Target shape:

```json
{
  "strategy": "contract-first",
  "primarySection": "currentContract",
  "activeSections": [
    {
      "section": "currentContract",
      "rank": 1,
      "tier": "primary",
      "state": "present",
      "reason": "focus-task-bound-contract"
    },
    {
      "section": "contractReminders",
      "rank": 2,
      "tier": "primary",
      "state": "present",
      "reason": "active-contract-reminders"
    },
    {
      "section": "openContractQuestions",
      "rank": 3,
      "tier": "secondary",
      "state": "present",
      "reason": "unresolved-contract-questions"
    }
  ],
  "suppressedSections": [
    {
      "section": "relatedContracts",
      "tier": "secondary",
      "reason": "empty"
    }
  ]
}
```

Unresolved protocol questions come from:

- contract `openQuestions`
- contract drift checks that cannot be auto-resolved

They are not inferred from arbitrary code comments in `v1.3.0`.

## Command behavior differences

Default mode `ncfr`:

```json
{
  "mode": "default",
  "focus": "next-ready-task",
  "currentTask": null,
  "nextReadyTask": {
    "id": "task_123",
    "title": "Implement route"
  }
}
```

`apifirst` mode `ncfr`:

```json
{
  "mode": "apifirst",
  "focus": "contract-first",
  "contextPriority": {
    "strategy": "contract-first",
    "primarySection": "currentContract"
  },
  "currentTask": {
    "id": "task_impl_create_user_route",
    "title": "Implement POST /users route",
    "contractIds": [
      "contract.user-service.create-user"
    ]
  },
  "currentContract": {
    "id": "contract.user-service.create-user",
    "version": "1.0.0",
    "kind": "api",
    "endpoint": {
      "method": "POST",
      "path": "/users"
    }
  },
  "openContractQuestions": [
    {
      "id": "question_create_user_duplicate_email",
      "title": "How should duplicate email conflicts be returned?"
    }
  ],
  "contractReminderSummary": {
    "total": 2,
    "errors": 0,
    "warnings": 2
  },
  "relatedTasks": [
    "task_api_create_user_contract",
    "task_impl_create_user_route",
    "task_consume_create_user"
  ]
}
```

`show <taskId>` in `apifirst` should additionally surface:

- bound contracts
- contract role
- unresolved contract questions
- drift reminders touching that task

`next` in `apifirst` should prefer the next ready task together with its primary contract instead of presenting a task in isolation.

## Drift and conflict reminders

`v1.3.0` drift detection is scoped and explicit. It should not promise deep semantic code analysis.

Initial drift checks:

- task bound to a contract but contract file missing
- contract version changed but bound tasks still reference stale version context
- contract has open required questions and implementation task is being started
- bound file paths no longer exist
- Markdown contract group and imported task bindings disagree
- implementation note metadata disagrees with the declared contract path/method/service/method name

Reminder surfaces:

- inline in `ncfr`
- inline in `next`
- inline in `show`
- dedicated check command:

```bash
seshflow contracts check
```

`implementation notes` in this mode means structured metadata tracked by Seshflow, not arbitrary prose comments inside source files.

## End-to-end CLI flow

Example session:

```bash
seshflow init apifirst
seshflow contracts add .seshflow/contracts/contract.user-service.create-user.json
seshflow add "Draft Create User contract" --priority P0
seshflow edit task_api_create_user_contract --bind-contract contract.user-service.create-user
seshflow validate .seshflow/plans/api-planning.md
seshflow import .seshflow/plans/api-planning.md --update
seshflow ncfr
seshflow next
seshflow start task_impl_create_user_route
seshflow show task_impl_create_user_route
seshflow contracts check
```

Expected lifecycle:

1. bootstrap the workspace in `apifirst`
2. author the contract file first
3. create or import contract-linked tasks
4. bind implementation work to the contract
5. surface contract context before execution
6. detect drift before AI guesses from code

## RPC/API/Hook extension surface

This milestone reserves stable seams. It does not require shipping a full RPC server yet.

`v1.3.0` deliverables:

- documented JSON payloads for contract objects
- documented task-to-contract binding fields
- documented context-priority payloads for contract-first surfaces
- documented hook payload shape for contract-aware events
- documented RPC/API shell boundary for future Agent integration

Contract-aware hook events that should exist by the end of `v1.3.0`:

- `contract.bound`
- `contract.unbound`
- `contract.changed`
- `contract.drift_detected`
- `mode.changed`

These hooks must follow the same blocking/non-blocking rules as the existing task hooks.

## Workspace index

Workspace index is intentionally secondary in `v1.3.0`.

Target storage:

```text
~/.seshflow/workspaces.json
```

Purpose:

- let a later control plane discover multiple workspaces
- do not redefine what `apifirst` means

It is not the core of the contract-first mode.

## Out of scope for `v1.3.0`

- full bidirectional Markdown/JSON sync
- AST-level code understanding of arbitrary implementations
- automatic protocol derivation from source code
- Agent-side prompt policy, model routing, or autonomous loop logic
