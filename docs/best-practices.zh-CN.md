# Seshflow 最佳实践

这份文档是 Seshflow 的“包消费 + 边界硬化”指南。

它用于回答这些问题：

- 一个功能到底该不该进 Seshflow
- Agent 项目应该怎样消费 Seshflow
- 怎样扩展 Seshflow 而不把它做成通用 workflow engine

## 1. 把 Seshflow 当成开发内核

Seshflow 应保持为开发内核，而不是完整 Agent 产品。

适合放进 Seshflow 的内容：

- 任务生命周期和依赖状态
- 契约先行的规划与任务绑定
- runtime 记录、process 记录、恢复状态
- hook seams、mode profile、RPC shell payload
- 面向 AI 恢复的紧凑上下文面

不适合放进 Seshflow 的内容：

- model routing 和模型选择策略
- prompt orchestration 与会话记忆策略
- autonomous agent loop 管理
- 大而泛的跨工具编排逻辑
- 以聊天 UI 为核心的产品层能力

## 2. 通过稳定接缝使用 Seshflow

Agent 侧代码应通过这些显式接缝来消费 Seshflow：

- 面向终端/AI 的 CLI JSON 输出
- `rpc shell` 给出的稳定机器可读 workspace/task/contract 上下文
- hook seams
- 持久化 runtime events

不要依赖：

- 未文档化的文件布局
- JSON 字段出现的隐式顺序
- 人类可读文本输出的临时解析
- 源码注释作为协议真相

## 3. 契约真相优先于仓库猜测

在 `apifirst` 工作区里：

- 先定义 API/RPC contract
- 显式把任务和文件绑定到 contract
- 用 `ncfr`、`next`、`show`、`rpc shell` 恢复协议真相
- 用 drift reminder，而不是让 AI 从代码里重新猜

不要把下面这些当成比 contract object 更强的真相：

- 函数名
- 路由文件名
- 零散 markdown 备注
- 旧聊天历史

## 4. 保持上下文紧凑且有顺序

Seshflow 默认输出应追求：

- 最小默认上下文
- section 主次显式
- 稳定 JSON 契约
- 默认压掉空值或低价值 section

每次想加新字段时，先问：

1. 它是 primary、secondary，还是 supplemental？
2. 它应该每次都出现，还是只在 `--full`/特殊 surface 才出现？
3. 它是在减少 AI 猜测，还是只是在增加文本？

如果一个字段不能明显减少歧义或恢复成本，它就不应进入默认路径。

## 5. mode 组合必须有限

Seshflow 的 mode 是 profile-based，不是自由 DSL。

允许：

- 少量经过校验的 preset mode
- 少数显式字段的 bounded override
- 通过 `mode show` 和 `rpc shell` 输出 capability summary

不允许：

- 任意用户自定义 mode 逻辑
- 具有隐藏持久化语义的行为开关
- CLI、Web、RPC 各自一套 mode 语义

## 6. hook 语义必须显式

Hooks 应保持：

- 串行
- schema-based
- payload 紧凑
- 明确给出 `family`、`surface`、`phase`、`trigger`、`resultKind`

当前 `resultKind` 的语义：

- `guard`：状态变更前的阻塞守卫
- `advisory`：提醒/警告性质的结果
- `enrichment`：不承担守卫职责的补充型成功结果

不要让 hooks 演化成：

- 无边界插件运行时
- 隐藏的业务真相来源
- Agent policy 的后门

## 7. 用一个简单标准判断范围

一个功能大概率属于 Seshflow，当且仅当：

1. 它增强了 task、contract、runtime、hook、mode 或 recovery 真相
2. 它对任何 Seshflow 包消费者都有价值，而不是只服务某个未来 Agent 应用
3. 它可以通过稳定接缝暴露，而不把 app-specific policy 塞进内核

一个功能大概率不属于 Seshflow，只要满足任意一条：

1. 它主要服务 conversation control 或 prompt shaping
2. 它主要服务 model behavior 或 routing
3. 它主要服务 autonomous planning/execution policy
4. 它只对某个具体 Agent UI/应用有帮助，对包级内核没有普遍价值

## 8. 推荐接入方式

对于包使用者：

1. 用 `seshflow init` 或 `seshflow init apifirst` 建立明确 workspace 结构
2. 自动化默认用 JSON-first 输出
3. 稳定机器接入优先用 `rpc shell`
4. 外部策略通过 hook seams 和 runtime events 接入
5. Agent-specific 逻辑留在 Seshflow 仓库外，除非这次修改是在加强公共接缝

## 9. 反模式

避免这些做法：

- 因为只对一个私有工作流有帮助，就把功能塞进主线
- 把 Agent runtime policy 塞进 hook、mode 逻辑或核心 service
- 因为接缝设计弱，就不断把默认输出做大
- 把 Seshflow 当成通用 workflow engine
- 在文档化 workspace/runtime store 之外偷偷创造状态

## 10. 相关文档

- `docs/development.md`
- `docs/development-backlog.md`
- `docs/apifirst-mode.zh-CN.md`
- `docs/hook-seams.zh-CN.md`
