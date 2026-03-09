# Hook Seams (`post-v1.3` kernel hardening)

This document defines the stable hook taxonomy and payload envelope that external Agent code can rely on without pulling Agent runtime policy into Seshflow.

## Scope

Seshflow hook seams are for:

- task-transition guards and follow-up notifications
- contract lifecycle and drift reminders
- mode lifecycle events

They are not a full plugin platform yet.

## Taxonomy

Hook names are grouped by family and surface:

| Hook | Family | Surface | Phase | Trigger |
| --- | --- | --- | --- | --- |
| `before_start` | `task-transition` | `task` | `before` | `task.start` |
| `after_start` | `task-transition` | `task` | `after` | `task.start` |
| `before_done` | `task-transition` | `task` | `before` | `task.done` |
| `after_done` | `task-transition` | `task` | `after` | `task.done` |
| `contract.bound` | `contract` | `workspace` | `event` | `contract.bound` |
| `contract.unbound` | `contract` | `workspace` | `event` | `contract.unbound` |
| `contract.changed` | `contract` | `workspace` | `event` | `contract.changed` |
| `contract.drift_detected` | `contract` | `workspace` | `event` | `contract.drift_detected` |
| `mode.changed` | `mode` | `workspace` | `event` | `mode.changed` |

## Payload envelope

Every hook execution should receive a compact envelope with:

```json
{
  "schemaVersion": 1,
  "hook": {
    "name": "before_start",
    "family": "task-transition",
    "surface": "task",
    "phase": "before",
    "trigger": "task.start"
  },
  "workspace": {
    "path": "...",
    "name": "seshflow",
    "gitBranch": "development",
    "source": "workspace-file"
  },
  "mode": {
    "current": "apifirst",
    "requested": "apifirst"
  },
  "task": {
    "id": "task_123",
    "title": "Implement route",
    "status": "todo",
    "priority": "P0",
    "contractIds": ["contract.user-service.create-user"],
    "contractRole": "producer",
    "boundFiles": ["src/routes/users.ts"]
  },
  "contracts": {
    "ids": ["contract.user-service.create-user"],
    "primaryId": "contract.user-service.create-user"
  },
  "transition": {
    "id": "evt_...",
    "type": "task.start",
    "statusFrom": "todo",
    "statusTo": "in-progress",
    "occurredAt": "..."
  },
  "event": {
    "type": "task.start",
    "source": "cli.start",
    "message": null,
    "level": null
  },
  "data": {}
}
```

## Design rules

- The envelope must stay compact. It is for routing and validation, not full workspace export.
- Contract truth comes from ids and task bindings, not from scanning source files.
- Hook payloads should remain serializable and safe to persist in runtime events.
- Agent-side policy should consume these seams; it should not live inside Seshflow.

## Current implementation boundary

- Hook execution remains serial and local.
- Built-in actions are still minimal (`noop`, `fail`).
- The value in this stage is the stable taxonomy and payload contract, not a rich remote execution runtime.
