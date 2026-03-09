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
    expect(runtimeEvents[0].data).toEqual(
      expect.objectContaining({
        family: 'task-transition',
        surface: 'task',
        phase: 'before',
        trigger: 'task.start',
        schemaVersion: 1,
      })
    );
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
    expect(runtimeEvents.map(event => event.type)).toEqual(['transition.execution', 'hook.execution', 'announcement.execution']);
    const hookEvent = runtimeEvents.find(event => event.type === 'hook.execution');
    expect(hookEvent.level).toBe('warn');
    expect(hookEvent.attempts).toBe(2);
    expect(hookEvent.data).toEqual(
      expect.objectContaining({
        family: 'task-transition',
        surface: 'task',
        phase: 'after',
        trigger: 'task.done',
        schemaVersion: 1,
      })
    );
  }, 15000);

  test('mode change workspace hooks receive workspace-scoped taxonomy and payload envelope', async () => {
    const { workspacePath, manager } = await createWorkspace();
    await manager.storage.writeConfigFile({
      hooks: {
        'mode.changed': [
          { id: 'mode_audit', mode: 'non_blocking', action: 'noop', message: 'mode hook observed' }
        ]
      }
    });

    const result = runCLI(workspacePath, ['mode', 'set', 'apifirst']);
    expect(result.status).toBe(0);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const runtimeEvents = reloaded.getRuntimeEvents();
    const modeChanged = runtimeEvents.find(event => event.type === 'mode.changed');
    expect(modeChanged).toBeTruthy();
    expect(modeChanged.data.hookContext).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        hook: expect.objectContaining({
          name: 'mode.changed',
          family: 'mode',
          surface: 'workspace',
          phase: 'event',
          trigger: 'mode.changed',
        }),
        workspace: expect.objectContaining({
          path: workspacePath,
        }),
        mode: expect.objectContaining({
          current: 'apifirst',
        }),
      })
    );
    expect(modeChanged.data.hookResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hookFamily: 'mode',
          hookSurface: 'workspace',
          hookPhase: 'event',
          trigger: 'mode.changed',
        })
      ])
    );
  }, 15000);
});
