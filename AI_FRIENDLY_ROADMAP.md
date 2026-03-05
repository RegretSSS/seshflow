# Seshflow AI 友好改进计划

**基于**: `SESHFLOW_TEST_REPORT_COMPLETE.md`
**创建日期**: 2026-03-05
**优先级**: P0 - 紧急改进

---

## 📋 改进概览

根据测试报告，实施三个核心 AI 友好改进：

1. **JSON 输出模式** - 让 AI 能够零误差解析命令输出
2. **增强 ncfr 上下文** - 提供更完整的项目上下文
3. **依赖可视化** - 帮助 AI 理解任务间的关系

---

## 🎯 任务分解

### Phase 1: JSON 输出模式 (4h)

**任务**: 实现 JSON 输出模式（所有命令）

**需要修改的命令**:
- ✅ `seshflow next --json`
- ✅ `seshflow add --json`
- ✅ `seshflow done --json`
- ✅ `seshflow complete --json`
- ✅ `seshflow ncfr --json`
- ✅ `seshflow init --json`

**实现方案**:
1. 创建 `src/utils/json-output.js` 工具函数
2. 为每个命令添加 `--json` 选项
3. 根据 `--json` 标志切换输出格式
4. 确保输出符合 schema

**示例输出**:
```json
{
  "success": true,
  "task": {
    "id": "task_xxx",
    "title": "实现用户认证",
    "priority": "P0",
    "status": "in-progress",
    "estimatedHours": 6,
    "actualHours": 0,
    "tags": ["auth", "backend"]
  },
  "workspace": {
    "path": "/path/to/project",
    "totalTasks": 10,
    "completedTasks": 3
  }
}
```

---

### Phase 2: 增强 ncfr 上下文 (3h)

**任务**: 增强 ncfr 上下文信息

**需要添加的信息**:
- ✅ 任务统计（总数、进行中、已完成、待办）
- ✅ 当前任务详情（ID、标题、预估、已用）
- ✅ 任务描述（如果有）
- ✅ 依赖关系（前置任务、后续任务）
- ✅ 关键文件列表
- ✅ 快速命令（可直接复制）

**实现方案**:
1. 修改 `src/commands/newchatfirstround.js`
2. 添加任务统计逻辑
3. 添加依赖关系查询
4. 格式化输出为 Markdown

---

### Phase 3: 依赖可视化 (5h)

**任务**: 实现依赖可视化命令

**新增命令**: `seshflow deps`

**功能**:
1. 显示单个任务的依赖
2. 显示依赖此任务的其他任务
3. 全局依赖图（Mermaid 格式）
4. JSON 输出（AI 友好）

**示例输出**:
```bash
# 树形显示
$ seshflow deps task_xxx
task_xxx (实现 Board 组件) [P0]
├── ✅ task_aaa (设计数据库) [P0]
└── ⏳ task_bbb (创建脚手架) [P1]

# Mermaid 图
$ seshflow deps --graph
graph TD
    task_aaa[设计数据库] --> task_xxx[Board 组件]
    task_bbb[脚手架] --> task_xxx

# JSON
$ seshflow deps task_xxx --json
{
  "dependencies": [...],
  "dependents": [...]
}
```

---

## 📊 预期收益

### AI 集成改进
- ✅ **零解析错误** - JSON 格式确保准确性
- ✅ **更少对话轮次** - 完整上下文减少询问
- ✅ **更好的理解** - 依赖可视化帮助理解关系

### 用户体验提升
- ✅ **脚本友好** - JSON 可用于自动化脚本
- ✅ **调试便利** - 可查询和分析数据
- ✅ **文档清晰** - 依赖图易于理解

---

## 🚀 实施计划

### 第一步：JSON 输出 (4h)
- 创建工具函数
- 修改所有命令
- 测试 JSON 输出

### 第二步：增强 ncfr (3h)
- 添加统计逻辑
- 添加依赖查询
- 优化输出格式

### 第三步：依赖可视化 (5h)
- 创建 deps 命令
- 实现树形显示
- 实现 Mermaid 图
- 实现 JSON 输出

### 第四步：测试 (2h)
- 端到端测试
- AI 集成测试
- 性能测试

### 第五步：文档 (1h)
- 更新使用文档
- 添加 JSON 示例
- 添加依赖可视化示例

**总计**: 15 小时

---

## ✅ 验收标准

### JSON 输出
- [ ] 所有命令支持 `--json`
- [ ] 输出符合 schema
- [ ] 可用 jq/jmespath 查询
- [ ] AI 能够零误差解析

### 增强 ncfr
- [ ] 显示任务统计
- [ ] 显示当前任务详情
- [ ] 显示依赖关系
- [ ] 显示关键文件

### 依赖可视化
- [ ] `seshflow deps` 命令工作
- [ ] 树形显示正确
- [ ] Mermaid 图正确
- [ ] JSON 输出正确

---

**当前状态**: 📝 **已规划**
**下一步**: 开始 Phase 1 - JSON 输出模式
