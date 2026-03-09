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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-deps-'));
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

describe('dependency mutation commands', () => {
  test('add-dep --json adds a dependency and returns derived blockers', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const base = manager.createTask({ title: 'Base', priority: 'P0', status: 'todo' });
    const dependent = manager.createTask({ title: 'Dependent', priority: 'P1', status: 'todo' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['add-dep', dependent.id, base.id, '--json']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.changed).toBe(true);
    expect(payload.task.id).toBe(dependent.id);
    expect(payload.task.dependencies).toBeUndefined();
    expect(payload.blockedBy).toEqual([base.id]);

    const reloadedManager = new TaskManager(workspacePath);
    await reloadedManager.init();
    expect(reloadedManager.getTask(dependent.id).dependencies).toEqual([base.id]);
  });

  test('add-dep rejects self-dependency and cycles with structured errors', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const taskA = manager.createTask({ title: 'Task A', priority: 'P0', status: 'todo' });
    const taskB = manager.createTask({ title: 'Task B', priority: 'P1', status: 'todo', dependencies: [taskA.id] });
    await manager.saveData();

    const selfResult = runCLI(workspacePath, ['add-dep', taskA.id, taskA.id, '--json']);
    expect(selfResult.status).toBe(1);
    expect(JSON.parse(selfResult.stdout).error.code).toBe('SELF_DEPENDENCY');

    const cycleResult = runCLI(workspacePath, ['add-dep', taskA.id, taskB.id, '--json']);
    expect(cycleResult.status).toBe(1);
    expect(JSON.parse(cycleResult.stdout).error.code).toBe('DEPENDENCY_CYCLE');
  });

  test('remove-dep and edit --add-dep/--remove-dep mutate dependencies through the same rules', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const base = manager.createTask({ title: 'Base', priority: 'P0', status: 'todo' });
    const dependent = manager.createTask({ title: 'Dependent', priority: 'P1', status: 'todo' });
    await manager.saveData();

    const editAdd = runCLI(workspacePath, ['edit', dependent.id, '--add-dep', base.id, '--json']);
    expect(editAdd.status).toBe(0);

    const removeResult = runCLI(workspacePath, ['remove-dep', dependent.id, base.id, '--json']);
    expect(removeResult.status).toBe(0);
    const removePayload = JSON.parse(removeResult.stdout);
    expect(removePayload.changed).toBe(true);
    expect(removePayload.blockedBy).toEqual([]);

    const editRemoveNoop = runCLI(workspacePath, ['edit', dependent.id, '--remove-dep', base.id, '--json']);
    expect(editRemoveNoop.status).toBe(0);
  });
});
