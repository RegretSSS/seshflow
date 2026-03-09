# Seshflow

面向 AI 辅助软件开发的运行控制面。

Seshflow 不是通用任务板，而是把规划状态、当前任务上下文、运行日志、后台进程、状态迁移事件和恢复提示收拢到同一个工作区里，让 AI 在跨会话继续开发时不必重新猜测现场。

## 当前状态

- 当前发版主线是 `v1.2.0`
- `v1.2.0` 范围：执行内核、受控规划导入/更新、runtime 事件记录、最小可用的 runtime-backed Web 控制面
- `v1.3.0` 预留给 `apifirst`，它表示“契约先行的开发模式”，不是把项目改造成泛化 HTTP 平台
- `v1.3.0` 的具体设计目标见 `docs/apifirst-mode.md` 与 `docs/apifirst-mode.zh-CN.md`

## 安装

```bash
npm install -g @seshflow/cli
# 或
pnpm add -g @seshflow/cli
# 或
yarn global add @seshflow/cli
```

命令行入口仍然是 `seshflow`。

## 面向 AI 的基本流程

```bash
seshflow init
seshflow ncfr
seshflow next
```

每次开启新的 AI 对话，都应先执行 `seshflow ncfr`。面向 AI 的命令现在默认输出结构化 JSON，可直接返回决定下一步所需的最小上下文。

## API-first 流程（`v1.3.0` 进行中）

```bash
seshflow init apifirst
seshflow contracts add .seshflow/contracts/contract.user-service.create-user.json
seshflow contracts add .seshflow/contracts/contract.board-service.move-card.json
seshflow validate .seshflow/plans/api-planning.md
seshflow import .seshflow/plans/api-planning.md --update
seshflow contracts check
```

如果是已有 workspace，需要迁移到契约先行模式，可执行 `seshflow mode set apifirst`，不会丢掉现有任务。

## 任务规划流程

单条任务可直接添加：

```bash
seshflow add "实现 runtime event 保留策略" --priority P1
```

批量规划和反复修订建议走 Markdown：

```bash
seshflow validate tasks.md
seshflow import tasks.md
seshflow import tasks.md --update
```

受控 Markdown 是规划层，`.seshflow/tasks.json` 是执行层状态存储。

## 执行流程

```bash
seshflow start <taskId>
seshflow record --command "pnpm test" --cwd packages/cli
seshflow process add --pid 12345 --command "vite dev"
seshflow done <taskId>
```

常用 AI 接口：

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

## Web 控制面

Web 包当前是同一工作区数据上的轻量只读运行面板，用来查看当前焦点、任务摘要、运行记录、进程摘要和近期 runtime event。真正的状态变更仍以 CLI 为主，直到后续 API 模式扩展完成。

## 边界

Seshflow 到“开发内核”这一层为止：

- 任务、依赖、runtime 上下文、契约、hooks、modes
- 基于同一套领域规则暴露 CLI / Web / RPC 接缝

Seshflow 不会扩成完整 Agent 产品。后续 Agent 项目中的模型路由、长循环自治、prompt 策略、跨工具编排等能力，应当通过 Seshflow 预留的 RPC/API/hooks 接入，而不是继续塞进 Seshflow 核心。

## 输出模式

- 默认：给 AI 和工具用的结构化 JSON 输出
- `--compact`：低噪音文本
- `--pretty`：给人读的文本
- `--no-json`：显式切回文本模式

默认规则：

- 面向 AI 的命令默认 `json`
- 每次可用 `--pretty`、`--compact` 或 `--no-json` 覆盖
- 也可通过 `SESHFLOW_OUTPUT=json|compact|pretty` 统一覆盖

## Skills

- `docs/skills/seshflow-light/SKILL.md`
- `docs/skills/INSTALL.md`

## 许可证

MIT
