# 🔄 如何在新会话中恢复 Seshflow 开发

## 快速恢复（3 分钟）

当你开启新的 AI 对话时，复制以下内容给 AI：

---

```
我正在开发 Seshflow 项目，请帮我继续。

项目位置：D:\000-自制软件\seshflow

当前状态：
- Phase 1 MVP 已完成（CLI 核心命令）
- 共有 12 个任务在待办列表中
- 下一步：开始 Phase 2（React 看板）

请执行以下步骤：
1. 运行: cd "D:\000-自制软件\seshflow" && node packages/cli/bin/seshflow.js next
2. 查看当前任务详情
3. 按照 Coding → Test → GitCommit 的流程完成当前任务
```

---

## 详细恢复流程

### 步骤 1：查看当前任务

```bash
cd "D:\000-自制软件\seshflow"
node packages/cli/bin/seshflow.js next
```

这将显示：
- 当前进行中的任务（如果有）
- 或下一个应该做的任务

### 步骤 2：查看完整任务列表

```bash
# 查看任务文件
cat .seshflow/tasks.json | grep -A 5 '"title"'
```

或直接打开文件：
```bash
code .seshflow/tasks.json
# 或
cat .seshflow/tasks.json | python -m json.tool
```

### 步骤 3：开始工作

AI 会根据 `seshflow next` 的输出自动获得：
- 当前任务标题和描述
- 相关文件列表
- 上次会话的备注
- 技术栈和依赖信息

## 完整会话恢复模板

### 模板 1：继续开发功能

```
我正在开发 Seshflow 项目。

项目信息：
- 路径：D:\000-自制软件\seshflow
- 项目类型：Node.js CLI + React Web 界面
- 包管理：pnpm workspace

当前任务：
[先运行 seshflow next，把输出粘贴在这里]

请帮我：
1. 理解当前任务的需求
2. 按照 Coding → Test → GitCommit 流程完成
3. 使用 seshflow done 完成任务
```

### 模板 2：修复 Bug

```
我正在开发 Seshflow 项目。

Bug 描述：
[描述遇到的问题]

项目位置：D:\000-自制软件\seshflow

请帮我：
1. 定位问题
2. 修复 Bug
3. 添加测试防止回归
4. 提交修复
```

### 模板 3：添加新功能

```
我正在开发 Seshflow 项目。

新功能需求：
[描述要添加的功能]

项目位置：D:\000-自制软件\seshflow

请帮我：
1. 创建新任务: seshflow add "功能名称" --desc "..."
2. 实现功能
3. 测试
4. 完成任务
```

## 项目上下文文件

### 关键文档

1. **QUICKSTART.md** - 快速开始指南
2. **IMPLEMENTATION_STATUS.md** - 实现状态
3. **docs.md** - 完整技术规划
4. **SESSION_RECOVERY.md** - 本文件

### 关键目录

```
seshflow/
├── packages/cli/          # CLI 核心代码
│   ├── src/commands/      # 命令实现
│   ├── src/core/          # 核心逻辑
│   └── src/utils/         # 工具函数
├── packages/web/          # Web 界面（待开发）
└── packages/shared/       # 共享类型
```

## 开发流程规范

### Coding（编码）
1. 阅读当前任务描述
2. 查看相关文件
3. 编写代码实现
4. 遵循项目代码风格

### Test（测试）
1. 编写单元测试（如果有测试框架）
2. 手动测试功能
3. 验证边界情况
4. 确保不破坏现有功能

### GitCommit（提交）
1. 查看修改：`git status`
2. 添加文件：`git add .`
3. 提交代码：
   ```bash
   git commit -m "feat: 简短描述

   详细说明：
   - 实现了什么功能
   - 为什么这样实现
   - 相关 issue 或任务 ID"
   ```

4. 完成任务：
   ```bash
   node packages/cli/bin/seshflow.js done --hours X --note "完成备注"
   ```

## 示例：完整工作流

```bash
# 1. 新会话开始
cd "D:\000-自制软件\seshflow"

# 2. 查看当前任务
node packages/cli/bin/seshflow.js next

# 输出示例：
# ┌─ Phase 2.1 创建 Web 包基础结构
# ├────────────────────────┐
# │ ID: task_1772703864111_e913
# │ Priority: P0
# │ Status: todo
# │ Estimated: 2h
# │
# │ Description:
# │   创建 packages/web/ 目录结构，配置 Vite + React...
# └────────────────────────┘

# 3. AI 开始工作
# [AI 实现代码...]

# 4. 测试
node scripts/simple-test.js

# 5. 提交代码
git add .
git commit -m "feat: add web package structure with Vite + React"

# 6. 完成任务
node packages/cli/bin/seshflow.js done --hours 2 --note "完成 Web 包基础结构配置"

# 7. 继续下一个任务
node packages/cli/bin/seshflow.js next
```

## 常用命令速查

```bash
# 查看下一个任务
seshflow next

# 完成当前任务
seshflow done --hours 2 --note "完成备注"

# 添加新任务
seshflow add "任务名称" --desc "描述" --priority P0 --tags tag1,tag2

# 查看所有任务
cat .seshflow/tasks.json | python -m json.tool

# 测试项目
node scripts/simple-test.js

# 运行 CLI
node packages/cli/bin/seshflow.js [command]
```

## 技术栈总结

### CLI 部分
- **运行时**: Node.js 18+
- **语言**: JavaScript (ESM)
- **框架**: Commander.js
- **样式**: Chalk
- **交互**: Inquirer
- **存储**: JSON 文件

### Web 部分（待开发）
- **框架**: React 18
- **构建**: Vite
- **语言**: TypeScript
- **拖拽**: react-beautiful-dnd
- **可视化**: D3.js
- **样式**: Tailwind CSS

### 开发工具
- **包管理**: pnpm (workspace)
- **代码规范**: Prettier + ESLint
- **测试**: Jest
- **版本控制**: Git

## 故障排查

### 问题：seshflow 命令找不到

```bash
# 方案 1：使用完整路径
node packages/cli/bin/seshflow.js [command]

# 方案 2：全局链接
pnpm --filter @seshflow/cli link
seshflow [command]
```

### 问题：依赖缺失

```bash
# 重新安装依赖
pnpm install
```

### 问题：任务文件损坏

```bash
# 查看备份
ls -la .seshflow/backups/

# 恢复备份
cp .seshflow/backups/tasks_<timestamp>.json .seshflow/tasks.json
```

## 获取帮助

```bash
# 查看命令帮助
seshflow --help
seshflow [command] --help

# 查看项目文档
cat README.md
cat QUICKSTART.md
cat IMPLEMENTATION_STATUS.md
```

---

**重要提示**：每次结束会话前，确保：
1. ✅ 代码已提交
2. ✅ 当前任务已完成或标记为进行中
3. ✅ 下一个任务已经清楚
4. ✅ 文档已更新

这样下次会话可以无缝继续！🚀
