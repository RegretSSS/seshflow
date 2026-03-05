# Seshflow 产品改进任务列表

## 🎯 核心改进目标

基于用户反馈，将 Seshflow 打造成真正的 **AI-Native** 任务管理工具：
1. 批量导入任务（Markdown 模板）
2. AI 友好的命令引导
3. 命令简短无歧义
4. 集成 TreecheckMCP 思想

---

## 📋 Phase 1: 批量任务导入（Markdown 模板）

### 任务 1.1: 设计 Markdown 任务模板格式
**优先级**: P0
**预估**: 2h
**标签**: design,markdown,ai-friendly

**目标**: 设计简洁的 Markdown 任务格式，让 AI 容易理解和生成

**要求**:
- 格式简洁，符合 Markdown 语法
- 支持任务属性（标题、优先级、标签、工时）
- 支持依赖关系（行号或引用）
- 支持 Checklist 格式（- [ ]）
- 支持描述（多行文本）

**示例格式**:
```markdown
# 项目任务规划

## Phase 1: 基础功能

- [ ] 设计数据库架构 [P0] [database,design] [4h]
  设计用户、文章、评论表结构

- [ ] 实现 RESTful API [P1] [api,backend] [8h] [依赖:1]
  实现 CRUD 接口
  使用 Express + TypeScript

## Phase 2: 前端开发

- [ ] 开发登录页面 [P2] [frontend,react] [6h]
  使用 React + Tailwind CSS
```

**交付物**:
- [ ] Markdown 格式规范文档
- [ ] 示例模板文件
- [ ] 解析规则说明

---

### 任务 1.2: 实现 init 时生成模板
**优先级**: P0
**预估**: 3h
**标签**: feature,init,template

**目标**: seshflow init 时自动生成任务模板

**要求**:
- 在 `.seshflow/` 目录创建 `TASKS.template.md`
- 包含完整的格式说明和示例
- 支持自定义模板路径

**命令**:
```bash
seshflow init [--template <path>]
```

**交付物**:
- [ ] 修改 init 命令
- [ ] 创建默认模板内容
- [ ] 添加模板生成逻辑

---

### 任务 1.3: 实现 import 命令
**优先级**: P0
**预估**: 6h
**标签**: feature,import,parser

**目标**: 从 Markdown 文件批量导入任务

**功能**:
- 解析 Markdown 任务文件
- 提取任务属性（标题、优先级、标签、工时、依赖）
- 批量创建任务
- 验证依赖关系
- 错误提示

**命令**:
```bash
seshflow import <file.md>
seshflow import .seshflow/TASKS.md
```

**错误处理**:
- 格式错误：显示行号和原因
- 循环依赖：检测并提示
- 无效引用：任务不存在

**交付物**:
- [ ] Markdown 解析器
- [ ] import 命令实现
- [ ] 依赖关系解析
- [ ] 错误处理
- [ ] 单元测试

---

### 任务 1.4: 实现 export 命令
**优先级**: P1
**预估**: 3h
**标签**: feature,export

**目标**: 将现有任务导出为 Markdown

**功能**:
- 导出所有任务为 Markdown 格式
- 保持层级结构（按 Phase 或 Status 分组）
- 包含所有任务属性

**命令**:
```bash
seshflow export [output.md]
seshflow export .seshflow/TASKS.md
```

**交付物**:
- [ ] export 命令实现
- [ ] Markdown 格式化逻辑
- [ ] 测试

---

## 🤖 Phase 2: AI 友好的命令引导

### 任务 2.1: 重新设计命令输出格式
**优先级**: P0
**预估**: 4h
**标签**: ux,ai-friendly,refactor

**目标**: 每个命令输出清晰的 AI 引导文字

**原则**:
- **简短**: 每个输出最多 3 行关键信息
- **无歧义**: 明确告诉 AI 下一步做什么
- **可操作**: 提供具体命令示例
- **上下文**: 提供 AI 需要的技术信息

**新输出格式示例**:

```bash
$ seshflow init
✓ Seshflow workspace initialized

📝 下一步：
1. 编辑 .seshflow/TASKS.md 规划任务
2. 运行: seshflow import .seshflow/TASKS.md
3. 运行: seshflow next 开始工作

💡 提示：AI 可以直接修改 TASKS.md 批量导入任务
```

```bash
$ seshflow next
┌─ 设计数据库架构 [P0]
├─────────────────────────
│ 📋 任务：设计用户、文章、评论表结构
│ 🔧 技术栈：PostgreSQL + Prisma
│ 📁 相关文件：src/models/
│ ⏱️ 预估：4h

🎯 AI 需要做：
1. 设计表结构（用户、文章、评论）
2. 定义 Prisma schema
3. 创建迁移文件
4. 测试：seshflow done --hours 4
```

**交付物**:
- [ ] 重新设计所有命令输出
- [ ] 添加 AI 引导模块
- [ ] 更新文档

---

### 任务 2.2: 优化命令参数
**优先级**: P1
**预估**: 3h
**标签**: ux,refactor,cli

**目标**: 简化命令，减少认知负担

**改进**:
- 短参数（单字母）
- 智能默认值
- 自动推断
- 交互式提示

**示例**:
```bash
# 之前
seshflow add "任务" --desc "描述" --priority P0 --tags tag1,tag2 --estimate 4

# 之后
seshflow add "任务"  # 自动进入交互模式
# 或
seshflow a "任务" -p P0 -t tag1,tag2 -e 4  # 简写
```

**交付物**:
- [ ] 重构命令参数
- [ ] 添加命令别名
- [ ] 交互模式优化

---

