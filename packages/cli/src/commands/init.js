import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';

export function getDefaultTaskTemplate() {
  const now = new Date().toISOString().split('T')[0];

  return `# Seshflow Planning Template

> Copy this file to \`PROJECT_TASKS.md\`
> Then run \`seshflow validate PROJECT_TASKS.md\` and \`seshflow import PROJECT_TASKS.md\`

---

## Minimal example

\`\`\`markdown
# My Project Plan

- [ ] Design data model [id:task_design] [P0]
- [ ] Build API [id:task_api] [P1] [dependency:task_design]
- [ ] Write tests [id:task_tests] [P1] [dependency:task_api]
\`\`\`

## Managed Markdown contract

- Keep stable task ids in Markdown with \`[id:task_xxx]\`
- Use \`[dependency:task_xxx]\` for stable dependency references
- Planning fields live in Markdown: title, description, priority, tags, estimate, assignee, dependencies
- Execution fields stay in \`.seshflow/tasks.json\`: status, sessions, runtime, artifacts, timestamps
- To revise a plan, edit the Markdown file and run \`seshflow import <file> --update\`

## Full example

\`\`\`markdown
# Trello Board Simulation

## Backlog

- [ ] Define board columns [id:task_columns] [P0] [planning] [2h]
> Decide which columns the simulated board needs.

- [ ] Define card schema [id:task_schema] [P0] [planning,backend] [3h] [dependency:task_columns]
> Capture title, labels, assignee, due date, and checklist support.

## Todo

- [ ] Build board API [id:task_api] [P1] [backend] [6h] [dependency:task_schema]
  - [ ] Add list endpoint
  - [ ] Add create-card endpoint

- [ ] Build board UI [id:task_ui] [P1] [frontend] [8h] [dependency:task_api]
\`\`\`

Template version: 1.2.0
Last updated: ${now}
`;
}

function getTemplateSpec() {
  return `# Seshflow Tasks Template Spec

Use \`seshflow validate <file>\` before import.

## Task format

\`\`\`markdown
- [ ] Task title [id:task_name] [P0] [tag1,tag2] [4h] [dependency:task_other,task_another]
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
- Stable ids use the \`task_\` prefix and should stay unchanged across plan edits.
- Prefer dependencies by task id for durable updates.
- \`seshflow import <file> --update\` updates planning fields by stable id.
- Runtime state is not managed in Markdown.
`;
}

function getMarkdownImportGuide() {
  return `# Markdown Import Guide

1. Start from \`.seshflow/TASKS.template.md\`.
2. Keep \`[id:task_xxx]\` on every task you want to revise later.
3. Use \`[dependency:task_xxx]\` for stable dependencies.
4. Run \`seshflow validate <file>\`.
5. Run \`seshflow import <file>\` for first import.
6. Edit the same Markdown file and run \`seshflow import <file> --update\` for planning updates.
7. Use \`seshflow export <file>\` if you need to regenerate a managed planning file from JSON.
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
    console.log(chalk.gray('  .seshflow/TASKS.template.md        - Managed planning template'));
    console.log(chalk.gray('  .seshflow/TASKS_TEMPLATE_SPEC.md   - Template syntax reference'));
    console.log(chalk.gray('  .seshflow/MARKDOWN_IMPORT_GUIDE.md - Markdown import guide'));

    const shellHints = getShellHints();

    console.log(chalk.blue('\nQuick start:'));
    console.log(chalk.gray('  seshflow ncfr --json'));
    console.log(chalk.gray('  seshflow add "My first task"'));
    console.log(chalk.gray('  seshflow next --json'));
    console.log('');
    console.log(chalk.gray('  # Batch planning with managed Markdown'));
    console.log(chalk.gray(`  ${shellHints.copyCmd}`));
    console.log(chalk.gray('  seshflow validate my-tasks.md'));
    console.log(chalk.gray('  seshflow import my-tasks.md'));
    console.log(chalk.gray('  # Later: edit the same file, then'));
    console.log(chalk.gray('  seshflow import my-tasks.md --update'));
    console.log(chalk.gray('  seshflow next --json'));

    console.log(chalk.blue('\nReference:'));
    console.log(chalk.gray(`  ${shellHints.viewCmd}`));
  } catch (error) {
    spinner?.fail('Initialization failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
