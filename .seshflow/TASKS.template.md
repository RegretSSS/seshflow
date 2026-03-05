# 项目任务规划模板

## 使用说明

这是 Seshflow 的任务规划模板。AI 可以编辑此文件来批量创建任务。

## 格式规则

### 基本语法
```markdown
## 阶段名称

- [ ] 任务标题 [优先级] [标签] [预估工时]
  任务描述（可选，支持多行）
  技术细节、注意事项等
```

### 优先级
- `P0` - 最高优先级
- `P1` - 高优先级
- `P2` - 中等优先级
- `P3` - 低优先级

### 依赖关系
使用 `[依赖:任务ID]` 或 `[依赖:行号]` 标记依赖

### 标签
使用 `[tag1,tag2,tag3]` 格式，多个标签用逗号分隔

### 工时
使用 `[4h]` 或 `[30m]` 格式

---

## 示例任务列表

### Phase 1: 项目初始化

- [ ] 设计数据库架构 [P0] [database,design] [4h]
  设计用户、文章、评论表结构
  使用 PostgreSQL + Prisma

- [ ] 初始化项目结构 [P0] [setup,init] [2h]
  创建目录结构
  配置 TypeScript
  安装依赖包

- [ ] 实现 RESTful API [P1] [api,backend] [8h] [依赖:1]
  实现 CRUD 接口
  使用 Express + TypeScript
  添加 JWT 认证

### Phase 2: 前端开发

- [ ] 开发登录页面 [P2] [frontend,react] [6h]
  使用 React + Tailwind CSS
  实现表单验证

- [ ] 实现用户仪表盘 [P2] [frontend,dashboard] [10h] [依赖:4]
  显示用户信息
  展示文章列表
  添加搜索功能

---

## 导入任务

完成编辑后，运行以下命令导入：

```bash
seshflow import .seshflow/TASKS.md
```

## 导出任务

查看当前任务并导出：

```bash
seshflow export .seshflow/TASKS.md
```

## 提示

- 使用 Checklist 格式（- [ ]）标记未完成任务
- 使用 `- [x]` 标记已完成任务（导入时自动完成）
- 描述支持多行文本，缩进对齐
- 依赖关系会自动验证，循环依赖会报错
- 空行和注释会被忽略

---

**最后更新**: 2026-03-05
**项目**: Seshflow
