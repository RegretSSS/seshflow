# 项目任务模板

> 复制这份模板并重命名为 `PROJECT_TASKS.md`
> 然后执行 `seshflow import PROJECT_TASKS.md`

---

## 快速开始

### 最简任务列表示例

```markdown
# 我的任务

- [ ] 任务 1
- [ ] 任务 2
- [ ] 任务 3
```

### 带属性的任务列表示例

```markdown
# 项目开发
## Phase 1: 基础功能

- [ ] 设计数据库 [P0] [database] [4h]
- [ ] 实现 API [P1] [api] [6h]
- [ ] 编写测试 [P2] [testing] [3h]

## Phase 2: 前端开发
- [ ] 设计 UI [P1] [ui] [4h]
- [ ] 实现组件 [P1] [frontend] [6h]
```

---

## 完整示例

```markdown
# 电商网站开发
## Phase 1: 基础设施

- [ ] 搭建项目脚手架 [P0] [setup] [2h]
  - [x] 初始化 Next.js 项目 [1h]
  - [x] 配置 TypeScript [0.5h]
  - [ ] 配置 Tailwind CSS [0.5h]
> 使用 Next.js 14 + TypeScript + Tailwind CSS

- [ ] 设计数据库 Schema [P0] [database,design] [4h]
  - [ ] 用户表设计 [1h]
  - [ ] 商品表设计 [1h]
  - [ ] 订单表设计 [1h]
  - [ ] 关系设计 [1h]

## Phase 2: 后端开发
- [ ] 实现用户认证 [P0] [auth,backend] [12h] [依赖:设计数据库 Schema]
  - [x] 用户注册接口 [3h]
  - [ ] 用户登录接口 [3h]
  - [ ] JWT 认证中间件 [2h]
  - [ ] 密码重置功能 [2h]
  - [ ] 单元测试 [2h]
```

---

## 语法说明

```markdown
- [ ] 任务标题 [P0] [tag1,tag2] [4h] [@负责人] [依赖:任务 A,任务 B]
  - [ ] 子任务 A [1h]
  - [ ] 子任务 B [2h]
> 可选的任务描述
```

### 优先级
- `[P0]` 紧急
- `[P1]` 高
- `[P2]` 中
- `[P3]` 低

### 常用标签
- `[auth]`
- `[database]`
- `[api]`
- `[frontend]`
- `[backend]`
- `[testing]`
- `[docs]`

---

## 导入流程

```bash
seshflow import PROJECT_TASKS.md
seshflow next
seshflow list --all
```

---

模板版本: 1.1.1
最后更新: 2026-03-09
