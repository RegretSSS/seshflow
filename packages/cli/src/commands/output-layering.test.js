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

async function createWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-output-layering-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

function runCLI(workspacePath, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8'
  });
}

describe('output layering', () => {
  test('query json is summary by default and full with --full', async () => {
    const { workspacePath, manager } = await createWorkspace();
    manager.createTask({
      title: 'Query Target',
      description: 'Detailed description should not appear in summary mode.',
      priority: 'P0',
      status: 'todo',
      tags: ['cli']
    });
    await manager.saveData();

    const summaryResult = runCLI(workspacePath, ['query', '--json']);
    expect(summaryResult.status).toBe(0);
    const summaryPayload = JSON.parse(summaryResult.stdout);

    expect(summaryPayload.detailLevel).toBe('summary');
    expect(summaryPayload.tasks[0].description).toBeUndefined();
    expect(summaryPayload.tasks[0].subtaskCount).toBe(0);

    const fullResult = runCLI(workspacePath, ['query', '--json', '--full']);
    expect(fullResult.status).toBe(0);
    const fullPayload = JSON.parse(fullResult.stdout);

    expect(fullPayload.detailLevel).toBe('full');
    expect(fullPayload.tasks[0].description).toContain('Detailed description');
  });

  test('ncfr keeps currentTask null when no active session exists', async () => {
    const { workspacePath, manager } = await createWorkspace();
    manager.createTask({ title: 'Ready Task', priority: 'P0', status: 'todo' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['ncfr', '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);

    expect(payload.currentTask).toBeNull();
    expect(payload.nextReadyTask.id).toBeTruthy();
    expect(payload.focus).toBe('next-ready-task');
    expect(payload.project).toBeUndefined();
  });

  test('storage throttles repeated workspace hints within the cooldown window', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-hints-'));
    const storage = new Storage(workspacePath);
    await storage.init();

    const first = await storage.shouldShowHint('query:pretty-hint', 60_000);
    const second = await storage.shouldShowHint('query:pretty-hint', 60_000);

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  test('init quick start points to ncfr and json follow-up flow', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-init-output-'));
    const result = runCLI(workspacePath, ['init']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('seshflow ncfr --json');
    expect(result.stdout).toContain('seshflow next --json');
    expect(result.stdout).not.toContain('CMD alternative');
  });
});
