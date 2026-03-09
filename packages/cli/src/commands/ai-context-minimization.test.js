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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-ai-context-'));
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

describe('AI context minimization', () => {
  test('show derives blockers from live dependency state', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const dependency = manager.createTask({ title: 'Dependency', priority: 'P0', status: 'todo' });
    const target = manager.createTask({
      title: 'Target',
      priority: 'P0',
      status: 'todo',
      dependencies: [dependency.id]
    });
    await manager.saveData();

    await manager.completeTask(dependency.id);
    await manager.saveData();

    const result = runCLI(workspacePath, ['show', target.id, '--json']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.blockedBy).toEqual([]);
  });

  test('next json returns minimal workspace by default', async () => {
    const { workspacePath, manager } = await createWorkspace();
    manager.createTask({ title: 'Ready Task', priority: 'P0', status: 'todo' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['next', '--json']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.workspace.path).toBe(workspacePath);
    expect(payload.workspace.source).toBeTruthy();
    expect(payload.workspace.tasksFile).toBeUndefined();
    expect(payload.workspace.configPath).toBeUndefined();
    expect(payload.workspace.requestedPath).toBeUndefined();
  });

  test('ncfr json is minimal by default and expands only with --full', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const doneTask = manager.createTask({ title: 'Done Task', priority: 'P1', status: 'done' });
    const currentTask = manager.createTask({ title: 'Current Task', priority: 'P0', status: 'todo' });
    const dependentTask = manager.createTask({
      title: 'Dependent Task',
      priority: 'P1',
      status: 'todo',
      dependencies: [currentTask.id]
    });
    await manager.saveData();
    manager.startSession(currentTask.id);
    await manager.saveData();
    await manager.completeTask(doneTask.id);
    await manager.saveData();

    const minimalResult = runCLI(workspacePath, ['ncfr', '--json']);
    expect(minimalResult.status).toBe(0);
    const minimalPayload = JSON.parse(minimalResult.stdout);

    expect(minimalPayload.project).toBeUndefined();
    expect(minimalPayload.focus).toBe('current-task');
    expect(minimalPayload.dependents).toBeUndefined();
    expect(minimalPayload.blockedTasks).toBeUndefined();
    expect(minimalPayload.recentlyCompleted).toBeUndefined();
    expect(minimalPayload.keyFiles).toBeUndefined();
    expect(minimalPayload.workspace.tasksFile).toBeUndefined();

    const fullResult = runCLI(workspacePath, ['ncfr', '--json', '--full']);
    expect(fullResult.status).toBe(0);
    const fullPayload = JSON.parse(fullResult.stdout);

    expect(fullPayload.dependents).toBeDefined();
    expect(fullPayload.blockedTasks).toBeDefined();
    expect(fullPayload.recentlyCompleted).toBeDefined();
    expect(fullPayload.workspace.tasksFile).toBeTruthy();
    expect(fullPayload.workspace.configPath).toBeTruthy();
    expect(fullPayload.dependents.map(task => task.id)).toContain(dependentTask.id);
  });
});
