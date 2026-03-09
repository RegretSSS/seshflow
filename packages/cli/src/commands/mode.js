import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { Storage } from '../core/storage.js';
import { formatErrorResponse, formatSuccessResponse, formatWorkspaceJSON, isJSONMode, outputJSON } from '../utils/json-output.js';

const VALID_MODES = new Set(['default', 'apifirst']);

function getApiFirstContractReadme() {
  return `# API-first Contracts

Store one JSON contract per file in this directory.
`;
}

function getApiFirstExampleContract() {
  return JSON.stringify({
    schemaVersion: 1,
    id: 'contract.user-service.create-user',
    version: '1.0.0',
    kind: 'api',
    protocol: 'http-json',
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
      type: 'object'
    },
    responseSchema: {
      type: 'object'
    },
    consumers: [],
    implementationBindings: [],
    openQuestions: [],
    notes: []
  }, null, 2);
}

function getApiFirstPlanningTemplate() {
  return `# API-first Planning Template

## Contract: contract.user-service.create-user

- [ ] Draft request and response schema [id:task_api_create_user_contract] [contracts:contract.user-service.create-user] [P0]
`;
}

async function ensureApiFirstScaffold(storage) {
  const seshflowDir = storage.getSeshflowDir();
  const files = [
    {
      target: path.join(seshflowDir, 'contracts', 'README.md'),
      content: getApiFirstContractReadme()
    },
    {
      target: path.join(seshflowDir, 'contracts', 'contract.user-service.create-user.json'),
      content: getApiFirstExampleContract()
    },
    {
      target: path.join(seshflowDir, 'plans', 'api-planning.md'),
      content: getApiFirstPlanningTemplate()
    }
  ];

  for (const file of files) {
    await fs.ensureDir(path.dirname(file.target));
    if (!(await storage.exists(file.target))) {
      await fs.writeFile(file.target, file.content, 'utf-8');
    }
  }
}

export async function setMode(mode, options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Updating workspace mode').start() : null;

  try {
    if (!VALID_MODES.has(mode)) {
      throw Object.assign(new Error(`Unsupported mode: ${mode}`), { code: 'MODE_INVALID' });
    }

    const storage = new Storage();
    await storage.init();
    const config = await storage.readConfigFile();
    config.mode = mode;
    await storage.writeConfigFile(config);

    if (mode === 'apifirst') {
      await ensureApiFirstScaffold(storage);
    }

    spinner?.succeed('Workspace mode updated');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'mode.set',
        mode,
      }, workspace));
      return;
    }

    console.log(`MODE | ${mode}`);
  } catch (error) {
    spinner?.fail('Failed to update workspace mode');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, error.code || 'MODE_SET_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

export async function showMode(options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Loading workspace mode').start() : null;

  try {
    const storage = new Storage();
    await storage.init();
    const config = await storage.readConfigFile();
    const mode = config.mode || 'default';
    spinner?.succeed('Workspace mode loaded');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'mode.show',
        mode,
      }, workspace));
      return;
    }

    console.log(`MODE | ${mode}`);
  } catch (error) {
    spinner?.fail('Failed to load workspace mode');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, error.code || 'MODE_SHOW_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
