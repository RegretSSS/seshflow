import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the default task template content
 */
function getDefaultTaskTemplate() {
  const now = new Date().toISOString().split('T')[0];
  return `# 项目任务模板

> 使用此模板创建项目任务列表
> 复制此文件并重命名为 PROJECT_TASKS.md
> 然后运行 seshflow import PROJECT_TASKS.md

---

## 快速开始

### 最简单的任务列表

\`\`\`markdown
# 我的任务

- [ ] 任务1
- [ ] 任务2
- [ ] 任务3
\`\`\`

### 带属性的任务列表

\`\`\`markdown
# 项目开发

## Phase 1: 基础功能

- [ ] 设计数据库 [P0] [database] [4h]
- [ ] 实现 API [P1] [api] [6h]
- [ ] 编写测试 [P2] [test] [3h]

## Phase 2: 前端开发

- [ ] 设计 UI [P1] [ui] [4h]
- [ ] 实现组件 [P1] [frontend] [6h]
\`\`\`

---

## 完整功能示例

### 1. 带子任务的任务 ⭐

子任务可以帮助你：
- 将大任务分解为小步骤
- 设置多个完成检查点
- 跟踪任务进度

\`\`\`markdown
# 用户认证系统

## 后端开发

- [ ] 实现用户认证功能 [P0] [auth,backend] [8h]
  - [x] 设计数据库表结构 [2h]
  - [ ] 实现 JWT 认证 [3h]
  - [ ] 实现密码加密 [2h]
  - [ ] 编写单元测试 [1h]
> 认证系统包括登录、注册、密码重置功能
> 使用 JWT + bcrypt 方案

## 前端开发

- [ ] 实现认证 UI [P0] [auth,frontend] [6h]
  - [x] 设计登录页面 [2h]
  - [ ] 实现表单验证 [2h]
  - [ ] 连接后端 API [2h]
\`\`\`

### 2. 带依赖关系的任务

使用依赖关系确保任务按正确顺序执行。

\`\`\`markdown
# API 开发

- [ ] 设计 API 接口 [P0] [api,design] [4h]
- [ ] 实现用户 API [P0] [api,backend] [6h] [依赖:设计 API 接口]
- [ ] 实现 API 文档 [P1] [api,docs] [3h] [依赖:实现用户 API]
\`\`\`

### 3. 完整示例：真实项目

\`\`\`markdown
# 电商网站开发

## 第一阶段：基础设施

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

## 第二阶段：核心功能

- [ ] 实现用户系统 [P0] [auth,backend] [12h] [依赖:设计数据库 Schema]
  - [x] 用户注册接口 [3h]
  - [ ] 用户登录接口 [3h]
  - [ ] JWT 认证中间件 [2h]
  - [ ] 密码重置功能 [2h]
  - [ ] 单元测试 [2h]

- [ ] 实现商品管理 [P0] [product,backend] [10h] [依赖:设计数据库 Schema]
  - [ ] 商品 CRUD API [4h]
  - [ ] 图片上传功能 [3h]
  - [ ] 库存管理 [2h]
  - [ ] 单元测试 [1h]

- [ ] 实现订单系统 [P1] [order,backend] [8h] [依赖:实现商品管理,实现用户系统]
  - [ ] 创建订单 API [3h]
  - [ ] 支付集成 [3h]
  - [ ] 订单状态管理 [2h]

## 第三阶段：前端开发

- [ ] 实现商品列表页 [P1] [product,frontend] [6h] [依赖:实现商品管理]
  - [ ] 商品卡片组件 [2h]
  - [ ] 列表布局 [2h]
  - [ ] 筛选和排序 [2h]

- [ ] 实现购物车 [P1] [cart,frontend] [5h]
  - [ ] 购物车组件 [2h]
  - [ ] 添加/删除商品 [2h]
  - [ ] 价格计算 [1h]
\`\`\`

---

## 完整语法说明

### 任务格式

\`\`\`markdown
- [ ] 任务标题 [优先级] [标签1,标签2] [预估工时] [@分配人] [依赖:任务标题]
  - [x] 已完成的子任务 [工时]
  - [ ] 待完成的子任务 [工时]
> 任务描述（可选）
> 可以是多行描述
\`\`\`

### 优先级说明

- [P0] - 紧急（红色）- 最高优先级，立即处理
- [P1] - 高（橙色）- 高优先级，尽快处理
- [P2] - 中（黄色）- 中等优先级，默认值
- [P3] - 低（绿色）- 低优先级，稍后处理

### 常用标签

- [auth] - 认证相关
- [database] - 数据库相关
- [api] - API 相关
- [frontend] - 前端相关
- [backend] - 后端相关
- [ui] - UI/UX
- [devops] - 运维相关
- [testing] - 测试相关
- [bug] - Bug 修复
- [feature] - 新功能开发
- [refactor] - 代码重构
- [docs] - 文档更新

### 子任务说明

**作用**：
- 将复杂任务分解为可管理的小步骤
- 为任务设置多个检查点
- 可视化显示任务完成进度

**格式**：
- 子任务必须缩进（2个空格或1个tab）
- 子任务使用相同的格式：\`- [x]\` 或 \`- [ ]\`
- 可选工时：\`[2h]\`

**示例**：
\`\`\`markdown
- [ ] 实现用户认证 [P0] [auth] [8h]
  - [x] 设计数据库 [2h]    ← 已完成
  - [ ] 实现 API [3h]       ← 进行中
  - [ ] 编写测试 [1h]       ← 待办
\`\`\`

**查看效果**：
\`\`\`bash
seshflow next

┌─ 实现用户认证
├───────┐
│ Subtasks (1/3):
│   ✅ 设计数据库 [2h]
│   ⏸️ 实现 API [3h]
│   ⏸️ 编写测试 [1h]
└───────┘
\`\`\`

---

## 工作流程

### 1. 创建任务文件

\`\`\`bash
# 复制模板
cp .seshflow/TASKS.template.md my-tasks.md

# 使用 AI 生成（推荐）
# 将项目需求发送给 AI，让它生成任务列表
\`\`\`

### 2. 导入任务

\`\`\`bash
seshflow import my-tasks.md
\`\`\`

### 3. 开始工作

\`\`\`bash
# 查看下一个任务
seshflow next

# 完成任务
seshflow done --hours 2 --note "完成了功能实现"

# 查看所有任务
seshflow list

# 查看任务详情
seshflow show task_abc123

# 删除任务（如果创建错误）
seshflow delete task_abc123
\`\`\`

### 4. AI 跨对话记忆

\`\`\`bash
# 新对话中恢复上下文
seshflow ncfr
\`\`\`

---

## 实用技巧

### 1. 任务分解原则

- 大任务（>8h）→ 分解为多个子任务
- 复杂任务 → 分解为步骤性子任务
- 有检查点的任务 → 用子任务标记检查点

### 2. 依赖关系使用

- 确保依赖关系形成 DAG（无环图）
- 只依赖必要的任务，避免过度依赖
- 使用 \`seshflow deps task_id\` 查看依赖

### 3. 工时估算

- 子任务工时之和 = 主任务工时
- 考虑测试和文档编写时间
- 预留 20% 缓冲时间

### 4. 优先级分配

- P0: 阻塞性任务，必须立即完成
- P1: 重要任务，本周完成
- P2: 常规任务，按计划完成
- P3: 优化任务，有时间再做

---

## 更多文档

- 查看完整格式规范: \`cat .seshflow/TASKS_TEMPLATE_SPEC.md\`
- 查看快速导入指南: \`cat .seshflow/MARKDOWN_IMPORT_GUIDE.md\`

---

模板版本: 1.1.0
最后更新: ${now}
`;
}

