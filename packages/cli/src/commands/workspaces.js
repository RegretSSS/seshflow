import chalk from 'chalk';
import { Storage } from '../core/storage.js';
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
    const workspaces = limited.map(workspace =>
      options.full
        ? {
            ...workspace,
            current: workspace.path === currentPath,
          }
        : summarizeWorkspace(workspace, currentPath)
    );
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
    outputJSON(formatSuccessResponse({
      action: 'workspaces.current',
      workspace: {
        ...info,
        mode: config.mode || 'default',
        indexPath: storage.getWorkspaceIndexFilePath(),
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
