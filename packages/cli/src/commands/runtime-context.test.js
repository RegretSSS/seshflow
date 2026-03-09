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

async function createWorkspaceWithActiveTask() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-runtime-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();

  const task = manager.createTask({
    title: 'Capture runtime context',
    priority: 'P0',
    status: 'todo'
  });
  manager.startSession(task.id);
  await manager.saveData();

  return { workspacePath, task };
}

function runCLI(workspacePath, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8'
  });
}

describe('runtime context capture', () => {
  test('record command rejects empty runtime entries', async () => {
    const { workspacePath } = await createWorkspaceWithActiveTask();

    const result = runCLI(workspacePath, ['record', '--json']);
    expect(result.status).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Provide at least one runtime detail');
  });

  test('record command persists command, log, output root, and artifacts', async () => {
    const { workspacePath, task } = await createWorkspaceWithActiveTask();

    const recordResult = runCLI(workspacePath, [
      'record',
      '--json',
      '--command', 'pnpm --filter @seshflow/cli test',
      '--cwd', 'packages/cli',
      '--log', '.seshflow/logs/cli-test.log',
      '--output-root', 'packages/cli/coverage',
      '--artifact', 'packages/cli/coverage/lcov.info,packages/cli/coverage/index.html',
      '--note', 'coverage run'
    ]);

    expect(recordResult.status).toBe(0);
    const recordPayload = JSON.parse(recordResult.stdout);
    expect(recordPayload.runtimeEntry.command).toBe('pnpm --filter @seshflow/cli test');
    expect(recordPayload.runtimeEntry.logFile).toBe('.seshflow/logs/cli-test.log');
    expect(recordPayload.runtimeEntry.outputRoot).toBe('packages/cli/coverage');
    expect(recordPayload.runtimeEntry.artifacts).toHaveLength(2);
    expect(recordPayload.runtimeSummary.recordCount).toBe(1);

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const updatedTask = manager.getTask(task.id);
    expect(updatedTask.runtime.runs).toHaveLength(1);
    expect(updatedTask.sessions.at(-1)?.runtimeEntries).toHaveLength(1);
  });

  test('show and next expose a minimal runtime summary for resuming work', async () => {
    const { workspacePath, task } = await createWorkspaceWithActiveTask();

    runCLI(workspacePath, [
      'record',
      '--command', 'pnpm lint',
      '--output-root', 'packages/cli/dist',
      '--artifact', 'packages/cli/dist/report.txt',
      '--compact'
    ]);

    const showResult = runCLI(workspacePath, ['show', task.id, '--json']);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.runtimeSummary.recordCount).toBe(1);
    expect(showPayload.recentRuntime[0].command).toBe('pnpm lint');

    const nextResult = runCLI(workspacePath, ['next', '--json']);
    expect(nextResult.status).toBe(0);
    const nextPayload = JSON.parse(nextResult.stdout);
    expect(nextPayload.runtimeSummary.recordCount).toBe(1);
    expect(nextPayload.runtimeSummary.lastOutputRoot).toBe('packages/cli/dist');
  });
});
