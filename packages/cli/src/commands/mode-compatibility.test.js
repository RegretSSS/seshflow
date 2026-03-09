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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-mode-compat-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

describe('mode compatibility', () => {
  test('mode show falls back safely when config mode is invalid', async () => {
    const { workspacePath, manager } = await createWorkspace();
    manager.createTask({ title: 'Existing task', priority: 'P1' });
    await manager.saveData();

    const storage = new Storage(workspacePath);
    await storage.init();
    const config = await storage.readConfigFile();
    config.mode = 'broken-mode';
    await storage.writeConfigFile(config);

    const modeResult = runCLI(workspacePath, ['mode', 'show']);
    expect(modeResult.status).toBe(0);
    const modePayload = JSON.parse(modeResult.stdout);
    expect(modePayload.mode).toBe('default');
    expect(modePayload.requestedMode).toBe('broken-mode');
    expect(modePayload.fallbackMode).toBe('default');
    expect(modePayload.fallbackReason).toContain('Unsupported workspace mode');
    expect(modePayload.profile.preset).toBe('default');

    const ncfrResult = runCLI(workspacePath, ['ncfr']);
    expect(ncfrResult.status).toBe(0);
    const ncfrPayload = JSON.parse(ncfrResult.stdout);
    expect(ncfrPayload.mode).toBe('default');
    expect(ncfrPayload.workspace.mode).toBe('default');
    expect(ncfrPayload.workspace.requestedMode).toBe('broken-mode');
  });

  test('mode set default keeps scaffold but switches compatibility guidance', async () => {
    const { workspacePath } = await createWorkspace();

    const apiFirstResult = runCLI(workspacePath, ['mode', 'set', 'apifirst']);
    expect(apiFirstResult.status).toBe(0);
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow/contracts/README.md'))).toBe(true);

    const defaultResult = runCLI(workspacePath, ['mode', 'set', 'default']);
    expect(defaultResult.status).toBe(0);
    const payload = JSON.parse(defaultResult.stdout);
    expect(payload.mode).toBe('default');
    expect(payload.guidance.migrationAvailable).toBe(true);
    expect(payload.guidance.recommendedCommand).toBe('seshflow mode set apifirst');
    expect(payload.profile).toEqual(
      expect.objectContaining({
        preset: 'default',
        overrides: {},
      })
    );
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow/contracts/README.md'))).toBe(true);
  });

  test('mode set applies bounded overrides without introducing a custom mode DSL', async () => {
    const { workspacePath } = await createWorkspace();

    const result = runCLI(workspacePath, [
      'mode',
      'set',
      'apifirst',
      '--drift-reminders',
      'off',
      '--context-priority',
      'basic-task'
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.mode).toBe('apifirst');
    expect(payload.profile).toEqual(
      expect.objectContaining({
        preset: 'apifirst',
        overrides: {
          contractDriftReminders: false,
          contextPriorityStrategy: 'basic-task',
        },
      })
    );
    expect(payload.capabilities).toEqual(
      expect.objectContaining({
        contractDriftReminders: false,
        contextPriorityStrategy: 'basic-task',
      })
    );
  });

  test('next and show include resolved workspace mode in json output', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Inspect mode-aware output', priority: 'P0' });
    await manager.saveData();

    const nextResult = runCLI(workspacePath, ['next']);
    expect(nextResult.status).toBe(0);
    const nextPayload = JSON.parse(nextResult.stdout);
    expect(nextPayload.mode).toBe('default');
    expect(nextPayload.workspace.mode).toBe('default');
    expect(nextPayload.task.id).toBe(task.id);

    const showResult = runCLI(workspacePath, ['show', task.id]);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.mode).toBe('default');
    expect(showPayload.workspace.mode).toBe('default');
    expect(showPayload.task.id).toBe(task.id);
  });
});
