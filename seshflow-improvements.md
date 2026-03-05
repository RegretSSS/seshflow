# Seshflow 改进任务列表

## Phase 1: JSON输出选项

- [ ] 为next命令添加--json选项 [P0] [backend]
> 实现next命令的JSON输出，返回当前任务的完整结构化数据
> 包括任务ID、标题、状态、优先级、描述、依赖关系等

- [ ] 为ncfr命令添加--json选项 [P0] [backend]
> 实现ncfr命令的JSON输出，返回项目上下文的结构化数据
> 包括项目信息、统计数据、当前任务、依赖关系等

- [ ] 为deps命令添加--json选项 [P1] [backend]
> 实现deps命令的JSON输出，返回依赖关系的结构化数据
> 包括任务、依赖任务、被依赖任务等

## Phase 2: 基础查询功能

- [ ] 实现query命令基础结构 [P0] [backend]
> 创建query命令文件和基础结构
> 支持基本的参数解析和错误处理

- [ ] 实现按优先级查询 [P0] [backend]
> 支持--priority参数查询（P0, P1, P2, P3）
> 返回匹配的任务列表

- [ ] 实现按状态查询 [P1] [backend]
> 支持--status参数查询（done, in-progress, todo, backlog, blocked）
> 返回匹配的任务列表

- [ ] 实现按标签查询 [P1] [backend]
> 支持--tags参数查询（逗号分隔的标签列表）
> 返回包含任一标签的任务

- [ ] 为query命令添加--json选项 [P2] [backend]
> 返回查询结果的结构化JSON数据

## Phase 3: 基础统计功能

- [ ] 实现stats命令 [P0] [backend]
> 创建stats命令文件和基础结构
> 显示任务总数、完成数、进行中数、待办数等基础统计

- [ ] 按优先级统计 [P1] [backend]
> 添加--by-priority选项
> 显示各优先级任务的数量和完成情况

- [ ] 按标签统计 [P2] [backend]
> 添加--by-tags选项
> 显示各标签的任务数量分布

## Phase 4: 改进ncfr输出

- [ ] 增强ncfr项目概览 [P1] [frontend]
> 添加进度百分比显示
> 添加紧急任务列表（P0任务）
> 添加阻塞任务列表

- [ ] 改进ncfr任务详情展示 [P2] [frontend]
> 优化任务信息的展示格式
> 添加更多有用的上下文信息
> 改进可读性
