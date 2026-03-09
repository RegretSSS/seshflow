import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { Storage } from '../core/storage.js';
import { TaskManager } from '../core/task-manager.js';
import { buildModeGuidance, resolveWorkspaceMode } from '../core/workspace-mode.js';
import { WorkspaceEventService } from '../core/workspace-event-service.js';
import { formatErrorResponse, formatSuccessResponse, formatWorkspaceJSON, isJSONMode, outputJSON } from '../utils/json-output.js';
import { VALID_WORKSPACE_MODES, WORKSPACE_MODES } from '../../../shared/constants/modes.js';
import { INTEGRATION_EVENT_TYPES } from '../../../shared/constants/integration.js';

const VALID_MODES = new Set(VALID_WORKSPACE_MODES);

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

function parseModeOverrides(options = {}) {
  const overrides = {};

  if (typeof options.driftReminders === 'string') {
    if (options.driftReminders === 'on') {
      overrides.contractDriftReminders = true;
    } else if (options.driftReminders === 'off') {
      overrides.contractDriftReminders = false;
    }
  }

  if (typeof options.contextPriority === 'string' && options.contextPriority !== 'inherit') {
    overrides.contextPriorityStrategy = options.contextPriority;
  }

  return overrides;
}

export async function setMode(mode, options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Updating workspace mode').start() : null;

  try {
    if (!VALID_MODES.has(mode)) {
      throw Object.assign(new Error(`Unsupported mode: ${mode}`), { code: 'MODE_INVALID' });
    }

    const storage = new Storage();
    await storage.init();
    const manager = new TaskManager(storage.getWorkspacePath());
    await manager.init();
    const previousModeInfo = await resolveWorkspaceMode(storage);
    const config = await storage.readConfigFile();
    config.mode = mode;
    config.modeProfile = {
      preset: mode,
      overrides: parseModeOverrides(options),
    };
    await storage.writeConfigFile(config);

    if (mode === WORKSPACE_MODES.APIFIRST) {
      await ensureApiFirstScaffold(storage);
    }

    spinner?.succeed('Workspace mode updated');
    const modeInfo = await resolveWorkspaceMode(storage);
    const guidance = buildModeGuidance(modeInfo);
    const eventService = new WorkspaceEventService(manager);
    await eventService.emit(INTEGRATION_EVENT_TYPES.MODE_CHANGED, {
      message: `Workspace mode changed from ${previousModeInfo.mode} to ${modeInfo.mode}`,
      previousMode: previousModeInfo.mode,
      mode: modeInfo.mode,
    });
    await manager.saveData();

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'mode.set',
        mode: modeInfo.mode,
        requestedMode: modeInfo.requestedMode,
        compatibility: modeInfo.compatibility,
        capabilities: modeInfo.capabilities,
        profile: modeInfo.profile,
        guidance,
      }, workspace));
      return;
    }

    console.log(`MODE | ${modeInfo.mode}`);
    if (guidance.note) {
      console.log(chalk.gray(guidance.note));
    }
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
    const modeInfo = await resolveWorkspaceMode(storage);
    const guidance = buildModeGuidance(modeInfo);
    spinner?.succeed('Workspace mode loaded');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'mode.show',
        mode: modeInfo.mode,
        requestedMode: modeInfo.requestedMode,
        fallbackMode: modeInfo.fallbackMode,
        fallbackReason: modeInfo.fallbackReason,
        compatibility: modeInfo.compatibility,
        capabilities: modeInfo.capabilities,
        profile: modeInfo.profile,
        guidance,
      }, workspace));
      return;
    }

    console.log(`MODE | ${modeInfo.mode}`);
    if (modeInfo.fallbackReason) {
      console.log(chalk.yellow(`FALLBACK | ${modeInfo.fallbackReason}`));
    }
    if (guidance.note) {
      console.log(chalk.gray(guidance.note));
    }
    if (guidance.recommendedCommand) {
      console.log(chalk.gray(`Next: ${guidance.recommendedCommand}`));
    }
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
