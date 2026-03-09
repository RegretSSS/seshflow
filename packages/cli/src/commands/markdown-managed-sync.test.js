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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-md-sync-'));
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

describe('managed markdown planning sync', () => {
  test('export emits stable ids and import --update preserves task identity and dependencies', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const foundation = manager.createTask({ id: 'task_foundation', title: 'Foundation', priority: 'P0', status: 'todo' });
    manager.createTask({
      id: 'task_delivery',
      title: 'Delivery',
      priority: 'P1',
      status: 'backlog',
      dependencies: [foundation.id]
    });
    await manager.saveData();

    const markdownPath = path.join(workspacePath, 'plan.md');
    const exportResult = runCLI(workspacePath, ['export', markdownPath, '--md']);
    expect(exportResult.status).toBe(0);

    const exported = await fs.readFile(markdownPath, 'utf8');
    expect(exported).toContain('[id:task_foundation]');
    expect(exported).toContain('[dependency:task_foundation]');

    const revised = exported
      .replace('Foundation', 'Foundation revised')
      .replace('Delivery', 'Delivery revised');
    await fs.writeFile(markdownPath, revised, 'utf8');

    const importResult = runCLI(workspacePath, ['import', 'plan.md', '--update']);
    expect(importResult.status).toBe(0);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    expect(reloaded.getTasks()).toHaveLength(2);
    expect(reloaded.getTask('task_foundation').title).toBe('Foundation revised');
    expect(reloaded.getTask('task_delivery').title).toBe('Delivery revised');
    expect(reloaded.getTask('task_delivery').dependencies).toEqual(['task_foundation']);
  }, 15000);

  test('planning updates do not overwrite runtime execution state', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({
      id: 'task_resume',
      title: 'Resume work',
      priority: 'P0',
      status: 'todo'
    });
    manager.startSession(task.id);
    manager.recordRuntime(task.id, {
      command: 'pnpm test',
      outputRoot: 'packages/cli/coverage',
      artifacts: ['packages/cli/coverage/lcov.info']
    });
    await manager.saveData();

    const markdownPath = path.join(workspacePath, 'plan.md');
    const exportResult = runCLI(workspacePath, ['export', markdownPath, '--md']);
    expect(exportResult.status).toBe(0);

    const exported = await fs.readFile(markdownPath, 'utf8');
    await fs.writeFile(markdownPath, exported.replace('Resume work', 'Resume work with docs'), 'utf8');

    const importResult = runCLI(workspacePath, ['import', 'plan.md', '--update']);
    expect(importResult.status).toBe(0);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const updatedTask = reloaded.getTask(task.id);
    expect(updatedTask.title).toBe('Resume work with docs');
    expect(updatedTask.status).toBe('in-progress');
    expect(updatedTask.sessions).toHaveLength(1);
    expect(updatedTask.runtime.runs).toHaveLength(1);
  }, 15000);
});
