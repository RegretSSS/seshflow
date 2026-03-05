# Seshflow ✨

> 跨对话任务序列器 - 专为 AI 辅助开发设计的任务管理工具

[![npm version](https://badge.fury.io/js/seshflow.svg)](https://www.npmjs.com/package/seshflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

## 🎯 核心价值

- **🔄 跨对话记忆** - 每次新对话 `seshflow ncfr` 立即恢复工作上下文
- **📋 Markdown 导入** - AI 友好的批量任务导入格式
- **⚡ 魔法命令** - 逐步披露的 Skill 系统，提升工作效率
- **🌐 跨平台支持** - Windows / WSL / macOS / Linux
- **🔗 Git 集成** - 自动关联任务与 Git 提交

## 📦 快速安装

### 使用 npm

```bash
npm install -g seshflow
```

### 使用 pnpm（推荐）

```bash
pnpm install -g seshflow
```

### 使用 yarn

```bash
yarn global add seshflow
```

## 🚀 快速开始

Legacy package name is still available: `@seshflow/cli`

### 1. 初始化项目

```bash
seshflow init
```

这将创建 `.seshflow` 目录，包含任务数据和配置文件。

### 2. 创建任务（两种方式）

#### 方式一：使用 Magic 命令快速开始

```bash
seshflow magic quickstart
```

#### 方式二：手动创建

创建 `tasks.md` 文件：

```markdown
# 我的项目

## 第一阶段

- [ ] 设计数据库结构 [P0] [backend] [4h]
  > 设计用户表和文章表的schema

- [ ] 实现 API 接口 [P0] [backend] [8h]
  > RESTful API 设计与实现

- [ ] 编写前端页面 [P1] [frontend] [6h]
  > React 组件开发
```

然后导入：

```bash
seshflow import tasks.md
```

### 3. 开始工作

```bash
# 查看下一个任务
seshflow next

# 查看任务详情
seshflow show <task-id>

# 完成任务
seshflow done --hours 2 --note "完成核心功能"
```

## ✨ Magic 命令（Skill 系统）

Magic 命令是预定义的工作流，提供逐步披露的高级功能。

### 查看所有 Magic 命令

```bash
seshflow magic --list
```

### 可用 Skills

#### 🔄 Workflows（工作流）

- **quickstart** - 快速开始
- **sync** - 同步上下文
- **checkpoint** - 检查点

#### 🔍 Filters（筛选）

- **focus** - 专注模式（P0任务）

#### ⚡ Advanced（高级）

- **batch-done** - 批量完成子任务
- **prioritize** - 优先级重排

#### 🔓 Expert（专家）

- **audit** - 任务健康审计

## 📝 Markdown 任务格式

```markdown
- [ ] 任务标题 [P0] [tag1,tag2] [8h]
  > 任务描述（可选）
```

## 🌐 跨平台使用

### Windows / WSL / macOS / Linux

```bash
seshflow init
seshflow magic quickstart
```

## 📚 许可证

MIT License

## 🔗 相关链接

- [npm 包](https://www.npmjs.com/package/seshflow)
- [GitHub 仓库](https://github.com/RegretSSS/seshflow)

---

**Made with ❤️ for AI-assisted development**