/**
 * Copy template files to .seshflow directory
 */
async function copyTemplateFiles(seshflowDir) {
  // Get the project root (from packages/cli/src/commands to root)
  // We need to go up 3 levels: commands -> src -> cli -> packages -> root
  const projectRoot = path.join(__dirname, '../../../../');

  const templates = [
    {
      source: path.join(projectRoot, 'TASKS.template.md'),
      target: path.join(seshflowDir, 'TASKS.template.md'),
    },
    {
      source: path.join(projectRoot, 'TASKS_TEMPLATE_SPEC.md'),
      target: path.join(seshflowDir, 'TASKS_TEMPLATE_SPEC.md'),
    },
    {
      source: path.join(projectRoot, 'MARKDOWN_IMPORT_GUIDE.md'),
      target: path.join(seshflowDir, 'MARKDOWN_IMPORT_GUIDE.md'),
    },
  ];

  for (const template of templates) {
    try {
      if (await fs.pathExists(template.source)) {
        await fs.copy(template.source, template.target);
      }
    } catch (error) {
      // Skip if source doesn't exist
      console.log(chalk.yellow('  ⚠ Skipping ' + path.basename(template.source)));
    }
  }
}

function getShellHints() {
  const isWindows = process.platform === 'win32';

  if (!isWindows) {
    return {
      shellName: 'bash/zsh',
      copyCmd: 'cp .seshflow/TASKS.template.md my-tasks.md',
      viewCmd: 'cat .seshflow/MARKDOWN_IMPORT_GUIDE.md',
      altShellLabel: 'PowerShell alternative',
      altCopyCmd: 'Copy-Item .seshflow/TASKS.template.md my-tasks.md',
      altViewCmd: 'Get-Content .seshflow/MARKDOWN_IMPORT_GUIDE.md'
    };
  }

  const isPowerShell = Boolean(process.env.PSModulePath);
  if (isPowerShell) {
    return {
      shellName: 'PowerShell',
      copyCmd: 'Copy-Item .seshflow/TASKS.template.md my-tasks.md',
      viewCmd: 'Get-Content .seshflow/MARKDOWN_IMPORT_GUIDE.md',
      altShellLabel: 'CMD alternative',
      altCopyCmd: 'copy .seshflow\\TASKS.template.md my-tasks.md',
      altViewCmd: 'type .seshflow\\MARKDOWN_IMPORT_GUIDE.md'
    };
  }

  return {
    shellName: 'CMD',
    copyCmd: 'copy .seshflow\\TASKS.template.md my-tasks.md',
    viewCmd: 'type .seshflow\\MARKDOWN_IMPORT_GUIDE.md',
    altShellLabel: 'PowerShell alternative',
    altCopyCmd: 'Copy-Item .seshflow/TASKS.template.md my-tasks.md',
    altViewCmd: 'Get-Content .seshflow/MARKDOWN_IMPORT_GUIDE.md'
  };
}

