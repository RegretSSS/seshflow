# Seshflow

面向 AI 辅助软件开发的运行控制面。

Seshflow 不是通用任务板，而是把规划状态、当前任务上下文、运行日志、后台进程、状态迁移事件和恢复提示收拢到同一个工作区里，让 AI 在跨会话继续开发时不用重新猜测现场。

## 安装

```bash
npm install -g seshflow
# 或
pnpm install -g seshflow
# 或
yarn global add seshflow
```

历史包名 `@seshflow/cli` 仍可使用。

## 面向 AI 的基本流程

```bash
seshflow init
seshflow ncfr --json
seshflow next --json
```

每次开启新的 AI 对话，都应先执行 `seshflow ncfr --json`，用最小必要上下文决定下一步动作。

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
seshflow start <taskId> --json
seshflow record --json --command "pnpm test" --cwd packages/cli
seshflow process add --json --pid 12345 --command "vite dev"
seshflow done <taskId> --json
```

常用机器接口：

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

## Web 控制面

Web 包现在是同一工作区数据上的轻量只读视图，用来查看当前焦点、任务摘要、运行记录、进程摘要和近期 runtime event。真正的状态变更仍以 CLI 为主，直到后续 API 模式扩展完成。

## 输出模式

- `--json`：给 AI 和工具用的结构化输出
- `--compact`：低噪音文本
- `--pretty`：给人读的文本

默认规则：

- TTY：`pretty`
- 非 TTY：`compact`
- 可通过 `SESHFLOW_OUTPUT=compact|pretty` 覆盖

## Skills

- `docs/skills/seshflow-light/SKILL.md`
- `docs/skills/INSTALL.md`

## 许可证

MIT
