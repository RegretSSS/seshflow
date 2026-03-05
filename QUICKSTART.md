# Seshflow 快速使用指南

## 安装与初始化

```bash
# 进入项目目录
cd seshflow

# 安装依赖
pnpm install

# 全局链接 CLI（可选，便于测试）
pnpm --filter @seshflow/cli link

# 或者直接使用 node 运行
node packages/cli/bin/seshflow.js [command]
```

## 基础使用流程

### 1. 初始化工作区

```bash
seshflow init
# 或
node packages/cli/bin/seshflow.js init
```

输出：
```
✔ Seshflow workspace initialized

✓ Workspace ready!
  Location: /path/to/project/.seshflow
  Config: .seshflow/config.yaml

Next steps:
  seshflow add "My first task"
  seshflow next
```

### 2. 添加任务

```bash
# 简单任务
seshflow add "实现用户登录"

# 带详细信息的任务
seshflow add "设计数据库Schema" \
  --desc "设计用户、文章、评论表结构" \
  --priority P0 \
  --tags database,design \
  --estimate 4

# 添加依赖任务
seshflow add "实现RESTful API" \
  --desc "开发用户、文章、评论的CRUD接口" \
  --priority P0 \
  --depends task_1772703532984_28f4 \
  --estimate 8
```

参数说明：
- `--desc`: 任务描述（支持 Markdown）
- `--priority`: 优先级（P0=最高, P1=高, P2=中, P3=低）
- `--tags`: 标签（逗号分隔）
- `--depends`: 依赖的任务ID（逗号分隔）
- `--estimate`: 预估工时（小时）
- `--assignee`: 指派给谁
- `--branch`: Git 分支名

### 3. 开始工作

```bash
seshflow next
```

输出：
```
✔ Session started

┌─ Design database schema
├────────────────────────┐
│ ID: task_1772703532984_28f4
│ Priority: P0
│ Status: in-progress
│ Estimated: 4h (Actual: 0h)
│ Tags: database, design
│
│ Description:
│   Design user and article tables
└────────────────────────┘

📋 AI Context:
Current Task: Design database schema
Description: Design user and article tables
Last Session: No notes from last session
```

### 4. 完成任务

```bash
# 完成当前任务
seshflow done --hours 3.5 --note "数据库设计完成，包含所有表结构"

# 完成指定任务
seshflow complete task_1772703532984_28f4 --hours 4
```

## 工作流程示例

### 场景：开发新功能

```bash
# 1. 初始化
seshflow init

# 2. 规划任务
seshflow add "设计数据库" --priority P0 --tags backend,db --estimate 4
seshflow add "开发API" --priority P0 --tags backend,api --depends <task_id> --estimate 8
seshflow add "前端页面" --priority P1 --tags frontend,react --estimate 6

# 3. 开始第一个任务
seshflow next
# AI 看到上下文：设计数据库，优先级 P0，预估 4h

# 4. 工作...（Git 提交会自动关联）
git add .
git commit -m "feat: add user table design"

# 5. 完成任务
seshflow done --hours 3.5 --note "完成数据库设计"

# 6. 继续下一个任务
seshflow next
```

## 数据存储

所有数据存储在 `.seshflow/` 目录：

```
.seshflow/
├── tasks.json       # 任务数据
├── config.yaml      # 配置文件
└── sessions/        # 会话记录
```

### tasks.json 结构

```json
{
  "version": "1.0.0",
  "workspace": {
    "name": "my-project",
    "path": "/path/to/project"
  },
  "tasks": [
    {
      "id": "task_1772703532984_28f4",
      "title": "Design database schema",
      "description": "...",
      "status": "in-progress",
      "priority": "P0",
      "dependencies": [],
      "estimatedHours": 4,
      "actualHours": 0,
      "tags": ["database", "design"],
      "gitBranch": "design-database-schema",
      "gitCommits": [],
      "sessions": []
    }
  ],
  "currentSession": {
    "taskId": "task_1772703532984_28f4",
    "startedAt": "2024-01-01T10:30:00.000Z"
  }
}
```

## 任务状态流转

```
backlog (待办池)
    ↓
todo (准备做)
    ↓
in-progress (进行中) ← [seshflow next]
    ↓
review (审核)
    ↓
done (完成) ← [seshflow done]
    ↓
blocked (阻塞) ← 任何时候都可能
```

## 依赖关系

```bash
# 添加依赖任务
seshflow add "任务B" --depends task_A_id

# 查看依赖树（即将支持）
seshflow tree
```

依赖规则：
- 未完成的依赖任务会阻塞当前任务
- `seshflow next` 会自动跳过被阻塞的任务
- 优先级相同时，按依赖顺序排序

## 测试

```bash
# 验证项目结构
node scripts/simple-test.js

# 测试核心功能
node scripts/verify-setup.js

# 运行单元测试
pnpm --filter @seshflow/cli test
```

## 配置文件

`.seshflow/config.yaml` 示例：

```yaml
workspace:
  name: "my-project"
  type: "linux"
  path: "/home/user/project"

network:
  port: 5423
  webPort: 5424
  discovery:
    enabled: true
    methods: ["broadcast", "file"]

git:
  autoHook: true
  commitTemplate: "feat({taskId}): {message}"

ui:
  defaultView: "board"
  columns: ["backlog", "todo", "in-progress", "review", "done", "blocked"]
```

## 常见问题

**Q: 如何查看所有任务？**
A: 目前可以查看 `.seshflow/tasks.json` 文件，后续会添加 `seshflow list` 命令。

**Q: 如何编辑任务？**
A: 直接编辑 `.seshflow/tasks.json` 文件，或使用即将推出的 `seshflow edit` 命令。

**Q: 会话数据会丢失吗？**
A: 不会。所有会话都保存在任务数据的 `sessions` 数组中，可以随时查看历史会话。

**Q: 可以在多个项目中使用吗？**
A: 可以。每个项目有独立的 `.seshflow/` 目录，数据完全隔离。

## 下一步

- 查看 [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) 了解开发进度
- 查看 [docs.md](./docs.md) 了解完整技术规划
- 查看 [README.md](./README.md) 了解项目概述

## 获取帮助

```bash
seshflow --help
seshflow [command] --help
```
