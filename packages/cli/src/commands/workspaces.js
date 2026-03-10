import fs from 'fs-extra';
import chalk from 'chalk';
import { Storage } from '../core/storage.js';
import { ACTIVE_HANDOFF_STATUSES } from '../../../shared/constants/handoffs.js';
import { formatErrorResponse, formatSuccessResponse, outputJSON } from '../utils/json-output.js';

function normalizeRecentOption(value, fallback = 20) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function summarizeWorkspace(workspace, currentPath) {
  return {
    path: workspace.path,
    name: workspace.name,
    mode: workspace.mode,
    gitBranch: workspace.gitBranch || '',
    lastSeenAt: workspace.lastSeenAt,
    current: workspace.path === currentPath,
  };
}

async function readDelegationSummary(workspace) {
  if (!workspace?.tasksFile || !(await fs.pathExists(workspace.tasksFile))) {
    return null;
  }

  try {
    const raw = await fs.readJson(workspace.tasksFile);
    const handoffs = Array.isArray(raw?.handoffs) ? raw.handoffs : [];
    const activeHandoffs = handoffs
      .filter(handoff => ACTIVE_HANDOFF_STATUSES.includes(handoff.status))
      .sort((left, right) => new Date(right.activatedAt || right.createdAt || 0) - new Date(left.activatedAt || left.createdAt || 0));

    return {
      activeHandoffCount: activeHandoffs.length,
      delegatedTaskCount: new Set(activeHandoffs.map(handoff => handoff.sourceTaskId).filter(Boolean)).size,
      latestHandoff: activeHandoffs[0]
        ? {
            handoffId: activeHandoffs[0].handoffId,
            sourceTaskId: activeHandoffs[0].sourceTaskId,
            status: activeHandoffs[0].status,
            targetBranchName: activeHandoffs[0].targetBranchName || '',
            activatedAt: activeHandoffs[0].activatedAt || activeHandoffs[0].createdAt || null,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function listWorkspaces(options = {}) {
  try {
    const storage = new Storage();
    await storage.init();
    const index = await storage.readWorkspaceIndex();
    const currentPath = storage.getWorkspacePath();
    const recent = normalizeRecentOption(options.recent, 20);
    const sorted = [...index.workspaces].sort((left, right) =>
      new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0)
    );
    const limited = options.full ? sorted : sorted.slice(0, recent);
    const workspaces = [];
    for (const workspace of limited) {
      const delegation = await readDelegationSummary(workspace);
      workspaces.push(
        options.full
          ? {
              ...workspace,
              current: workspace.path === currentPath,
              delegation: delegation || undefined,
            }
          : {
              ...summarizeWorkspace(workspace, currentPath),
              delegation: delegation || undefined,
            }
      );
    }
    const byMode = index.workspaces.reduce((result, workspace) => {
      const mode = workspace.mode || 'default';
      result[mode] = (result[mode] || 0) + 1;
      return result;
    }, {});

    outputJSON(formatSuccessResponse({
      action: 'workspaces.list',
      detailLevel: options.full ? 'full' : 'summary',
      workspaces,
      total: index.workspaces.length,
      returned: workspaces.length,
      summary: {
        total: index.workspaces.length,
        returned: workspaces.length,
        truncated: index.workspaces.length > workspaces.length,
        recentLimit: options.full ? null : recent,
        byMode,
      },
      currentPath,
      indexPath: storage.getWorkspaceIndexFilePath(),
    }));
  } catch (error) {
    outputJSON(formatErrorResponse(error, 'WORKSPACES_LIST_FAILED'));
    process.exit(1);
  }
}

export async function showCurrentWorkspace() {
  try {
    const storage = new Storage();
    await storage.init();
    const info = await storage.getWorkspaceInfo();
    const config = await storage.readConfigFile();
    const delegation = await readDelegationSummary({
      tasksFile: storage.tasksFile,
    });
    outputJSON(formatSuccessResponse({
      action: 'workspaces.current',
      workspace: {
        ...info,
        mode: config.mode || 'default',
        indexPath: storage.getWorkspaceIndexFilePath(),
        delegation: delegation || undefined,
      },
    }));
  } catch (error) {
    outputJSON(formatErrorResponse(error, 'WORKSPACES_CURRENT_FAILED'));
    process.exit(1);
  }
}

export function printWorkspaceList(workspaces = []) {
  if (workspaces.length === 0) {
    console.log(chalk.gray('NO_WORKSPACES'));
    return;
  }

  workspaces.forEach(workspace => {
    console.log(`WORKSPACE | ${workspace.current ? '*' : ' '} | ${workspace.name} | ${workspace.mode} | ${workspace.path}`);
  });
}
