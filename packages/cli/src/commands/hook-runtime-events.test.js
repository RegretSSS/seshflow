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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-hooks-'));
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

describe('hook registry and runtime event log', () => {
  test('blocking before_start hook stops transition and records failure event', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Blocked by hook', priority: 'P0', status: 'todo' });
    await manager.saveData();
    await manager.storage.writeConfigFile({
      hooks: {
        before_start: [
          { id: 'guard', mode: 'blocking', action: 'fail', message: 'preflight failed', retries: 0 }
        ]
      }
    });

    const result = runCLI(workspacePath, ['start', task.id, '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).error.code).toBe('START_FAILED');

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    expect(reloaded.getTask(task.id).status).toBe('todo');
    expect(reloaded.getTransitionEvents()).toHaveLength(0);
    const runtimeEvents = reloaded.getTaskRuntimeEvents(task.id);
    expect(runtimeEvents).toHaveLength(1);
    expect(runtimeEvents[0].type).toBe('hook.execution');
    expect(runtimeEvents[0].status).toBe('failed');
  }, 15000);

  test('non-blocking after_done hook records warning event without rolling back state', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Warn after done', priority: 'P0', status: 'todo' });
    manager.startSession(task.id);
    await manager.saveData();
    await manager.storage.writeConfigFile({
      hooks: {
        after_done: [
          { id: 'notify', mode: 'non_blocking', action: 'fail', message: 'webhook failed', retries: 1 }
        ]
      }
    });

    const result = runCLI(workspacePath, ['done', task.id, '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.transitionEvent.type).toBe('task.done');

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    expect(reloaded.getTask(task.id).status).toBe('done');
    const runtimeEvents = reloaded.getTaskRuntimeEvents(task.id);
    expect(runtimeEvents.map(event => event.type)).toEqual(['transition.execution', 'hook.execution']);
    expect(runtimeEvents.at(-1).level).toBe('warn');
    expect(runtimeEvents.at(-1).attempts).toBe(2);
  }, 15000);
});
