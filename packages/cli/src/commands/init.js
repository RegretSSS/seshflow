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

# 我的任务

- [ ] 任务1
- [ ] 任务2
- [ ] 任务3

### 带属性的任务列表

# 项目开发

## Phase 1: 基础功能

- [ ] 设计数据库 [P0] [database] [4h]
- [ ] 实现 API [P1] [api] [6h]
- [ ] 编写测试 [P2] [test] [3h]

## Phase 2: 前端开发

- [ ] 设计 UI [P1] [ui] [4h]
- [ ] 实现组件 [P1] [frontend] [6h]

---

## 完整语法示例

# 项目名称

## 阶段/分组名称

- [ ] 任务标题 [优先级] [标签1,标签2] [预估工时] [@分配人] [依赖:任务ID]
  - [x] 已完成的子任务
  - [ ] 待完成的子任务
> 任务描述（可选）
> 可以是多行描述

---

## 优先级说明

- [P0] - 紧急（红色）
- [P1] - 高（橙色）
- [P2] - 中（黄色，默认）
- [P3] - 低（绿色）

---

## 标签示例

- [auth] - 认证相关
- [database] - 数据库相关
- [api] - API 相关
- [frontend] - 前端相关
- [backend] - 后端相关
- [ui] - UI/UX
- [devops] - 运维相关
- [testing] - 测试相关

---

## 导入任务

创建好任务文件后，使用以下命令导入：

# 导入所有任务
seshflow import PROJECT_TASKS.md

# 查看下一个任务
seshflow next

# 查看所有任务
seshflow list

---

## 更多文档

- 查看完整格式规范: cat TASKS_TEMPLATE_SPEC.md
- 查看快速导入指南: cat MARKDOWN_IMPORT_GUIDE.md

---

模板版本: 1.0.0
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

    console.log(chalk.blue('\n⚡ Quick start:'));
    console.log(chalk.gray('  # Option 1: Add a single task'));
    console.log(chalk.gray('  seshflow add "My first task"'));
    console.log(chalk.gray('  seshflow next'));
    console.log('');
    console.log(chalk.gray('  # Option 2: Batch import tasks (recommended)'));
    console.log(chalk.gray('  cp .seshflow/TASKS.template.md my-tasks.md'));
    console.log(chalk.gray('  # Edit my-tasks.md (or use AI to generate)'));
    console.log(chalk.gray('  seshflow import my-tasks.md'));
    console.log(chalk.gray('  seshflow next'));

    console.log(chalk.blue('\n📖 Learn more:'));
    console.log(chalk.gray('  cat .seshflow/MARKDOWN_IMPORT_GUIDE.md'));
  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('\nError: ' + error.message));
    process.exit(1);
  }
}
