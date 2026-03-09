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

async function createWorkspaceWithActiveTask() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-proc-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();

  const task = manager.createTask({
    title: 'Track background job',
    priority: 'P0',
    status: 'todo'
  });
  manager.startSession(task.id);
  await manager.saveData();

  return { workspacePath, task };
}

function runCLI(workspacePath, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8'
  });
}

describe('process registry', () => {
  test('process add and process list register and refresh task-scoped processes', async () => {
    const { workspacePath, task } = await createWorkspaceWithActiveTask();

    const addResult = runCLI(workspacePath, [
      'process', 'add',
      '--json',
      '--pid', String(process.pid),
      '--command', 'pnpm dev',
      '--output-root', 'packages/web/.next'
    ]);
    expect(addResult.status).toBe(0);
    const addPayload = JSON.parse(addResult.stdout);
    expect(addPayload.processEntry.pid).toBe(process.pid);
    expect(addPayload.processSummary.recordCount).toBe(1);

    const listResult = runCLI(workspacePath, ['process', 'list', task.id, '--json', '--refresh']);
    expect(listResult.status).toBe(0);
    const listPayload = JSON.parse(listResult.stdout);
    expect(listPayload.processes).toHaveLength(1);
    expect(listPayload.processes[0].state).toBe('running');
    expect(listPayload.processSummary.runningCount).toBe(1);

    const showResult = runCLI(workspacePath, ['show', task.id, '--json']);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.processSummary.recordCount).toBe(1);

    const nextResult = runCLI(workspacePath, ['next', '--json']);
    expect(nextResult.status).toBe(0);
    const nextPayload = JSON.parse(nextResult.stdout);
    expect(nextPayload.processSummary.recordCount).toBe(1);
  }, 15000);

  test('process list marks missing pids after refresh', async () => {
    const { workspacePath, task } = await createWorkspaceWithActiveTask();

    const addResult = runCLI(workspacePath, [
      'process', 'add', task.id,
      '--json',
      '--pid', '999999',
      '--command', 'node orphan.js'
    ]);
    expect(addResult.status).toBe(0);

    const listResult = runCLI(workspacePath, ['process', 'list', task.id, '--json', '--refresh']);
    expect(listResult.status).toBe(0);
    const listPayload = JSON.parse(listResult.stdout);
    expect(listPayload.processes[0].state).toBe('missing');
    expect(listPayload.processSummary.missingCount).toBe(1);
  }, 15000);
});
