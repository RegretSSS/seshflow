import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../../bin/seshflow.js');

function runCLI(workspacePath, args, extraEnv = {}) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

describe('workspace index', () => {
  test('registers workspaces into a global index and lists them', async () => {
    const seshflowHome = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-home-'));
    const workspaceA = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-workspace-a-'));
    const workspaceB = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-workspace-b-'));
    const previousHome = process.env.SESHFLOW_HOME;
    process.env.SESHFLOW_HOME = seshflowHome;

    try {
      const managerA = new TaskManager(workspaceA);
      await managerA.init();
      const managerB = new TaskManager(workspaceB);
      await managerB.init();

      const listResult = runCLI(workspaceA, ['workspaces', 'list'], { SESHFLOW_HOME: seshflowHome });
      expect(listResult.status).toBe(0);
      const listPayload = JSON.parse(listResult.stdout);
      expect(listPayload.total).toBe(2);
      expect(listPayload.returned).toBe(2);
      expect(listPayload.detailLevel).toBe('summary');
      expect(listPayload.workspaces.map(workspace => workspace.path)).toEqual(
        expect.arrayContaining([workspaceA, workspaceB])
      );
      expect(listPayload.workspaces.find(workspace => workspace.path === workspaceA)?.current).toBe(true);
      expect(listPayload.workspaces[0].tasksFile).toBeUndefined();
      expect(listPayload.summary.byMode.default).toBe(2);

      const fullListResult = runCLI(workspaceA, ['workspaces', 'list', '--full'], { SESHFLOW_HOME: seshflowHome });
      expect(fullListResult.status).toBe(0);
      const fullPayload = JSON.parse(fullListResult.stdout);
      expect(fullPayload.detailLevel).toBe('full');
      expect(fullPayload.workspaces[0].tasksFile).toBeDefined();

      const currentResult = runCLI(workspaceB, ['workspaces', 'current'], { SESHFLOW_HOME: seshflowHome });
      expect(currentResult.status).toBe(0);
      const currentPayload = JSON.parse(currentResult.stdout);
      expect(currentPayload.workspace.path).toBe(workspaceB);
      expect(currentPayload.workspace.indexPath).toBe(path.join(seshflowHome, 'workspaces.json'));

      const indexFile = path.join(seshflowHome, 'workspaces.json');
      expect(await fs.pathExists(indexFile)).toBe(true);
    } finally {
      if (previousHome === undefined) {
        delete process.env.SESHFLOW_HOME;
      } else {
        process.env.SESHFLOW_HOME = previousHome;
      }
    }
  });
});