## 🌳 Phase 3: 集成 TreecheckMCP 思想

### 任务 3.1: 实现项目结构规划功能
**优先级**: P1
**预估**: 8h
**标签**: feature,tree,structure

**目标**: 让 AI 可以规划项目文件结构，并检查符合性

**功能**:
1. **plan 命令**: 创建文件结构规划
2. **check 命令**: 检查实际文件与规划的符合性
3. **集成任务**: 文件创建与任务关联

**命令**:
```bash
# 规划结构
seshflow plan .seshflow/STRUCTURE.md

# 检查符合性
seshflow check

# 更新规划
seshflow plan --update .seshflow/STRUCTURE.md
```

**STRUCTURE.md 格式**:
```markdown
# 项目文件结构规划

src/
  models/
    User.ts - 用户模型
    Post.ts - 文章模型
  routes/
    users.ts - 用户路由
    posts.ts - 文章路由
  index.ts - 主入口

tests/
  unit/
  integration/

README.md
package.json
```

**输出示例**:
```bash
$ seshflow check
✓ 结构符合性检查

✅ 已完成 (5/8):
  ✓ src/models/User.ts
  ✓ src/models/Post.ts
  ✓ src/routes/users.ts
  ✓ src/index.ts
  ✓ package.json

⏳ 进行中 (1/8):
  ○ src/routes/posts.ts

❌ 未开始 (2/8):
  ✗ tests/unit/
  ✗ tests/integration/

📝 建议：创建 tests 目录结构
```

**交付物**:
- [ ] plan 命令实现
- [ ] check 命令实现
- [ ] Markdown 结构解析器
- [ ] 文件系统扫描器
- [ ] 差异对比算法

---

### 任务 3.2: 任务与文件关联
**优先级**: P1
**预估**: 4h
**标签**: feature,integration

**目标**: 任务自动关联相关文件

**功能**:
- 从结构规划推断相关文件
- 任务完成时检查文件存在
- 自动更新 context.relatedFiles

**实现**:
```javascript
// 任务创建时自动关联
createTask({
  title: "实现用户模型",
  relatedFiles: checkStructure("src/models/User.ts")
})

// 任务完成时验证
completeTask(taskId) {
  const files = task.context.relatedFiles;
  const missing = files.filter(f => !exists(f));
  if (missing.length > 0) {
    warn(`任务未完成，缺少文件：${missing.join(", ")}`);
  }
}
```

**交付物**:
- [ ] 文件关联逻辑
- [ ] 完成验证
- [ ] 更新 TaskManager

---

## 🎨 Phase 4: 用户体验优化

### 任务 4.1: 添加进度可视化
**优先级**: P2
**预估**: 3h
**标签**: feature,ux,visualization

**目标**: 显示项目整体进度

**命令**:
```bash
seshflow status
```

**输出**:
```
📊 项目进度

Phase 1: 基础功能 [████████░░] 80% (8/10)
  ✅ 设计数据库架构
  ✅ 实现 RESTful API
  ⏳ 开发登录页面
  ...

Phase 2: 前端开发 [███░░░░░░░] 30% (3/10)
  ...

总体进度: [█████░░░░░] 50% (11/22)
```

**交付物**:
- [ ] status 命令
- [ ] 进度计算逻辑
- [ ] 可视化输出

---

### 任务 4.2: 添加交互式 TUI
**优先级**: P2
**预估**: 10h
**标签**: feature,tui,interactive

**目标**: 终端内交互式任务管理

**功能**:
- 键盘导航
- 任务列表浏览
- 快捷操作
- 实时更新

**依赖**:
- blessed 或 ink (React TUI)

**交付物**:
- [ ] TUI 界面设计
- [ ] 交互逻辑
- [ ] 快捷键绑定

---

## 📚 Phase 5: 文档和测试

### 任务 5.1: 更新所有文档
**优先级**: P1
**预估**: 4h
**标签**: docs

**目标**: 文档反映所有新功能

**更新内容**:
- README.md
- QUICKSTART.md
- 新功能使用指南
- AI 使用最佳实践

**交付物**:
- [ ] 更新所有文档
- [ ] 添加示例
- [ ] 录制使用演示

---

### 任务 5.2: 编写完整测试
**优先级**: P1
**预估**: 6h
**标签**: test

**目标**: 所有新功能有测试覆盖

**测试内容**:
- import/export 命令
- Markdown 解析
- 结构检查
- 文件关联

**交付物**:
- [ ] 单元测试
- [ ] 集成测试
- [ ] 测试覆盖率 > 80%

---

## 🚀 总结

### 优先级排序
**立即开始 (P0)**:
1. 任务 1.1 - 设计 Markdown 格式
2. 任务 1.2 - init 生成模板
3. 任务 1.3 - import 命令
4. 任务 2.1 - AI 友好输出

**第二阶段 (P1)**:
5. 任务 1.4 - export 命令
6. 任务 2.2 - 优化命令参数
7. 任务 3.1 - 项目结构规划
8. 任务 3.2 - 文件关联
9. 任务 5.1 - 更新文档
10. 任务 5.2 - 编写测试

**后续优化 (P2)**:
11. 任务 4.1 - 进度可视化
12. 任务 4.2 - 交互式 TUI

### 总工作量
- P0: 15 小时
- P1: 29 小时
- P2: 13 小时
- **总计**: 57 小时

### 下一步行动
1. 将此任务列表导入 Seshflow
2. 开始第一个任务：设计 Markdown 格式
3. 完成后：seshflow done --hours 2
4. 继续：seshflow next

---

**创建时间**: 2026-03-05
**项目**: Seshflow 产品改进
**状态**: 待开始
