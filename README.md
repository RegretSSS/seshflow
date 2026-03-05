# Seshflow

> 跨对话任务序列器 - 专为 AI 辅助开发设计的轻量级 任务管理工具

## 特性

- 🔄 **跨对话持久化** - 每次新对话立即恢复工作上下文
- 🌳 **依赖关系管理** - 智能任务依赖树，自动排序
- 🎯 **Git 集成** - 提交自动关联任务，完整开发轨迹
- 🎨 **可视化看板** - Trello 风格 Web 界面
- 🔗 **跨平台同步** - Windows/WSL/Linux 任务状态实时同步
- 📝 **Markdown 导入** - AI 友好的批量任务导入格式
- 🤖 **AI 友好** - 专为 AI 辅助开发设计，一键恢复项目上下文

## 快速开始

### 安装

```bash
pnpm add -g seshflow
```

### 初始化项目

```bash
seshflow init
```

### 使用方式

#### 方式 1：单个命令添加

```bash
# 添加单个任务
seshflow add "实现用户认证" --priority P0 --tags auth,backend

# 开始工作
seshflow next

# 完成任务
seshflow done --hours 4 --note "完成认证系统"
```

#### 方式 2：批量导入（推荐）⭐

```bash
# 1. 创建任务文件
cp TASKS.template.md my-tasks.md

# 2. 编辑任务（可使用 AI 生成）
vim my-tasks.md

# 3. 批量导入
seshflow import my-tasks.md

# 4. 开始工作
seshflow next
```

### Markdown 任务格式示例

```markdown
# 项目开发

## 后端开发
- [ ] 设计数据库 [P0] [database] [4h]
- [ ] 实现 API [P1] [api] [6h] [依赖:1]

## 前端开发
- [ ] 设计 UI [P1] [ui] [4h]
- [ ] 实现页面 [P1] [frontend] [6h]
```

### 新会话恢复

```bash
# 一键恢复项目上下文
seshflow ncfr
```

## Web 看板

启动 Trello 风格的可视化看板：

```bash
cd packages/web
pnpm dev
```

访问 http://localhost:3000

## 架构

```
seshflow/
├── packages/
│   ├── cli/          # CLI 核心工具
│   ├── web/          # Web 看板（React + Vite）
│   └── shared/       # 共享类型
├── TASKS.template.md      # 任务模板
├── TASKS_TEMPLATE_SPEC.md # 格式规范
├── MARKDOWN_IMPORT_GUIDE.md # 导入指南
└── docs.md           # 完整技术文档
```

## 主要命令

```bash
# 项目管理
seshflow init              # 初始化项目
seshflow import <file.md>  # 导入任务（支持 AI 生成）
seshflow export <file.md>  # 导出任务

# 任务操作
seshflow add <title>       # 添加任务
seshflow next              # 获取下一个任务
seshflow done              # 完成当前任务
seshflow list              # 列出所有任务
seshflow tree              # 显示任务树

# 会话管理
seshflow ncfr              # 新会话恢复（别名: newchatfirstround）

# Web 界面
seshflow dashboard         # 启动看板（待实现）
```

## AI 使用指南

### 1. 新会话启动

```
我正在开发 Seshflow 项目，请帮我继续。
```

然后运行：
```bash
seshflow ncfr
```

### 2. 让 AI 生成任务

提示词：
```
请帮我生成一个电商网站的任务列表，
包括：
- 后端开发（Node.js + Express）
- 前端开发（React）
- 数据库设计（PostgreSQL）
- 测试和部署

使用 Markdown 格式，包含优先级、标签和工时预估。
```

### 3. 批量导入

```bash
# AI 生成的任务保存到 tasks.md
seshflow import tasks.md

# 开始工作
seshflow next
```

## 文档

- 📖 [完整技术规划](docs.md)
- 📝 [Markdown 任务格式规范](TASKS_TEMPLATE_SPEC.md)
- 📋 [任务模板示例](TASKS.template.md)
- 🚀 [快速导入指南](MARKDOWN_IMPORT_GUIDE.md)

## 开发

```bash
# 克隆项目
git clone https://github.com/your-username/seshflow.git
cd seshflow

# 安装依赖
pnpm install

# 构建 CLI
cd packages/cli && pnpm build

# 运行 CLI
node bin/seshflow.js --help

# 启动 Web 看板
cd packages/web && pnpm dev
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT

---

**Made with ❤️ for AI-assisted development**
