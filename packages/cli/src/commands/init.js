import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';

export function getDefaultTaskTemplate() {
  const now = new Date().toISOString().split('T')[0];

  return `# 项目任务模板

> 复制这份模板并重命名为 \`PROJECT_TASKS.md\`
> 然后执行 \`seshflow import PROJECT_TASKS.md\`

---

## 快速开始

### 最简任务列表示例

\`\`\`markdown
# 我的任务

- [ ] 任务 1
- [ ] 任务 2
- [ ] 任务 3
\`\`\`

### 带属性的任务列表示例

\`\`\`markdown
# 项目开发
## Phase 1: 基础功能

- [ ] 设计数据库 [P0] [database] [4h]
- [ ] 实现 API [P1] [api] [6h]
- [ ] 编写测试 [P2] [testing] [3h]

## Phase 2: 前端开发
- [ ] 设计 UI [P1] [ui] [4h]
- [ ] 实现组件 [P1] [frontend] [6h]
\`\`\`

---

## 完整示例

\`\`\`markdown
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
\`\`\`

---

## 语法说明

\`\`\`markdown
- [ ] 任务标题 [P0] [tag1,tag2] [4h] [@负责人] [依赖:任务 A,任务 B]
  - [ ] 子任务 A [1h]
  - [ ] 子任务 B [2h]
> 可选的任务描述
\`\`\`

### 优先级
- \`[P0]\` 紧急
- \`[P1]\` 高
- \`[P2]\` 中
- \`[P3]\` 低

### 常用标签
- \`[auth]\`
- \`[database]\`
- \`[api]\`
- \`[frontend]\`
- \`[backend]\`
- \`[testing]\`
- \`[docs]\`

---

## 导入流程

\`\`\`bash
seshflow import PROJECT_TASKS.md
seshflow next
seshflow list --all
\`\`\`

---

模板版本: 1.1.1
最后更新: ${now}
`;
}

function getTemplateSpec() {
  return `# Seshflow Tasks Template Spec

Use \`seshflow validate <file>\` before import.

## Task format

\`\`\`markdown
- [ ] Task title [P0] [tag1,tag2] [4h] [dependency:Task A,Task B]
> Optional task description
  - [ ] Subtask A [1h]
  - [ ] Subtask B [2h]
\`\`\`

## Priority

- [P0] urgent
- [P1] high
- [P2] normal
- [P3] low

## Notes

- Subtasks should be indented by 2 spaces.
- Dependencies can reference task title, index, or task_id.
- Use \`seshflow import <file>\` after validation.
`;
}

function getMarkdownImportGuide() {
  return `# Markdown Import Guide

1. Write tasks in Markdown.
2. Run \`seshflow validate <file>\`.
3. Run \`seshflow import <file>\`.
`;
}

async function copyTemplateFiles(seshflowDir) {
  const templates = [
    {
      target: path.join(seshflowDir, 'TASKS.template.md'),
      fallback: getDefaultTaskTemplate()
    },
    {
      target: path.join(seshflowDir, 'TASKS_TEMPLATE_SPEC.md'),
      fallback: getTemplateSpec()
    },
    {
      target: path.join(seshflowDir, 'MARKDOWN_IMPORT_GUIDE.md'),
      fallback: getMarkdownImportGuide()
    }
  ];

  for (const template of templates) {
    try {
      await fs.writeFile(template.target, template.fallback, 'utf-8');
    } catch {
      console.log(chalk.yellow(`  Failed to prepare ${path.basename(template.target)}`));
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

export async function init(options = {}) {
  const spinner = process.stderr.isTTY ? ora('Initializing Seshflow workspace').start() : null;

  try {
    const initOptions = { preferGitRoot: true, ignoreExistingWorkspace: true };
    const storage = new Storage(process.cwd(), initOptions);

    if (storage.isInitialized() && !options.force) {
      spinner?.warn('Seshflow already initialized');
      console.log(chalk.yellow('\nUse --force to reinitialize'));
      return;
    }

    await storage.init();

    const manager = new TaskManager(process.cwd(), initOptions);
    await manager.init();

    spinner && (spinner.text = 'Copying template files...');
    await copyTemplateFiles(storage.getSeshflowDir());

    spinner?.succeed('Seshflow workspace initialized');

    console.log(chalk.green('\nWorkspace ready!'));
    console.log(chalk.gray(`  Location: ${storage.getSeshflowDir()}`));
    console.log(chalk.gray(`  Root source: ${storage.getWorkspaceResolution().source}`));
    console.log(chalk.gray(`  Source path: ${storage.getWorkspaceResolution().sourcePath}`));
    console.log(chalk.gray('  Config: .seshflow/config.yaml'));

    console.log(chalk.blue('\nTemplate files created:'));
    console.log(chalk.gray('  .seshflow/TASKS.template.md        - Task template example'));
    console.log(chalk.gray('  .seshflow/TASKS_TEMPLATE_SPEC.md   - Template syntax reference'));
    console.log(chalk.gray('  .seshflow/MARKDOWN_IMPORT_GUIDE.md - Markdown import guide'));

    const shellHints = getShellHints();

    console.log(chalk.blue('\nQuick start:'));
    console.log(chalk.gray('  seshflow ncfr --json'));
    console.log(chalk.gray('  seshflow add "My first task"'));
    console.log(chalk.gray('  seshflow next --json'));
    console.log('');
    console.log(chalk.gray('  # Batch import from the provided template'));
    console.log(chalk.gray(`  ${shellHints.copyCmd}`));
    console.log(chalk.gray('  seshflow validate my-tasks.md'));
    console.log(chalk.gray('  seshflow import my-tasks.md'));
    console.log(chalk.gray('  seshflow next --json'));

    console.log(chalk.blue('\nReference:'));
    console.log(chalk.gray(`  ${shellHints.viewCmd}`));
  } catch (error) {
    spinner?.fail('Initialization failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
