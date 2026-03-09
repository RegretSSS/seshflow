import chalk from 'chalk';
import { Storage } from '../core/storage.js';
import { formatErrorResponse, formatSuccessResponse, outputJSON } from '../utils/json-output.js';

export async function listWorkspaces() {
  try {
    const storage = new Storage();
    await storage.init();
    const index = await storage.readWorkspaceIndex();
    const currentPath = storage.getWorkspacePath();
    const workspaces = index.workspaces.map(workspace => ({
      ...workspace,
      current: workspace.path === currentPath,
    }));

    outputJSON(formatSuccessResponse({
      action: 'workspaces.list',
      workspaces,
      total: workspaces.length,
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
