# Seshflow

*A lever of the AI, by the AI, for the AI.*

面向 AI 辅助软件开发的运行控制面。

Seshflow 不是一个通用的任务面板。它把规划状态、当前任务上下文、运行日志、后台进程、状态迁移事件和恢复提示收拢在同一个工作区中，让 AI 跨会话持续开发时，不必每次都重新猜测现场。

## 为什么要用 Seshflow

如果你希望 AI 像一个能持续工作的工程协作者，而不是每次对话都失忆的聊天窗口，Seshflow 就是为这个场景设计的。

它能解决这些问题：

- 任务状态在多轮对话之间持续存在，不会丢失
- 通过 `seshflow init` 或 `seshflow init contractfirst` 初始化你的工作空间
- 通过 `seshflow ncfr` 明确告诉 AI“现在该做什么” 它代表 `New Chat First Round`
- 命令、日志、产物、后台进程、状态迁移事件都可以恢复
- 当 API、RPC、消息协议需要先签订契约时，可以切换到契约先行模式
- contract 也可以通过 JSON array 或 JSONL 批量导入
- 自定义 contract 数据可以放进 `metadata` 和 `extensions`
- CLI、Web、RPC 都基于同一个 workspace 数据源，保持信息一致

Seshflow 虽然 100% 面向 AI，但它依然支持人类使用。

## 当前状态

- 当前发版主线：`v1.3.0`
- `v1.3.0` 在 `v1.2.0` 执行内核的基础上，新增了契约先行模式（`contractfirst`）、显式 AI 上下文优先级、hook/RPC 接缝、多工作区索引和边界最佳实践
- `v1.3.0` 的具体设计目标见 `docs/apifirst-mode.md` 与 `docs/apifirst-mode.zh-CN.md`
- `v1.4.0` 仍在规划阶段，尚未开始实现

## 安装

```bash
npm install -g @seshflow/cli
# 或
pnpm add -g @seshflow/cli
# 或
yarn global add @seshflow/cli
```

命令行入口仍然是 `seshflow`。

## 核心特性（命令随使用逐步披露）

- 面向 AI 的工作区启动链路：
  - `seshflow init`
  - `seshflow ncfr`
  - `seshflow next`
- 受控规划能力：
  - 快速增删改单条任务
  - 基于稳定 task id，通过 Markdown 批量规划与 `import --update`
- 执行恢复能力：
  - `start`、`suspend`、`done`
  - `record` 记录命令、日志、输出目录、产物
  - `process add/list` 记录后台进程
  - 持久化 runtime events 和 announcements
- 依赖管理：
  - 显式添加或删除依赖
  - 自动推导 blocker
  - 依赖视图与链路检查
- 契约先行模式：
  - contract registry
  - 单文件或批量 contract 导入
  - task / Markdown / file 绑定
  - drift reminders
  - contract-first context 与显式 `contextPriority`
- 集成接缝：
  - hook 分类与结果类型
  - RPC shell payload
  - workspace index 与 mode capability

## 对人类友好的输出方式

如果你是人类直接操作，不想看默认的 JSON 格式，可以这样用：

```bash
seshflow ncfr --pretty
seshflow next --compact
seshflow show <taskId> --pretty
```

也可以全局切换输出模式：

```bash
SESHFLOW_OUTPUT=pretty
```

默认 JSON 仍然是给 AI、自动化和工具接入时最合适的模式。

## 对人友好的起步流程

```bash
seshflow init
seshflow ncfr
seshflow next
```

当 workspace 还只是普通任务管理和执行恢复，没有进入明确的 API / RPC / 消息契约协同阶段时，走这条路径。

推荐顺序：

1. 每个 workspace 先执行一次 `seshflow init`
2. 每次开启新的 AI 对话，先执行 `seshflow ncfr`
3. 根据返回的焦点决定下一步是规划、查看还是执行

面向 AI 的命令默认输出结构化 JSON，`ncfr` 会直接给出决定下一步所需的最小上下文。

这 3 个核心命令实际会给你什么：

- `seshflow init`
  - 创建 `.seshflow/config.json`、`.seshflow/tasks.json` 和起始规划模板
  - 输出当前解析到的 workspace 位置与初始化模式
- `seshflow ncfr`
  - 返回当前 workspace 的最小上下文快照
  - 明确告诉 AI：现在是有活动任务、存在 next ready task，还是当前没有焦点
  - 在 `contractfirst` 模式下，还会额外返回 `currentContract`、`contractReminderSummary`、`contextPriority`
- `seshflow next`
  - 返回下一个可执行任务；如果已经有活动任务，则优先返回当前活动任务
  - 同时给出 blocker 信息和 workspace mode 元数据
  - 在 `contractfirst` 模式下，还会把该任务的主契约一起带出来

## 契约先行模式（`v1.3.0`，命令名：`contractfirst`）

