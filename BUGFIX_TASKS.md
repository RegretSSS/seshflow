# Seshflow 紧急修复计划

根据测试报告，修复发现的关键问题

## Phase 1: 核心功能修复 (P0)

### 实现 import 命令
- [ ] 创建 packages/cli/src/commands/import.js [P0] [cli,parser] [2h]
> 解析 Markdown 任务文件，批量创建任务
> 支持：优先级、标签、工时、依赖关系
> 验证：Markdown 格式、任务属性、循环依赖

- [ ] 在 bin/seshflow.js 中注册 import 命令 [P0] [cli] [0.5h]
> 添加命令路由和参数定义
> 支持：--file、--dry-run、--force

- [ ] 编写 import 命令单元测试 [P1] [testing] [1h] [依赖:1]
> 测试：正常导入、格式错误、属性缺失、依赖循环

## Phase 2: 参数优化 (P1)

- [ ] 支持 --tag 和 --tags 别名 [P1] [cli,ux] [0.5h]
> 修改 add 命令，同时接受两种参数名
> 更新帮助文档和示例

## Phase 3: 补充基础命令 (P2)

- [ ] 实现 list 命令 [P2] [cli] [1h]
> 显示所有任务列表
> 支持：--status、--priority、--tag 筛选
> 表格化输出

- [ ] 实现 edit 命令 [P2] [cli] [1.5h]
> 编辑任务属性
> 支持：--title、--desc、--priority、--status

- [ ] 实现 delete 命令 [P2] [cli] [1h]
> 删除指定任务
> 支持：--force 强制删除

## Phase 4: 文档更新 (P0)

- [ ] 更新所有文档 [P0] [documentation] [0.5h] [依赖:1]
> 验证 import 命令文档正确性
> 添加实际可用的示例
> 更新快速开始指南

## Phase 5: 集成测试 (P0)

- [ ] 端到端测试 [P0] [testing] [1h] [依赖:1,2,3,4,5]
> 测试完整工作流：init → import → list → next → done
> 测试参数别名：--tag 和 --tags
> 测试错误处理和边界情况

## Phase 6: Git 提交 (P0)

- [ ] 提交修复代码 [P0] [git] [0.5h] [依赖:1,2,3,4,5,6]
> 创建 feature 分支
> 提交所有修复
> 编写清晰的 commit message
> 推送到远程

---

**预估总时间**: 9.5 小时
**优先级**: P0 - 紧急修复
**目标**: 修复测试报告发现的关键问题
