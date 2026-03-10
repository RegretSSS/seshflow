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

async function createWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-transition-'));
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

describe('task transition service', () => {
  test('start and done persist shared transition events', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Transition me', priority: 'P0', status: 'todo' });
    await manager.saveData();

    const startResult = runCLI(workspacePath, ['start', task.id, '--json']);
    expect(startResult.status).toBe(0);
    const startPayload = JSON.parse(startResult.stdout);
    expect(startPayload.transitionEvent.type).toBe('task.start');

    const doneResult = runCLI(workspacePath, ['done', task.id, '--json', '--note', 'finished']);
    expect(doneResult.status).toBe(0);
    const donePayload = JSON.parse(doneResult.stdout);
    expect(donePayload.transitionEvent.type).toBe('task.done');

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const events = reloaded.getTransitionEvents();
    expect(events.map(event => event.type)).toEqual(['task.start', 'task.done']);
  }, 15000);

  test('suspend and skip persist transition events', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Pause me', priority: 'P0', status: 'todo' });
    manager.startSession(task.id);
    await manager.saveData();

    const suspendResult = runCLI(workspacePath, ['suspend', '--json', '--reason', 'context switch']);
    expect(suspendResult.status).toBe(0);
    expect(JSON.parse(suspendResult.stdout).transitionEvent.type).toBe('task.suspend');

    const restartResult = runCLI(workspacePath, ['start', task.id, '--json']);
    expect(restartResult.status).toBe(0);

    const skipResult = runCLI(workspacePath, ['skip', '--json', '--reason', 'reordered']);
    expect(skipResult.status).toBe(0);
    expect(JSON.parse(skipResult.stdout).transitionEvent.type).toBe('task.skip');

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const eventTypes = reloaded.getTransitionEvents().map(event => event.type);
    expect(eventTypes).toEqual(['task.suspend', 'task.start', 'task.skip']);
  }, 15000);

  test('starting the already active task is a structured no-op without duplicate transition events', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Already active', priority: 'P0', status: 'todo' });
    manager.startSession(task.id);
    await manager.saveData();

    const result = runCLI(workspacePath, ['start', task.id, '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.changed).toBe(false);
    expect(payload.transitionEvent).toBeUndefined();

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    expect(reloaded.getTransitionEvents()).toHaveLength(0);
  });
});
