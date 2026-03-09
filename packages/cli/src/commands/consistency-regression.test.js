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

function runCLI(workspacePath, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8'
  });
}

describe('consistency regressions', () => {
  test('init creates a local workspace even when an ancestor workspace exists', async () => {
    const parentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-parent-'));
    const childPath = path.join(parentPath, 'nested', 'test-workspace');

    await fs.ensureDir(path.join(parentPath, '.seshflow'));
    await fs.ensureDir(childPath);
    await fs.writeJson(path.join(parentPath, '.seshflow', 'tasks.json'), { tasks: [{ id: 'task_parent', title: 'Parent Task', status: 'todo', priority: 'P1' }] });

    const result = runCLI(childPath, ['init']);
    expect(result.status).toBe(0);
    expect(await fs.pathExists(path.join(childPath, '.seshflow', 'tasks.json'))).toBe(true);
    expect(await fs.pathExists(path.join(parentPath, '.seshflow', 'tasks.json'))).toBe(true);

    const listResult = runCLI(childPath, ['list', '--json']);
    const payload = JSON.parse(listResult.stdout);
    expect(payload.workspace.path).toBe(childPath);
    expect(payload.tasks).toEqual([]);
  });

  test('list json returns all tasks by default and show reports total workspace task count', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-list-'));
    const manager = new TaskManager(workspacePath);
    await manager.init();

    const activeTask = manager.createTask({ title: 'Active', priority: 'P0', status: 'todo' });
    manager.createTask({ title: 'Backlog', priority: 'P1', status: 'backlog' });
    manager.createTask({ title: 'Done', priority: 'P2', status: 'done' });
    await manager.saveData();

    const listResult = runCLI(workspacePath, ['list', '--json']);
    expect(listResult.status).toBe(0);
    const listPayload = JSON.parse(listResult.stdout);
    expect(listPayload.total).toBe(3);
    expect(listPayload.workspace.totalTasks).toBe(3);

    const showResult = runCLI(workspacePath, ['show', activeTask.id, '--json']);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.workspace.totalTasks).toBe(3);
  });

  test('query treats --status all as no status filter', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-query-'));
    const manager = new TaskManager(workspacePath);
    await manager.init();

    manager.createTask({ title: 'Todo', priority: 'P0', status: 'todo' });
    manager.createTask({ title: 'Done', priority: 'P1', status: 'done' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['query', '--status', 'all', '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.totalTasks).toBe(2);
  });
});
