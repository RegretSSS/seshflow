# Seshflow 测试指南

## ✅ 项目已具备在其他 workspace 完整测试的条件

### 当前状态

**✅ 可用的功能：**
- CLI 核心命令（init, add, next, done, ncfr）
- Web 看板（完整 UI + 拖拽）
- 数据持久化（.seshflow 目录）
- Markdown 任务导入格式
- 完整的样式和交互

**⚠️ 注意：**
- CLI 使用 JavaScript，无需构建
- 可直接通过 `node` 运行
- Web 需要启动开发服务器

---

## 方式 1：直接在当前目录测试（推荐）

### 1. 测试 CLI 命令

```bash
cd "D:\000-自制软件\seshflow"

# 初始化新项目
rm -rf .seshflow
node packages/cli/bin/seshflow.js init

# 添加任务
node packages/cli/bin/seshflow.js add "实现用户认证" --priority P0 --tags auth,backend

# 查看下一个任务
node packages/cli/bin/seshflow.js next

# 完成任务
node packages/cli/bin/seshflow.js done --hours 4 --note "完成认证系统"

# 批量导入
node packages/cli/bin/seshflow.js import my-tasks.md

# 新会话恢复
node packages/cli/bin/seshflow.js ncfr
```

### 2. 测试 Web 看板

```bash
# 启动 Web 开发服务器
cd "D:\000-自制软件\seshflow\packages\web"
pnpm dev

# 访问: http://localhost:3000
```

---

## 方式 2：在其他 workspace 测试

### 步骤 1：准备测试目录

```bash
# 创建新的测试项目
mkdir /tmp/test-seshflow
cd /tmp/test-seshflow

# 或者使用 Git 仓库
mkdir ~/my-project
cd ~/my-project
git init
```

### 步骤 2：创建快捷脚本

```bash
# 创建 seshflow 快捷命令
cat > seshflow << 'EOF'
#!/bin/bash
node "D:\000-自制软件\seshflow\packages\cli\bin\seshflow.js" "$@"
EOF

# Windows (PowerShell)
# 创建 seshflow.ps1
@'
node "D:\000-自制软件\seshflow\packages\cli\bin\seshflow.js" $args
'@ | Out-File -Encoding UTF8 seshflow.ps1
```

### 步骤 3：测试完整流程

```bash
# 1. 初始化
./seshflow init

# 2. 创建任务文件
cp .seshflow/TASKS.template.md my-tasks.md

# 3. 编辑任务（或使用 AI 生成）
# vim my-tasks.md

# 示例内容：
# # 项目开发
# - [ ] 设计数据库 [P0] [database] [4h]
# - [ ] 实现 API [P1] [api] [6h]
# - [ ] 编写测试 [P2] [test] [3h]

# 4. 导入任务
./seshflow import my-tasks.md

# 5. 开始工作
./seshflow next

# 6. 完成任务
./seshflow done --hours 4 --note "完成数据库设计"

# 7. 查看状态
cat .seshflow/tasks.json | python -m json.tool

# 8. 新会话恢复
./seshflow ncfr
```

---

## 方式 3：全局安装（推荐用于日常使用）

### Windows

```bash
cd "D:\000-自制软件\seshflow"
npm link --global

# 或者使用 pnpm
pnpm link --global
```

### Linux/Mac

```bash
cd "D:\000-自制软件\seshflow"
sudo npm link --global

# 或者添加到 PATH
export PATH="D:\000-自制软件\seshflow\packages\cli\bin:$PATH"
```

### 使用

```bash
# 在任何目录
cd ~/my-project
seshflow init
seshflow add "新任务"
seshflow next
```

---

## 完整测试场景

### 场景 1：新项目启动

```bash
# 1. 创建新项目
mkdir ~/new-project
cd ~/new-project
git init

# 2. 初始化 seshflow
seshflow init

# 3. 生成任务（使用 AI）
# 提示词：帮我生成一个博客系统的开发任务列表
# 包括：后端（Node.js）、前端（React）、数据库（PostgreSQL）

# 4. 复制 AI 输出到 my-tasks.md

# 5. 导入任务
seshflow import my-tasks.md

# 6. 开始工作
seshflow next
```

### 场景 2：跨对话开发

```bash
# 对话 1：开始工作
seshflow next  # 获取任务
# ... 工作 ...
seshflow done --hours 4 --note "完成用户认证"

# 对话 2：恢复上下文
seshflow ncfr  # 查看项目状态
seshflow next  # 继续下一个任务
```

### 场景 3：Web 看板管理

```bash
# 终端 1：启动 Web 看板
cd "D:\000-自制软件\seshflow\packages\web"
pnpm dev

# 终端 2：在浏览器访问
# http://localhost:3000
# 拖拽任务、查看详情、管理项目

# 终端 3：使用 CLI
cd ~/my-project
seshflow add "新任务"
# 刷新浏览器，立即看到新任务
```

---

## 测试检查清单

### CLI 功能
- [ ] `seshflow init` - 初始化项目
- [ ] `seshflow add` - 添加单个任务
- [ ] `seshflow next` - 获取下一个任务
- [ ] `seshflow done` - 完成任务
- [ ] `seshflow ncfr` - 新会话恢复
- [ ] `seshflow import` - 批量导入任务

### Web 功能
- [ ] 看板布局显示
- [ ] 拖拽任务到不同列
- [ ] 点击卡片查看详情
- [ ] 查看任务描述（Markdown）
- [ ] 查看子任务进度
- [ ] 查看标签和优先级

### 数据持久化
- [ ] `.seshflow/tasks.json` 文件创建
- [ ] 任务数据正确保存
- [ ] 重启后数据保持
- [ ] Git 集成（可选）

### AI 友好性
- [ ] Markdown 格式简单清晰
- [ ] `seshflow ncfr` 输出易懂
- [ ] 模板文件完整
- [ ] 文档齐全

---

## 常见问题

### Q: 如何在不同目录使用 seshflow？
A: 使用全局安装或创建快捷脚本

### Q: Web 看板数据从哪里来？
A: 当前使用模拟数据，需要实现 API 读取 `.seshflow/tasks.json`

### Q: 如何备份任务数据？
A: 复制 `.seshflow` 目录或使用 `seshflow export`（待实现）

### Q: 多人协作如何同步？
A: 将 `.seshflow` 提交到 Git，或使用 WebSocket（待实现）

---

## 下一步改进

### 待实现功能
1. ✨ Web API - 读取 `.seshflow/tasks.json`
2. ✨ 实时同步 - WebSocket 服务
3. ✨ `seshflow export` - 导出任务
4. ✨ `seshflow list` - 列出所有任务
5. ✨ `seshflow tree` - 显示任务树
6. ✨ Git hooks - 自动记录提交

### 已知限制
- Web 使用模拟数据
- 无实时同步
- 无后端 API
- 依赖关系未完全实现

---

**测试环境要求：**
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- 现代浏览器（Chrome/Firefox/Edge）

**开始测试：**
```bash
cd "D:\000-自制软件\seshflow"
node packages/cli/bin/seshflow.js ncfr
```

Happy Testing! 🚀
