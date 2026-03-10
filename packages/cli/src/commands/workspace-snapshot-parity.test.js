import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';
import { buildWorkspaceSnapshot } from '../../../shared/workspace-snapshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../../bin/seshflow.js');

async function createWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-web-parity-'));
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

describe('workspace snapshot parity', () => {
  test('shared workspace snapshot matches CLI summaries for the active task', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({
      title: 'Parity task',
      priority: 'P0',
      status: 'todo',
      description: 'Validate shared snapshot parity.',
    });
    manager.startSession(task.id);
    manager.recordRuntime(task.id, {
      command: 'pnpm --filter @seshflow/web build',
      cwd: 'packages/web',
      outputRoot: 'packages/web/dist',
      artifacts: ['packages/web/dist/index.html'],
      note: 'web parity run',
    });
    manager.registerProcess(task.id, {
      pid: process.pid,
      command: 'vite dev',
      cwd: 'packages/web',
      outputRoot: 'packages/web/dist',
    });
    await manager.saveData();

    const showResult = runCLI(workspacePath, ['show', task.id, '--json']);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);

    const nextResult = runCLI(workspacePath, ['next', '--json']);
    expect(nextResult.status).toBe(0);
    const nextPayload = JSON.parse(nextResult.stdout);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const snapshot = buildWorkspaceSnapshot(reloaded.data);
    const snapshotTask = snapshot.currentTask;

    expect(snapshotTask.id).toBe(task.id);
    expect(snapshotTask.runtimeSummary).toEqual(showPayload.runtimeSummary);
    expect(snapshotTask.processSummary).toEqual(showPayload.processSummary);
    expect(snapshotTask.runtimeEventSummary).toEqual(showPayload.runtimeEventSummary);
    expect(nextPayload.runtimeSummary).toEqual(
      expect.objectContaining({
        recordCount: snapshot.currentTask.runtimeSummary.recordCount,
        lastRecordedAt: snapshot.currentTask.runtimeSummary.lastRecordedAt,
        lastCommand: snapshot.currentTask.runtimeSummary.lastCommand,
        lastOutputRoot: snapshot.currentTask.runtimeSummary.lastOutputRoot,
        lastArtifacts: snapshot.currentTask.runtimeSummary.lastArtifacts,
      })
    );
    expect(nextPayload.runtimeSummary.lastLogFile).toBeUndefined();
    expect(nextPayload.processSummary).toEqual(snapshot.currentTask.processSummary);
  }, 15000);
});
