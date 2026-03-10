import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';
import { CONTRACT_KINDS, CONTRACT_PROTOCOLS } from '../../../shared/constants/contracts.js';
import { normalizeWorkspaceMode, WORKSPACE_MODES } from '../../../shared/constants/modes.js';

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

Template version: 1.3.0
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

function getApiFirstContractReadme() {
  return `# API-first Contracts

Store one JSON contract per file in this directory.

- Keep the filename aligned with the stable contract id
- Keep the version inside the JSON payload, not in the filename
- Start from \`contract.user-service.create-user.json\`
- Start from \`contract.board-service.move-card.json\` for RPC-style contracts
- For batch bootstrap, use \`contracts.bundle.json\` (JSON array) or \`contracts.bundle.jsonl\` (one contract per line)
- \`kind\` and \`protocol\` are descriptive metadata in v1.3.x; Seshflow stores custom values like \`event-stream\` without inferring transport semantics from code
- Validate contract-linked planning through \`seshflow validate\` and \`seshflow import --update\`
`;
}

function getApiFirstExampleContract() {
  return JSON.stringify({
    schemaVersion: 1,
    id: 'contract.user-service.create-user',
    version: '1.0.0',
    kind: CONTRACT_KINDS.API,
    protocol: CONTRACT_PROTOCOLS.HTTP_JSON,
    name: 'Create User',
    owner: {
      service: 'user-service',
      team: 'identity',
      ownerTaskIds: ['task_api_create_user_contract']
    },
    lifecycle: {
      status: 'draft',
      compatibility: 'backward-compatible',
      supersedes: [],
      replacedBy: null
    },
    endpoint: {
      method: 'POST',
      path: '/users'
    },
    requestSchema: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    },
    responseSchema: {
      type: 'object',
      required: ['id', 'name', 'email'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    },
    consumers: [{ name: 'web-app', role: 'caller' }],
    implementationBindings: [],
    openQuestions: [],
    notes: []
  }, null, 2);
}

function getApiFirstExampleRpcContract() {
  return JSON.stringify({
    schemaVersion: 1,
    id: 'contract.board-service.move-card',
    version: '1.0.0',
    kind: CONTRACT_KINDS.RPC,
    protocol: CONTRACT_PROTOCOLS.RPC_JSON,
    name: 'Move Card',
    owner: {
      service: 'board-service',
      team: 'collaboration',
      ownerTaskIds: ['task_rpc_move_card_contract']
    },
    lifecycle: {
      status: 'draft',
      compatibility: 'backward-compatible',
      supersedes: [],
      replacedBy: null
    },
    endpoint: null,
    rpc: {
      service: 'board-service',
      method: 'MoveCard'
    },
    requestSchema: {
      type: 'object',
      required: ['cardId', 'targetListId'],
      properties: {
        cardId: { type: 'string' },
        targetListId: { type: 'string' },
        targetPosition: { type: 'number' }
      }
    },
    responseSchema: {
      type: 'object',
      required: ['ok'],
      properties: {
        ok: { type: 'boolean' }
      }
    },
    consumers: [{ name: 'web-app', role: 'caller' }],
    implementationBindings: [],
    openQuestions: [],
    notes: []
  }, null, 2);
}

function getApiFirstPlanningTemplate() {
  return `# API-first Planning Template

## Contract: contract.user-service.create-user

- [ ] Draft request and response schema [id:task_api_create_user_contract] [contracts:contract.user-service.create-user] [P0]
> Confirm status codes, error format, and backward compatibility notes.

- [ ] Implement POST /users route [id:task_impl_create_user_route] [contracts:contract.user-service.create-user] [depends:task_api_create_user_contract] [P0]
> Bind the implementation task to the contract before starting parallel work.

- [ ] Update web caller [id:task_consume_create_user] [contracts:contract.user-service.create-user] [depends:task_impl_create_user_route] [P1]
> Keep consumer work tied to the same contract group.
`;
}

async function configureMode(storage, mode = 'default') {
  const config = await storage.readConfigFile();
  config.mode = mode;
  await storage.writeConfigFile(config);
}

