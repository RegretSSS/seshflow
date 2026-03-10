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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-state-json-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

describe('state command JSON output', () => {
  test('start --json returns structured transition data', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Start JSON task', priority: 'P0' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['start', task.id, '--json']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(true);
    expect(payload.action).toBe('start');
    expect(payload.changed).toBe(true);
    expect(payload.task.id).toBe(task.id);
    expect(payload.task.description).toBeUndefined();
    expect(payload.runtimeSummary).toBeUndefined();
    expect(payload.hasActiveSession).toBe(true);
    expect(payload.workspace.totalTasks).toBe(1);
    expect(payload.workspace.sourcePath).toBeUndefined();
  });

  test('start --json surfaces session conflict as structured error', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const taskA = manager.createTask({ title: 'Task A', priority: 'P0' });
    const taskB = manager.createTask({ title: 'Task B', priority: 'P0' });
    manager.startSession(taskA.id);
    await manager.saveData();

    const result = runCLI(workspacePath, ['start', taskB.id, '--json']);
    expect(result.status).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('SESSION_CONFLICT');
  });

  test('suspend and skip --json return structured no-op and transition responses', async () => {
    const { workspacePath, manager } = await createWorkspace();

    const noSessionSuspend = runCLI(workspacePath, ['suspend', '--json']);
    expect(noSessionSuspend.status).toBe(0);
    const noSessionPayload = JSON.parse(noSessionSuspend.stdout);
    expect(noSessionPayload.changed).toBe(false);
    expect(noSessionPayload.action).toBe('suspend');

    const task = manager.createTask({ title: 'Skip me', priority: 'P0' });
    manager.startSession(task.id);
    await manager.saveData();

    const skipResult = runCLI(workspacePath, ['skip', '--json', '--reason', 'Reordered']);
    expect(skipResult.status).toBe(0);
    const skipPayload = JSON.parse(skipResult.stdout);
    expect(skipPayload.action).toBe('skip');
    expect(skipPayload.changed).toBe(true);
    expect(skipPayload.reason).toBe('Reordered');
    expect(skipPayload.task.id).toBe(task.id);
  });

  test('done and complete --json expose progress and unlocked tasks', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const taskA = manager.createTask({ title: 'Base Task', priority: 'P0' });
    const taskB = manager.createTask({ title: 'Unlocked Task', priority: 'P1', dependencies: [taskA.id] });
    manager.startSession(taskA.id);
    await manager.saveData();

    const doneResult = runCLI(workspacePath, ['done', '--json', '--note', 'Finished base']);
    expect(doneResult.status).toBe(0);
    const donePayload = JSON.parse(doneResult.stdout);
    expect(donePayload.action).toBe('done');
    expect(donePayload.changed).toBe(true);
    expect(donePayload.progress.before.done).toBe(0);
    expect(donePayload.progress.after.done).toBe(1);
    expect(donePayload.unlockedTasks.map(task => task.id)).toContain(taskB.id);
    expect(donePayload.task.description).toBeUndefined();
    expect(donePayload.workspace.sourcePath).toBeUndefined();

    const completeResult = runCLI(workspacePath, ['complete', taskB.id, '--json']);
    expect(completeResult.status).toBe(0);
    const completePayload = JSON.parse(completeResult.stdout);
    expect(completePayload.action).toBe('done');
    expect(completePayload.task.id).toBe(taskB.id);
  });

  test('done --json warns when expected artifacts are missing', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({
      title: 'Artifact gated task',
      priority: 'P0',
      expectedArtifacts: ['dist/app.tar.gz'],
    });
    manager.startSession(task.id);
    await manager.saveData();

    const result = runCLI(workspacePath, ['done', '--json']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.action).toBe('done');
    expect(payload.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'EXPECTED_ARTIFACT_MISSING',
          artifactPath: 'dist/app.tar.gz',
        }),
      ])
    );
  });
});