```bash
seshflow init contractfirst
seshflow contracts import .seshflow/contracts/contracts.bundle.json
seshflow contracts add .seshflow/contracts/contract.user-service.create-user.json
seshflow contracts add .seshflow/contracts/contract.board-service.move-card.json
seshflow validate .seshflow/plans/api-planning.md
seshflow import .seshflow/plans/api-planning.md --update
seshflow contracts check
```

一旦工作开始依赖 API、RPC 或消息协议作为多任务、多 Agent 之间的共同约束，就应该立即切换到这条模式。

如果是已有 workspace，不需要重建，直接迁移即可：

```bash
seshflow mode set contractfirst
```

这样会保留现有任务和 runtime 状态，只把 workspace 切换到契约先行运作方式。

当前可接受的模式名：

- `apifirst`
- `contractfirst`
- `contract-first`

这条模式不只适用于传统前后端编码。只要多个任务或多个 Agent 需要先围绕声明好的契约协作，就应该使用它。

当前 contract 编写规则：

- 小型 workspace 仍然适合一份 contract 一个 JSON 文件
- 批量初始化时可以用 `seshflow contracts import <file>`
- 支持的导入格式：
  - JSON object
  - JSON array
  - JSONL
- 自定义 contract 数据请放进 `metadata` 或 `extensions`，不要随意占用顶层核心字段

契约关联到底由什么决定：

1. 契约真相文件在 `.seshflow/contracts/<contractId>.json`
2. 契约先行的规划文件通常是 `.seshflow/plans/api-planning.md`
3. 任务和契约的关联来自：
   - 托管 Markdown 里的 `## Contract: <contractId>` 分组
   - Markdown 任务上的 `[contracts:<contractId>]` 元数据
   - 任务对象里的 `contractIds`、`contractRole`、`boundFiles`
4. `ncfr`、`next`、`show` 就是根据这些绑定信息决定当前应该先把哪个 contract 暴露给 AI

## 任务规划流程

单条任务可以直接添加：

```bash
seshflow add "实现 runtime event 保留策略" --priority P1
```

批量规划和反复修订建议走 Markdown 流程：

```bash
seshflow validate tasks.md
seshflow import tasks.md
seshflow import tasks.md --update
```

受控 Markdown 是规划层，`.seshflow/tasks.json` 是执行层状态存储。

对人来说，记住这条规则就够了：

- 零散任务用 `add`
- 大计划和反复修订用 Markdown
- runtime 状态留在 Seshflow，不要散落到自由文本笔记里

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

给人直接阅读时的常用写法：

```bash
seshflow list --pretty
seshflow show <taskId> --pretty
seshflow stats --compact
```

## Web 控制面

Web 包目前是基于同一工作区数据的轻量只读运行面板，用来查看当前焦点、任务摘要、运行记录、进程摘要和近期 runtime event。真正的状态变更仍以 CLI 为主，直到后续 API 模式扩展完成。

## 边界

Seshflow 只负责到“开发内核”这一层为止：

- 任务、依赖、runtime 上下文、契约、hooks、modes
- 基于同一套领域规则暴露 CLI / Web / RPC 接口

Seshflow 不会扩展成完整的 Agent 产品。后续 Agent 项目中的模型路由、长循环自治、prompt 策略、跨工具编排等能力，应该通过 Seshflow 预留的 RPC/API/hooks 接入，而不是继续塞进 Seshflow 核心。

关于包的消费方式和范围判断，请直接参照 `docs/best-practices.zh-CN.md`。

## 输出模式

- 默认：给 AI 和工具用的结构化 JSON
- `--compact`：低噪音文本
- `--pretty`：给人读的文本
- `--no-json`：显式切回文本模式

默认规则：

- 面向 AI 的命令默认输出 `json`
- 每次可用 `--pretty`、`--compact` 或 `--no-json` 覆盖
- 也可通过 `SESHFLOW_OUTPUT=json|compact|pretty` 统一覆盖

## Skills

- `docs/CLI.md`
- `docs/CLI.zh-CN.md`
- `docs/skills/seshflow-light/SKILL.md`
- `docs/skills/INSTALL.md`

Skill 的建议路径也遵循同一条规则：

- 普通任务先用 `seshflow init`
- 一旦引入 API / RPC / 消息契约协同，就立即使用 `seshflow init contractfirst` 或 `seshflow mode set contractfirst`

当前稳定的便利别名：

- `seshflow contract ...` 等价于 `seshflow contracts ...`
- `seshflow workspace ...` 等价于 `seshflow workspaces ...`
- `seshflow proc ...` 等价于 `seshflow process ...`
- `seshflow pause` 等价于 `seshflow suspend`
- `seshflow rm <taskId>` 等价于 `seshflow delete <taskId>`

## 许可证

MIT

---
