# API-first 模式（`v1.3.0`）

这份文档把 `apifirst` 从“口号”收敛成可实现的设计目标。

在 Seshflow 里，`API-first` 指的是一种“契约先行”的开发模式，不是把 Seshflow 改造成一个泛化 HTTP 服务平台。

## 用户最终会感知到什么

开发者应当在 3 个地方明确感知到自己处于 `apifirst` 模式：

1. `seshflow init apifirst` 会生成契约导向的脚手架，而不只是任务脚手架。
2. `seshflow ncfr`、`seshflow next`、`seshflow show` 会先展示绑定契约，再展示更宽泛的仓库上下文。
3. 当实现工作偏离契约时，Seshflow 会主动提醒 drift/conflict，而不是让 AI 去代码里重新猜协议。

AI 拿到 contract 的顺序应当是可预测的：

1. 先在 `.seshflow/contracts/` 下写入或导入契约文件
2. 再通过 `.seshflow/plans/api-planning.md` 或任务字段把工作绑定到契约
3. 执行 `seshflow ncfr`、`seshflow next` 或 `seshflow show`
4. Seshflow 根据这些绑定信息解析主契约，并把它作为 `currentContract` 暴露出来

## 工作区结构

`seshflow init apifirst` 预期创建或补齐这些文件：

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

和默认模式相比，差异是：

- `.seshflow/config.json` 里会写入 `"mode": "apifirst"`
- `.seshflow/contracts/` 成为契约的规范存储位置
- `.seshflow/plans/api-planning.md` 成为契约绑定任务的起始规划文件
- 现有任务、runtime、依赖能力不变，只是多了 contract-aware 行为

默认模式应允许后续迁移：

```bash
seshflow mode set apifirst
```

迁移时只补脚手架，不破坏已有任务。

## 配置结构

`.seshflow/config.json` 最小新增字段：

```json
{
  "version": 1,
  "mode": "apifirst",
  "contractsDir": ".seshflow/contracts",
  "plansDir": ".seshflow/plans",
  "defaultPlan": ".seshflow/plans/api-planning.md"
}
```

## 契约存储与身份

- 存储位置：`.seshflow/contracts/*.json`
- 格式：`v1.3.0` 只支持 JSON
- 一个契约一个文件
- 文件名规则：使用稳定 contract id，不把版本号编码进文件名

示例路径：

```text
.seshflow/contracts/contract.user-service.create-user.json
```

RPC 起始示例：

```text
.seshflow/contracts/contract.board-service.move-card.json
```

版本号放在文件内容里，不放在文件名里。

这样做的原因：

- 和当前默认 JSON 输出风格一致
- 第一版 contract-aware 模式避免格式分叉
- 可以直接内嵌 JSON Schema 片段，不需要引入新的 DSL

## 契约对象

`v1.3.0` 的目标一等契约对象如下：

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

如果是 RPC 契约，`kind` 改为 `"rpc"`，并把 `endpoint` 改成：

```json
{
  "service": "UserService",
  "method": "CreateUser"
}
```

当 `contracts add` 拒绝一个非法契约文件时，CLI 应返回 issue 级别的校验细节、字段提示以及起始示例路径，不能让 AI 去猜缺了哪些 RPC 字段。

`v1.3.0` 中的 schema 语言统一为 JSON Schema 片段，不做 TypeScript 类型解析，也不引入自定义 DSL。

## “归属”是什么意思

`owner` 表示谁对契约真实性负责，通常是：

- 负责该协议的服务
- 所属团队/领域
- 持有该契约的核心任务

它会被用于：

- `ncfr` / `show` 里提升相关契约的重要性
- 将任务归到正确的契约组
- 决定哪些 drift reminder 和当前任务强相关

它不是组织架构管理功能。

## 任务如何绑定契约

任务层需要新增这些字段：

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

绑定规则：

- `contractIds` 是任务绑定契约的规范字段
- `contractRole` 取值为 `producer`、`consumer`、`reviewer`
- `boundFiles` 是可选字段，用于把实现文件路径和任务绑起来

一个任务绑定多个契约是允许的，但应当是少数场景，例如：

- API gateway 同时编排多个下游契约
- 兼容性审查任务同时覆盖请求契约和事件契约

主路径仍然应是“一组任务服务一个契约”。

## Markdown 规划如何表达契约

托管 Markdown 需要支持显式的契约分组：

```md
## Contract: contract.user-service.create-user

- [ ] Draft request and response schema [id:task_api_create_user_contract] [contracts:contract.user-service.create-user] [P0]
- [ ] Implement POST /users route [id:task_impl_create_user_route] [contracts:contract.user-service.create-user] [depends:task_api_create_user_contract] [P0]
- [ ] Update web form submit flow [id:task_consume_create_user] [contracts:contract.user-service.create-user] [depends:task_impl_create_user_route] [P1]
```

规则：

- `## Contract: ...` 为该分组下的任务设置默认契约
- `[contracts:...]` 可以显式覆盖或追加绑定
- `import --update` 仍然必须先按 stable id 匹配，再保留契约绑定

