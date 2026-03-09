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

async function createWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-default-json-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

describe('default json mode', () => {
  test('add, list, show, and delete default to json without --json', async () => {
    const { workspacePath } = await createWorkspace();

    const addResult = runCLI(workspacePath, ['add', 'Default JSON task']);
    expect(addResult.status).toBe(0);
    const addPayload = JSON.parse(addResult.stdout);
    expect(addPayload.success).toBe(true);
    expect(addPayload.action).toBe('add');

    const taskId = addPayload.task.id;

    const listResult = runCLI(workspacePath, ['list']);
    expect(listResult.status).toBe(0);
    const listPayload = JSON.parse(listResult.stdout);
    expect(listPayload.tasks[0].id).toBe(taskId);

    const showResult = runCLI(workspacePath, ['show', taskId]);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.task.id).toBe(taskId);

    const deleteResult = runCLI(workspacePath, ['delete', taskId, '--force']);
    expect(deleteResult.status).toBe(0);
    const deletePayload = JSON.parse(deleteResult.stdout);
    expect(deletePayload.action).toBe('delete');
    expect(deletePayload.taskId).toBe(taskId);
  });

  test('pretty output explicitly disables default json mode', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Human readable task', priority: 'P1' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['show', task.id, '--pretty']);
    expect(result.status).toBe(0);
    expect(() => JSON.parse(result.stdout)).toThrow();
    expect(result.stdout).toContain('Human readable task');
  });

  test('export defaults to json and --md switches back to markdown', async () => {
    const { workspacePath, manager } = await createWorkspace();
    manager.createTask({ title: 'Export me', priority: 'P2' });
    await manager.saveData();

    const jsonPath = path.join(workspacePath, 'tasks-export.json');
    const jsonResult = runCLI(workspacePath, ['export', jsonPath]);
    expect(jsonResult.status).toBe(0);
    const jsonPayload = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    expect(Array.isArray(jsonPayload)).toBe(true);
    expect(jsonPayload[0].title).toBe('Export me');

    const mdPath = path.join(workspacePath, 'tasks-export.md');
    const mdResult = runCLI(workspacePath, ['export', mdPath, '--md']);
    expect(mdResult.status).toBe(0);
    const markdown = await fs.readFile(mdPath, 'utf8');
    expect(markdown).toContain('# Exported Tasks');
    expect(markdown).toContain('Export me');
  });
});
