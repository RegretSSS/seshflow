import path from 'node:path';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';
import { probeWorkspaceInitialization } from '../utils/workspace-guard.js';
import {
  formatErrorResponse,
  formatSuccessResponse,
  formatTaskActionJSON,
  formatWorkspaceJSON,
  isJSONMode,
  outputJSON,
} from '../utils/json-output.js';
import { isValidPriority, omitEmptyFields, toISOString, truncate } from '../utils/helpers.js';

function buildIssueDescription({ trigger, actual, expected, impact, source }) {
  const sections = [
    '## Trigger',
    trigger,
    '',
    '## Actual',
    actual,
    '',
    '## Expected',
    expected,
    '',
    '## Impact',
    impact,
    '',
    '## Source',
    `- cwd: ${source.cwd}`,
    `- workspaceState: ${source.workspaceState}`,
  ];

  if (source.workspacePath) {
    sections.push(`- workspacePath: ${source.workspacePath}`);
  }

  if (source.workspaceName) {
    sections.push(`- workspaceName: ${source.workspaceName}`);
  }

  if (source.gitBranch) {
    sections.push(`- gitBranch: ${source.gitBranch}`);
  }

  sections.push(`- reportedAt: ${source.reportedAt}`);
  return sections.join('\n');
}

function normalizeTags(input) {
  if (!input) {
    return [];
  }

  return [...new Set(
    String(input)
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
  )];
}

function ensureRequiredText(value, field) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Missing required field: ${field}`);
  }
  return normalized;
}

async function resolveTargetWorkspace(options = {}) {
  if (options.workspace) {
    const explicitPath = path.resolve(String(options.workspace));
    const probe = probeWorkspaceInitialization(explicitPath);
    if (!probe.initialized) {
      throw new Error(`Target workspace is not initialized: ${explicitPath}`);
    }
    return {
      path: probe.workspacePath,
      reason: 'explicit',
    };
  }

  const globalStorage = new Storage(process.cwd());
  const rememberedTarget = await globalStorage.readIssueTarget();
  if (rememberedTarget?.path) {
    const probe = probeWorkspaceInitialization(rememberedTarget.path);
    if (probe.initialized) {
      return {
        path: probe.workspacePath,
        reason: 'remembered-target',
      };
    }
  }

  const currentProbe = probeWorkspaceInitialization(process.cwd());
  if (currentProbe.initialized) {
    return {
      path: currentProbe.workspacePath,
      reason: 'current-workspace',
    };
  }

  const index = await globalStorage.readWorkspaceIndex();
  const latestWorkspace = [...index.workspaces]
    .sort((left, right) => new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0))
    .find(workspace => workspace?.path);

  if (latestWorkspace?.path) {
    const probe = probeWorkspaceInitialization(latestWorkspace.path);
    if (probe.initialized) {
      return {
        path: probe.workspacePath,
        reason: 'workspace-index',
      };
    }
  }

  throw new Error('No issue target workspace is available. Run `seshflow init` or `seshflow ncfr` in the target workspace first, or pass `--workspace <path>`.');
}

async function collectSourceContext() {
  const probe = probeWorkspaceInitialization(process.cwd());
  const source = {
    cwd: process.cwd(),
    workspaceState: probe.partial ? 'partial' : (probe.initialized ? 'initialized' : 'uninitialized'),
    workspacePath: probe.workspacePath || null,
    workspaceName: probe.workspacePath ? path.basename(probe.workspacePath) : null,
    gitBranch: null,
    reportedAt: toISOString(),
  };

  if (probe.initialized) {
    try {
      const sourceStorage = new Storage(probe.workspacePath);
      const info = await sourceStorage.getWorkspaceInfo();
      source.workspacePath = info.path;
      source.workspaceName = info.name;
      source.gitBranch = info.gitBranch || null;
    } catch {
      // Best effort only. Source context stays lightweight.
    }
  }

  return source;
}

export async function issue(title, options = {}) {
  try {
    const jsonMode = isJSONMode(options);
    const normalizedTitle = ensureRequiredText(title, 'title');
    const trigger = ensureRequiredText(options.trigger, 'trigger');
    const actual = ensureRequiredText(options.actual, 'actual');
    const expected = ensureRequiredText(options.expected, 'expected');
    const impact = ensureRequiredText(options.impact, 'impact');
    const priority = isValidPriority(options.priority) ? options.priority : 'P1';
    const source = await collectSourceContext();
    const target = await resolveTargetWorkspace(options);

    const manager = new TaskManager(target.path);
    await manager.init();

    const tags = [...new Set(['issue', 'feedback', ...normalizeTags(options.tags)])];
    const task = manager.createTask({
      title: normalizedTitle,
      description: buildIssueDescription({ trigger, actual, expected, impact, source }),
      priority,
      tags,
    });

    await manager.saveData();
    await manager.storage.rememberIssueTarget('issue');

    const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
    const response = formatSuccessResponse({
      action: 'issue',
      changed: true,
      task: {
        ...formatTaskActionJSON(task),
        description: truncate(task.description, 240),
      },
      issue: omitEmptyFields({
        requiredFields: {
          trigger,
          actual,
          expected,
          impact,
        },
        targetWorkspace: {
          path: target.path,
          reason: target.reason,
        },
        sourceWorkspace: source,
      }),
    }, workspaceJSON);

    if (jsonMode) {
      outputJSON(response);
      return;
    }

    console.log(`Created issue ${task.id} in ${workspaceJSON.name}`);
    console.log(`Source: ${source.workspaceName || source.cwd}`);
    console.log(`Trigger: ${trigger}`);
  } catch (error) {
    outputJSON(formatErrorResponse(error, 'ISSUE_CREATE_FAILED'));
    process.exit(1);
  }
}