/**
 * Initialize seshflow workspace
 */
export async function init(options = {}) {
  const spinner = ora('Initializing Seshflow workspace').start();

  try {
    const storage = new Storage();

    // Check if already initialized
    if (storage.isInitialized() && !options.force) {
      spinner.warn('Seshflow already initialized');
      console.log(chalk.yellow('\nUse --force to reinitialize'));
      return;
    }

    // Initialize storage
    await storage.init();

    // Create task manager to ensure data is loaded
    const manager = new TaskManager();
    await manager.init();

    // Copy template files to .seshflow directory
    spinner.text = 'Copying template files...';
    await copyTemplateFiles(storage.getSeshflowDir());

    spinner.succeed('Seshflow workspace initialized');

    // Print summary
    console.log(chalk.green('\n✓ Workspace ready!'));
    console.log(chalk.gray('  Location: ' + storage.getSeshflowDir()));
    console.log(chalk.gray('  Config: .seshflow/config.yaml'));

    // Print template files info
    console.log(chalk.blue('\n📝 Template files created:'));
    console.log(chalk.gray('  .seshflow/TASKS.template.md       - 任务模板示例'));
    console.log(chalk.gray('  .seshflow/TASKS_TEMPLATE_SPEC.md  - 格式规范'));
    console.log(chalk.gray('  .seshflow/MARKDOWN_IMPORT_GUIDE.md - 导入指南'));

    const shellHints = getShellHints();

    console.log(chalk.blue(`\n⚡ Quick start (${shellHints.shellName}):`));
    console.log(chalk.gray('  # Option 1: Add a single task'));
    console.log(chalk.gray('  seshflow add "My first task"'));
    console.log(chalk.gray('  seshflow next'));
    console.log('');
    console.log(chalk.gray('  # Option 2: Batch import tasks (recommended)'));
    console.log(chalk.gray(`  ${shellHints.copyCmd}`));
    console.log(chalk.gray('  # Edit my-tasks.md (or use AI to generate)'));
    console.log(chalk.gray('  seshflow import my-tasks.md'));
    console.log(chalk.gray('  seshflow next'));
    console.log('');
    console.log(chalk.gray(`  # ${shellHints.altShellLabel}`));
    console.log(chalk.gray(`  ${shellHints.altCopyCmd}`));

    console.log(chalk.blue('\n📖 Learn more:'));
    console.log(chalk.gray(`  ${shellHints.viewCmd}`));
    console.log(chalk.gray(`  # ${shellHints.altShellLabel}`));
    console.log(chalk.gray(`  ${shellHints.altViewCmd}`));
  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('\nError: ' + error.message));
    process.exit(1);
  }
}
