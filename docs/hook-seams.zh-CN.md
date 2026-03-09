# Hook 接缝（`v1.3` 后的内核硬化）

这份文档定义的是“稳定 hook taxonomy 与 payload envelope”，让外部 Agent 代码可以依赖 Seshflow 的接缝，而不用把 Agent 运行时策略塞回 Seshflow 内核。

## 范围

Seshflow 的 hook 接缝目前服务于：

- 任务状态迁移前后的守卫与通知
- 契约生命周期与 drift reminder
- mode 生命周期事件

它还不是完整插件平台。

## 分类

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

每次 hook 执行都应拿到一份紧凑的 envelope：

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

## 设计规则

- envelope 必须紧凑，它服务于路由和校验，不是完整 workspace 导出。
- 契约真相来自 contract id 和 task binding，不来自深度扫描源码。
- hook payload 必须可序列化，并适合落进 runtime event。
- Agent 侧策略应消费这些接缝，而不是住进 Seshflow 内核。

## 当前阶段边界

- hook 仍然是本地串行执行
- 内建 action 仍然很少（`noop`、`fail`）
- 当前阶段的价值是稳定 taxonomy 和 payload contract，不是完整远程执行 runtime
