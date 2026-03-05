# Seshflow

> 跨对话任务序列器 - 专为 AI 辅助开发设计的轻量级任务管理工具

## 特性

- 🔄 **跨对话持久化** - 每次新对话立即恢复工作上下文
- 🌳 **依赖关系管理** - 智能任务依赖树，自动排序
- 🎯 **Git 集成** - 提交自动关联任务，完整开发轨迹
- 🎨 **可视化看板** - Trello 风格 Web 界面
- 🔗 **跨平台同步** - Windows/WSL/Linux 任务状态实时同步

## 快速开始

```bash
# 安装
pnpm add -g seshflow

# 初始化项目
seshflow init

# 添加任务
seshflow add "实现用户认证" --priority P0 --tags auth,backend

# 开始工作
seshflow next

# 完成任务
seshflow done --hours 4 --note "完成认证系统"

# 启动看板
seshflow dashboard
```

## 架构

```
seshflow/
├── packages/
│   ├── cli/          # CLI 核心工具
│   ├── web/          # Web 看板
│   └── shared/       # 共享类型
├── docs/             # 文档
└── examples/         # 示例项目
```

## 文档

详细文档请查看 [docs.md](./docs.md)

## License

MIT
