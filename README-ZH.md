# Seshflow

面向 AI 辅助开发的跨会话任务序列器。

## 安装

```bash
npm install -g seshflow
# 或
pnpm install -g seshflow
# 或
yarn global add seshflow
```

历史包名 `@seshflow/cli` 仍可使用。

## 快速开始

```bash
seshflow init
seshflow add "我的第一个任务" --priority P1
seshflow next
seshflow done --hours 1 --note "已完成"
```

批量导入 Markdown 任务：

```bash
seshflow import tasks.md
```

## 核心命令

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

兼容说明：

- `seshflow complete <taskId>` 保留为 `seshflow done <taskId>` 的别名。

## 输出模式

- `--json`：结构化输出，便于工具消费
- `--compact`：低噪声文本输出
- `--pretty`：面向人工阅读的输出

默认行为：

- TTY：`pretty`
- 非 TTY：`compact`
- 可通过 `SESHFLOW_OUTPUT=compact|pretty` 覆盖

## AI 使用方式

`ncfr` 是 `NewChatFirstRound` 的缩写。

每次开启新的 AI 对话前，先执行：

```bash
seshflow ncfr --json
```

这是新对话中的第一步，之后再执行 `next/show/query`：

```bash
seshflow next --json
seshflow show <task-id> --json
seshflow query --priority P0 --json
```

## Skill 文档

- 轻量技能：`docs/skills/seshflow-light/SKILL.md`
- 安装指南：`docs/skills/INSTALL.md`

## 许可证

MIT
