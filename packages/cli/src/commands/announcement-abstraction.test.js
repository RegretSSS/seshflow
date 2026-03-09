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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-announce-'));
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

describe('announcement abstraction', () => {
  test('start and done emit persisted announcement runtime events', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Announce me', priority: 'P0', status: 'todo' });
    await manager.saveData();

    const startResult = runCLI(workspacePath, ['start', task.id, '--json']);
    expect(startResult.status).toBe(0);
    const startPayload = JSON.parse(startResult.stdout);
    expect(startPayload.announcementResults).toHaveLength(1);

    const doneResult = runCLI(workspacePath, ['done', task.id, '--json', '--note', 'wrapped']);
    expect(doneResult.status).toBe(0);
    const donePayload = JSON.parse(doneResult.stdout);
    expect(donePayload.announcementResults).toHaveLength(1);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const announcementEvents = reloaded.getRuntimeEvents().filter(event => event.type === 'announcement.execution');
    expect(announcementEvents).toHaveLength(2);
    expect(announcementEvents.map(event => event.status)).toEqual(['announced', 'announced']);
  }, 15000);

  test('announce progress emits structured results and persisted runtime event', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Progress me', priority: 'P1', status: 'todo' });
    manager.startSession(task.id);
    await manager.saveData();

    const result = runCLI(workspacePath, ['announce', 'progress', '--json', '--percent', '55', '--note', 'halfway']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.action).toBe('announce.progress');
    expect(payload.percent).toBe(55);
    expect(Array.isArray(payload.announcementResults)).toBe(true);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const latestEvent = reloaded.getRuntimeEvents().filter(event => event.type === 'announcement.execution').at(-1);
    expect(latestEvent.data.kind).toBe('task_progress');
    expect(latestEvent.data.percent).toBe(55);
  }, 15000);
});
