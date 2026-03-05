# Markdown 任务导入指南

## 快速开始

### 1. 创建任务文件

复制模板文件或创建新的 `.md` 文件：

```bash
cp TASKS.template.md my-project-tasks.md
```

### 2. 编辑任务列表

使用你喜欢的编辑器编辑任务文件：

```markdown
# 我的项目

## 第一步
- [ ] 任务1 [P0] [tag] [2h]
- [ ] 任务2 [P1] [tag] [3h]
```

### 3. 导入任务

```bash
seshflow import my-project-tasks.md
```

就这么简单！

---

## 语法速查

| 语法 | 说明 | 示例 |
|------|------|------|
| `- [ ]` | 待办任务 | `- [ ] 我的任务` |
| `- [x]` | 已完成任务 | `- [x] 已完成` |
| `[P0]` | 优先级（P0-P3） | `[P0]`, `[P1]`, `[P2]`, `[P3]` |
| `[tag]` | 标签 | `[auth]`, `[database]` |
| `[4h]` | 工时 | `[2h]`, `[0.5h]`, `[1d]` |
| `[依赖:1]` | 依赖关系 | `[依赖:1]`, `[依赖:task-id]` |
| `##` | 分组标题 | `## Phase 1` |

---

## 完整示例

```markdown
# 项目开发

## 后端
- [ ] 设计数据库 [P0] [database] [4h]
- [ ] 实现 API [P1] [api] [6h] [依赖:1]

## 前端
- [ ] 设计 UI [P1] [ui] [4h]
- [ ] 实现页面 [P1] [frontend] [6h]
```

---

## 常见用法

### 简单任务列表

```markdown
# 我的任务

- [ ] 买菜
- [ ] 做饭
- [ ] 洗碗
```

### 带优先级的任务

```markdown
# 重要任务

- [ ] 紧急修复 Bug [P0]
- [ ] 添加新功能 [P1]
- [ ] 优化代码 [P2]
```

### 带工时的任务

```markdown
# 开发任务

- [ ] 需求分析 [2h]
- [ ] 设计方案 [4h]
- [ ] 编码实现 [8h]
- [ ] 测试验证 [2h]
```

### 带标签的任务

```markdown
# 全栈开发

- [ ] 后端 API [backend,api]
- [ ] 前端页面 [frontend,ui]
- [ ] 数据库设计 [database]
```

### 完整任务

```markdown
# 完整示例

- [ ] 实现用户认证 [P0] [auth,security] [6h] [@张三]
> 实现 JWT 认证系统
> 包括登录、注册、密码重置
  - [x] 设计数据库表
  - [ ] 实现登录接口
  - [ ] 实现注册接口
```

---

## AI 生成任务

你可以让 AI 帮你生成任务列表：

### 提示词示例

```
请帮我生成一个电商网站的任务列表，
使用 Markdown 格式，包含：
- 后端开发（Node.js）
- 前端开发（React）
- 数据库设计（PostgreSQL）
- 测试和部署
```

AI 会生成符合格式的任务列表，你可以直接导入！

---

## 导入选项

```bash
# 基本导入
seshflow import tasks.md

# 指定工作区
seshflow import tasks.md --workspace my-project

# 预览导入（不实际创建）
seshflow import tasks.md --dry-run

# 覆盖已有任务
seshflow import tasks.md --force
```

---

## 查看导入的任务

```bash
# 查看下一个任务
seshflow next

# 查看所有任务
seshflow list

# 查看任务详情
seshflow show <task-id>

# 查看任务树
seshflow tree
```

---

## 提示和技巧

1. **使用分组**：用 `##` 标题组织任务
2. **合理预估**：工时预估要准确
3. **明确优先级**：P0 优先处理
4. **添加标签**：便于筛选和查找
5. **设置依赖**：确保任务顺序正确
6. **分解任务**：大任务拆成小任务
7. **添加描述**：提供更多上下文

---

## 格式验证

导入前验证格式：

```bash
# 验证格式（不导入）
seshflow validate tasks.md
```

常见错误：
- ❌ 任务行不以 `- [` 开头
- ❌ 优先级不是 P0-P3
- ❌ 工时格式错误（应该是 `4h` 不是 `4`）
- ❌ 依赖引用不存在的任务

---

## 导出示例

```bash
# 导出所有任务为 Markdown
seshflow export exported-tasks.md

# 导出特定状态的任务
seshflow export --status todo exported-tasks.md

# 导出特定优先级的任务
seshflow export --priority P0 exported-tasks.md
```

---

## 完整工作流

```bash
# 1. 初始化项目
seshflow init

# 2. 创建任务文件
cp TASKS.template.md my-tasks.md

# 3. 编辑任务（使用 AI 或手动编辑）
vim my-tasks.md

# 4. 导入任务
seshflow import my-tasks.md

# 5. 开始工作
seshflow next

# 6. 完成任务
seshflow done --hours 4 --note "完成认证系统"

# 7. 继续下一个
seshflow next
```

---

## 相关文档

- [完整语法规范](TASKS_TEMPLATE_SPEC.md)
- [任务模板示例](TASKS.template.md)
- [项目技术文档](docs.md)

---

**版本**: 1.0.0
**更新**: 2026-03-05