也就是说，`v1.3.0` 里契约关联不是靠扫代码猜出来的，而是由这些来源明确决定：

- `.seshflow/contracts/<contractId>.json`
- 托管 Markdown 里的 contract 分组和 contract 元数据
- 任务对象里的 `contractIds`、`contractRole`、`boundFiles`

## 契约优先的上下文解析

`currentContract` 的解析顺序建议为：

1. 当前活动任务的主契约
2. workspace state 里显式聚焦的契约
3. next ready task 的主契约
4. 最近一个存在 open drift reminder 的契约

如果活动任务绑定多个契约：

- `currentContract` 返回主契约
- 其余放入 `relatedContracts`
- `contractReminders` 与 `contractReminderSummary` 需要按主契约聚合，不只看当前单个任务

API-first 的这些输出面不能靠“字段出现顺序”来暗示重要性。`ncfr`、`next`、`show` 和 `rpc shell` 应显式返回一个 `contextPriority` 对象，让 Agent 侧不用猜：

- 哪个 section 是主上下文
- 哪些 section 必须先看
- 哪些 section 只是补充信息
- 哪些 section 因为空值被压掉了

目标结构：

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

未解决的协议问题来自：

- 契约对象内的 `openQuestions`
- drift 检查后无法自动解决的问题

`v1.3.0` 不应承诺从任意代码注释里自动推理出协议问题。

## 命令输出差异

默认模式下的 `ncfr`：

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

`apifirst` 模式下的 `ncfr`：

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

`apifirst` 模式下的 `show <taskId>` 还应额外展示：

- 绑定契约
- 契约角色
- 未解决的契约问题
- 与该任务相关的 drift reminder

`next` 在 `apifirst` 下也不该只给任务本身，而要把主契约一起带出来。

## Drift / Conflict Reminders

`v1.3.0` 的 drift 检测应当是“收敛且明确”的，不应承诺深度语义代码分析。

第一阶段可检测：

- 任务绑定了契约，但契约文件不存在
- 契约版本已变更，而绑定任务仍引用旧版本上下文
- 契约存在未关闭的 required/open question，但 AI 正准备启动实现任务
- `boundFiles` 指向的文件路径不存在
- Markdown 契约分组和导入后的任务绑定不一致
- 结构化 implementation note metadata 与契约的 method/path/service/method name 不一致

提醒入口：

- `ncfr` 内联提示
- `next` 内联提示
- `show` 内联提示
- 独立命令：

```bash
seshflow contracts check
```

这里的 `implementation notes` 指的是 Seshflow 跟踪的结构化元数据，不是任意源码注释。

## 一条完整 CLI 流程

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

这条路径表达的生命周期是：

1. 先把 workspace 切到 `apifirst`
2. 先写契约文件
3. 再创建或导入绑定契约的任务
4. 执行前优先恢复协议上下文
5. drift 检测负责在 AI 猜协议前发出提醒

## RPC/API/Hook 接缝

`v1.3.0` 这里要做的是“预留稳定接缝”，不是强行把完整 Agent runtime 做进来。

这一阶段的交付物应是：

- 契约对象的 JSON payload 规范
- task-to-contract binding 字段规范
- contract-first context-priority payload 规范
- contract-aware hook payload 规范
- 给未来 Agent 用的 RPC/API shell 边界说明

更详细的 hook seam 说明见 `docs/hook-seams.zh-CN.md`。

`rpc shell` 还应返回一个紧凑的 `capabilities` 区块，让外部 Agent 不用额外探测多条命令，就能知道当前 mode profile 和可用接缝。最少应包含：

- 当前激活的 mode
- mode compatibility 摘要
- mode capabilities 摘要
- 支持的 RPC shell surface

`v1.3.0` 可以支持“有限的 mode profile override”，但不能演化成自由 DSL。可接受示例：

- `seshflow mode set apifirst --drift-reminders off`
- `seshflow mode set apifirst --context-priority basic-task`

这些 override 必须字段范围明确、可校验，并落在 `profile` 对象里。

到 `v1.3.0` 结束时，至少应有这些 contract-aware hook 事件：

- `contract.bound`
- `contract.unbound`
- `contract.changed`
- `contract.drift_detected`
- `mode.changed`

这些 hook 仍然遵守当前 blocking / non-blocking 语义。

## Workspace Index

Workspace index 在 `v1.3.0` 里是次要项，不是 `apifirst` 的定义本身。

建议存储位置：

```text
~/.seshflow/workspaces.json
```

用途：

- 为后续多 workspace 控制面提供发现能力
- 但不应重新定义 `apifirst`

## `v1.3.0` 明确不做

- 任意用户编辑场景下的 Markdown/JSON 全双向同步
- 任意实现代码的 AST 级语义理解
- 从源码自动反推出协议定义
- Agent 侧 prompt policy、model routing、autonomous loop 等运行时策略
