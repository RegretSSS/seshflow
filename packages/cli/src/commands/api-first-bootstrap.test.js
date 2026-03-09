import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../../bin/seshflow.js');

function runCLI(workspacePath, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8'
  });
}

async function createWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-apifirst-'));
  return { workspacePath };
}

describe('api-first bootstrap', () => {
  test('init apifirst writes mode config and bootstrap files', async () => {
    const { workspacePath } = await createWorkspace();

    const result = runCLI(workspacePath, ['init', 'apifirst', '--force']);
    expect(result.status).toBe(0);

    const storage = new Storage(workspacePath);
    const config = await storage.readConfigFile();
    expect(config.mode).toBe('apifirst');
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow/contracts/README.md'))).toBe(true);
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow/contracts/contract.user-service.create-user.json'))).toBe(true);
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow/contracts/contract.board-service.move-card.json'))).toBe(true);
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow/plans/api-planning.md'))).toBe(true);
  });

  test('mode set apifirst migrates an existing default workspace without losing tasks', async () => {
    const { workspacePath } = await createWorkspace();
    const manager = new TaskManager(workspacePath);
    await manager.init();
    const task = manager.createTask({ title: 'Existing task', priority: 'P0' });
    await manager.saveData();

    const modeResult = runCLI(workspacePath, ['mode', 'set', 'apifirst']);
    expect(modeResult.status).toBe(0);

    const storage = new Storage(workspacePath);
    const config = await storage.readConfigFile();
    expect(config.mode).toBe('apifirst');
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow/contracts/README.md'))).toBe(true);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    expect(reloaded.getTask(task.id)?.title).toBe('Existing task');

    const showModeResult = runCLI(workspacePath, ['mode', 'show']);
    expect(showModeResult.status).toBe(0);
    expect(JSON.parse(showModeResult.stdout).mode).toBe('apifirst');
  });
});
