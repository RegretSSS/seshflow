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
  const seshflowHome = path.join(workspacePath, '.test-home');
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8',
    env: {
      ...process.env,
      SESHFLOW_HOME: seshflowHome,
    },
  });
}

function runGit(workspacePath, args) {
  return spawnSync('git', args, {
    cwd: workspacePath,
    encoding: 'utf8',
  });
}

async function createInspectionWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-handoff-inspect-'));
  const previousHome = process.env.SESHFLOW_HOME;
  process.env.SESHFLOW_HOME = path.join(workspacePath, '.test-home');

  try {
    const manager = new TaskManager(workspacePath);
    await manager.init();
    const task = manager.createTask({
      title: 'Inspect delegated task',
      priority: 'P0',
      contractIds: ['contract.workspace.sync'],
    });
    await manager.saveData();

    expect(runGit(workspacePath, ['init']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.email', 'tests@example.com']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.name', 'Seshflow Tests']).status).toBe(0);
    expect(runGit(workspacePath, ['add', '.']).status).toBe(0);
    expect(runGit(workspacePath, ['commit', '-m', 'initial workspace']).status).toBe(0);

    const created = JSON.parse(runCLI(workspacePath, ['handoff', 'create', task.id]).stdout);
    return {
      workspacePath,
      taskId: task.id,
      handoffId: created.handoff.handoffId,
      manifestPath: created.manifestPath,
      bundlePath: created.bundlePath,
    };
  } finally {
    if (previousHome === undefined) {
      delete process.env.SESHFLOW_HOME;
    } else {
      process.env.SESHFLOW_HOME = previousHome;
    }
  }
}

describe('handoff inspection surfaces', () => {
  test('handoff list returns summary inspection rows', async () => {
    const { workspacePath, taskId, handoffId } = await createInspectionWorkspace();

    const result = runCLI(workspacePath, ['handoff', 'list']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.action).toBe('handoff.list');
    expect(payload.handoffs).toHaveLength(1);
    expect(payload.handoffs[0].handoffId).toBe(handoffId);
    expect(payload.handoffs[0].sourceTask.id).toBe(taskId);
    expect(payload.handoffs[0].bundleSummary.taskId).toBe(taskId);
  });

  test('handoff show returns summary by default and raw files in full mode', async () => {
    const { workspacePath, handoffId, manifestPath, bundlePath } = await createInspectionWorkspace();

    const summary = runCLI(workspacePath, ['handoff', 'show', handoffId]);
    expect(summary.status).toBe(0);
    const summaryPayload = JSON.parse(summary.stdout);
    expect(summaryPayload.action).toBe('handoff.show');
    expect(summaryPayload.handoff.handoffId).toBe(handoffId);
    expect(summaryPayload.target.manifestPath).toBe(manifestPath);
    expect(summaryPayload.manifest).toBeUndefined();
    expect(summaryPayload.bundle).toBeUndefined();

    const full = runCLI(workspacePath, ['handoff', 'show', handoffId, '--full']);
    expect(full.status).toBe(0);
    const fullPayload = JSON.parse(full.stdout);
    expect(fullPayload.manifest.handoffId).toBe(handoffId);
    expect(fullPayload.bundle.handoffId).toBe(handoffId);
    expect(fullPayload.target.bundlePath).toBe(bundlePath);
  });

  test('handoff show exposes cleanup guidance after a handoff is closed', async () => {
    const { workspacePath, handoffId } = await createInspectionWorkspace();

    expect(runCLI(workspacePath, ['handoff', 'submit', handoffId]).status).toBe(0);
    expect(runCLI(workspacePath, ['handoff', 'close', handoffId]).status).toBe(0);

    const summary = runCLI(workspacePath, ['handoff', 'show', handoffId]);
    expect(summary.status).toBe(0);
    const payload = JSON.parse(summary.stdout);
    expect(payload.cleanupGuidance.suggestedCommand).toMatch(/git worktree remove/i);
    expect(payload.cleanupGuidance.when).toMatch(/reviewing|merging|discarding/i);
  });
});
