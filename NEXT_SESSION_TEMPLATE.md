# 🚀 新会话启动模板（含改进任务）

## 复制以下内容给 AI 即可恢复开发：

---

```
我正在开发 Seshflow 项目，请帮我继续。

项目位置：D:\000-自制软件\seshflow

当前状态：
- ✅ Phase 1 MVP 已完成（CLI 核心命令）
- ⏳ 正在进行：产品改进（基于用户反馈）

第一步：查看当前任务
cd "D:\000-自制软件\seshflow" && node packages/cli/bin/seshflow.js next

第二步：根据输出继续开发
- 阅读 IMPROVEMENT_TASKS.md 了解完整改进计划
- 按照 Coding → Test → GitCommit 流程完成
- 使用 seshflow done 完成任务

改进方向：
1. 批量任务导入（Markdown 模板）
2. AI 友好的命令引导
3. TreecheckMCP 思想集成
4. 项目结构规划功能

关键文档：
- IMPROVEMENT_TASKS.md - 完整改进计划（57小时）
- .seshflow/TASKS.template.md - 任务模板示例
- SESSION_RECOVERY.md - 详细恢复指南
- docs.md - 完整技术规划

技术栈：
- CLI: Node.js + Commander.js
- Web: React 18 + Vite + TypeScript
- TreecheckMCP: D:\Users\1\Documents\Cline\MCP\treecheck-mcp
```

---

## 📊 当前改进任务列表

### P0 - 立即开始（共 15 小时）

1. **设计 Markdown 任务模板格式** (2h)
   - 设计简洁的 AI 友好格式
   - 支持任务属性：标题、优先级、标签、工时
   - 支持依赖关系

2. **实现 init 时生成任务模板** (3h)
   - init 时自动生成 `.seshflow/TASKS.template.md`
   - 包含格式说明和示例

3. **实现 import 命令批量导入** (6h)
   - 解析 Markdown 任务文件
   - 批量创建任务
   - 验证依赖关系

4. **重新设计命令输出（AI 友好）** (4h)
   - 简短、无歧义的引导文字
   - 明确的下一步操作

### P1 - 第二阶段（共 29 小时）

5. **实现 export 命令导出任务** (3h)
6. **优化命令参数** (3h)
7. **实现项目结构规划功能** (8h)
8. **任务与文件关联** (4h)
9. **更新所有文档** (4h)
10. **编写完整测试** (6h)

### P2 - 后续优化（共 13 小时）

11. **添加进度可视化** (3h)
12. **添加交互式 TUI** (10h)

---

## 🎯 快速命令

```bash
# 进入项目
cd "D:\000-自制软件\seshflow"

# 查看下一个改进任务
node packages/cli/bin/seshflow.js next

# 完成任务
node packages/cli/bin/seshflow.js done --hours 2 --note "完成备注"

# 查看所有任务
cat .seshflow/tasks.json | python -m json.tool

# 查看改进计划
cat IMPROVEMENT_TASKS.md
```

---

## 📁 项目结构

```
seshflow/
├── packages/cli/          # CLI 核心包 ✅
│   ├── src/commands/      # 命令实现
│   ├── src/core/          # 核心逻辑
│   └── src/utils/         # 工具函数
├── packages/web/          # Web 界面（待开发）
├── packages/shared/       # 共享类型 ✅
├── .seshflow/             # Seshflow 数据
│   ├── tasks.json         # 任务列表 ✅
│   ├── TASKS.template.md  # 任务模板 🆕
│   └── config.yaml        # 配置
├── IMPROVEMENT_TASKS.md   # 改进计划 🆕
├── SESSION_RECOVERY.md    # 恢复指南
└── docs.md                # 技术规划
```

---

## 🔗 相关资源

### TreecheckMCP 集成
位置：`D:\Users\1\Documents\Cline\MCP\treecheck-mcp`

核心思想：
- 文件树状结构规划
- 符合性检查
- 增量更新
- Markdown 格式

### 需要集成的功能
1. `plan` 命令 - 规划文件结构
2. `check` 命令 - 检查符合性
3. 任务与文件自动关联

---

## 💡 改进目标

### 当前问题
1. ❌ 没有批量导入任务的功能
2. ❌ 命令输出不够 AI 友好
3. ❌ 缺少项目结构管理
4. ❌ 任务与文件没有关联

### 改进后
1. ✅ AI 可以批量导入任务（Markdown）
2. ✅ 每个命令都有清晰的 AI 引导
3. ✅ 集成 TreecheckMCP 的结构管理
4. ✅ 任务自动关联相关文件

---

**重要提示**：
- 所有改进任务已添加到 Seshflow
- 运行 `seshflow next` 查看下一个任务
- 详细计划见 `IMPROVEMENT_TASKS.md`
- 预计总工作量：57 小时

---

**创建时间**: 2026-03-05
**项目**: Seshflow 产品改进
**状态**: 改进任务已规划，待执行