async function copyTemplateFiles(seshflowDir, mode = 'default') {
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

  if (mode === 'apifirst') {
    templates.push(
      {
        target: path.join(seshflowDir, 'contracts', 'README.md'),
        fallback: getApiFirstContractReadme()
      },
      {
        target: path.join(seshflowDir, 'contracts', 'contract.user-service.create-user.json'),
        fallback: getApiFirstExampleContract()
      },
      {
        target: path.join(seshflowDir, 'contracts', 'contract.board-service.move-card.json'),
        fallback: getApiFirstExampleRpcContract()
      },
      {
        target: path.join(seshflowDir, 'plans', 'api-planning.md'),
        fallback: getApiFirstPlanningTemplate()
      }
    );
  }

  for (const template of templates) {
    try {
      await fs.ensureDir(path.dirname(template.target));
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

function resolveInitArgs(modeOrOptions, maybeOptions) {
  if (typeof modeOrOptions === 'string') {
    return {
      mode: normalizeWorkspaceMode(modeOrOptions) || WORKSPACE_MODES.DEFAULT,
      options: maybeOptions || {}
    };
  }

  return {
    mode: WORKSPACE_MODES.DEFAULT,
    options: modeOrOptions || {}
  };
}

export async function init(modeOrOptions = {}, maybeOptions = {}) {
  const { mode, options } = resolveInitArgs(modeOrOptions, maybeOptions);
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

    await configureMode(storage, mode);

    spinner && (spinner.text = 'Copying template files...');
    await copyTemplateFiles(storage.getSeshflowDir(), mode);

    spinner?.succeed('Seshflow workspace initialized');

    console.log(chalk.green('\nWorkspace ready!'));
    console.log(chalk.gray(`  Location: ${storage.getSeshflowDir()}`));
    console.log(chalk.gray(`  Root source: ${storage.getWorkspaceResolution().source}`));
    console.log(chalk.gray(`  Source path: ${storage.getWorkspaceResolution().sourcePath}`));
    console.log(chalk.gray('  Config: .seshflow/config.yaml'));
    console.log(chalk.gray(`  Mode: ${mode}`));

    console.log(chalk.blue('\nTemplate files created:'));
    console.log(chalk.gray('  .seshflow/TASKS.template.md        - Managed planning template'));
    console.log(chalk.gray('  .seshflow/TASKS_TEMPLATE_SPEC.md   - Template syntax reference'));
    console.log(chalk.gray('  .seshflow/MARKDOWN_IMPORT_GUIDE.md - Markdown import guide'));
    if (mode === 'apifirst') {
      console.log(chalk.gray('  .seshflow/contracts/README.md      - Contract storage guide'));
      console.log(chalk.gray('  .seshflow/contracts/*.json         - Starter contract files'));
      console.log(chalk.gray('  .seshflow/plans/api-planning.md    - Contract-first planning template'));
    }

    const shellHints = getShellHints();

    console.log(chalk.blue('\nQuick start:'));
    if (mode === 'apifirst') {
      console.log(chalk.gray('  # Contract and planning phase'));
      console.log(chalk.gray('  # Batch contract bootstrap (.json array or .jsonl)'));
      console.log(chalk.gray('  seshflow contracts import .seshflow/contracts/contracts.bundle.json'));
      console.log(chalk.gray('  # or'));
      console.log(chalk.gray('  seshflow contracts import .seshflow/contracts/contracts.bundle.jsonl'));
      console.log(chalk.gray('  seshflow contracts add .seshflow/contracts/contract.user-service.create-user.json'));
      console.log(chalk.gray('  seshflow validate .seshflow/plans/api-planning.md'));
      console.log(chalk.gray('  seshflow import .seshflow/plans/api-planning.md --update'));
      console.log(chalk.gray('  seshflow ncfr'));
      console.log(chalk.gray('  seshflow contracts check'));
      console.log('');
      console.log(chalk.gray('  # Execution phase'));
      console.log(chalk.gray('  seshflow next'));
      console.log(chalk.gray('  seshflow start <taskId>'));
      console.log(chalk.gray('  seshflow show <taskId>'));
      console.log(chalk.gray('  seshflow record --note "implementation progress"'));
      console.log(chalk.gray('  seshflow done <taskId>'));
    } else {
      console.log(chalk.gray('  seshflow ncfr'));
      console.log(chalk.gray('  seshflow add "My first task"'));
      console.log(chalk.gray('  seshflow next'));
      console.log('');
      console.log(chalk.gray('  # Batch planning with managed Markdown'));
      console.log(chalk.gray(`  ${shellHints.copyCmd}`));
      console.log(chalk.gray('  seshflow validate my-tasks.md'));
      console.log(chalk.gray('  seshflow import my-tasks.md'));
      console.log(chalk.gray('  # Later: edit the same file, then'));
      console.log(chalk.gray('  seshflow import my-tasks.md --update'));
      console.log(chalk.gray('  seshflow next'));
    }

    console.log(chalk.blue('\nReference:'));
    console.log(chalk.gray(`  ${shellHints.viewCmd}`));
  } catch (error) {
    spinner?.fail('Initialization failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
