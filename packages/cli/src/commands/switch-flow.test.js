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

async function createWorkspaceWithTwoTasks() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-switch-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();

  const taskA = manager.createTask({ title: 'Task A', priority: 'P0' });
  const taskB = manager.createTask({ title: 'Task B', priority: 'P0' });
  manager.startSession(taskA.id);
  await manager.saveData();

  return { workspacePath, taskA, taskB };
}

describe('explicit suspend and switch flow', () => {
  test('suspend command ends the current session and returns task to todo', async () => {
    const { workspacePath, taskA } = await createWorkspaceWithTwoTasks();

    const result = spawnSync(process.execPath, [cliEntry, 'suspend', '--compact'], {
      cwd: workspacePath,
      encoding: 'utf8'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('SUSPENDED');

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const updatedTask = manager.getTask(taskA.id);

    expect(updatedTask.status).toBe('todo');
    expect(updatedTask.sessions.at(-1)?.endedAt).toBeTruthy();
    expect(manager.getCurrentTask()).toBeNull();
  });

  test('start --switch suspends the active task before starting the target task', async () => {
    const { workspacePath, taskA, taskB } = await createWorkspaceWithTwoTasks();

    const result = spawnSync(process.execPath, [cliEntry, 'start', taskB.id, '--switch', '--compact'], {
      cwd: workspacePath,
      encoding: 'utf8'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('STARTED');
    expect(result.stdout).toContain('switched=true');

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const suspendedTask = manager.getTask(taskA.id);
    const activeTask = manager.getTask(taskB.id);

    expect(suspendedTask.status).toBe('todo');
    expect(suspendedTask.sessions.at(-1)?.endedAt).toBeTruthy();
    expect(activeTask.status).toBe('in-progress');
    expect(manager.getCurrentTask()?.id).toBe(taskB.id);
  });
});
