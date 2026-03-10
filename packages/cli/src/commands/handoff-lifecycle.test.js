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

async function createLifecycleWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-handoff-lifecycle-'));
  const previousHome = process.env.SESHFLOW_HOME;
  process.env.SESHFLOW_HOME = path.join(workspacePath, '.test-home');

  try {
    const manager = new TaskManager(workspacePath);
    await manager.init();
    const delegatedTask = manager.createTask({
      title: 'Delegated contract implementation',
      priority: 'P0',
      contractIds: ['contract.research.presence-sync'],
      expectedArtifacts: ['dist/presence-bundle.json'],
    });
    const fallbackTask = manager.createTask({
      title: 'Fallback local task',
      priority: 'P1',
    });
    await manager.saveData();

    expect(runGit(workspacePath, ['init']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.email', 'tests@example.com']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.name', 'Seshflow Tests']).status).toBe(0);
    expect(runGit(workspacePath, ['add', '.']).status).toBe(0);
    expect(runGit(workspacePath, ['commit', '-m', 'initial workspace']).status).toBe(0);

    const created = JSON.parse(runCLI(workspacePath, ['handoff', 'create', delegatedTask.id]).stdout);
    return {
      workspacePath,
      delegatedTaskId: delegatedTask.id,
      fallbackTaskId: fallbackTask.id,
      handoffId: created.handoff.handoffId,
      bundlePath: created.bundlePath,
      manifestPath: created.manifestPath,
    };
  } finally {
    if (previousHome === undefined) {
      delete process.env.SESHFLOW_HOME;
    } else {
      process.env.SESHFLOW_HOME = previousHome;
    }
  }
}

describe('handoff lifecycle control', () => {
  test('submit updates handoff lifecycle files without completing the source task', async () => {
    const { workspacePath, delegatedTaskId, handoffId, bundlePath, manifestPath } = await createLifecycleWorkspace();

    const result = runCLI(workspacePath, [
      'handoff',
      'submit',
      handoffId,
      '--result-ref',
      'commit:abc123',
      '--note',
      'ready for parent review',
    ]);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.action).toBe('handoff.submit');
    expect(payload.handoff.status).toBe('submitted');
    expect(payload.handoff.resultRef).toBe('commit:abc123');
    expect(payload.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'EXPECTED_ARTIFACT_MISSING',
          artifactPath: 'dist/presence-bundle.json',
        }),
      ])
    );

    const manifest = await fs.readJson(manifestPath);
    expect(manifest.status).toBe('submitted');
    expect(manifest.resultRef).toBe('commit:abc123');

    const bundle = await fs.readJson(bundlePath);
    expect(bundle.status).toBe('submitted');
    expect(bundle.resultRef).toBe('commit:abc123');

    const manager = new TaskManager(workspacePath);
    await manager.init();
    expect(manager.getTask(delegatedTaskId).status).toBe('backlog');
    expect(manager.getActiveHandoffForTask(delegatedTaskId)?.status).toBe('submitted');
  });

  test('reclaim releases delegation so next can recommend the task again', async () => {
    const { workspacePath, delegatedTaskId, fallbackTaskId, handoffId } = await createLifecycleWorkspace();

    const before = JSON.parse(runCLI(workspacePath, ['next']).stdout);
    expect(before.task.id).toBe(fallbackTaskId);

    const reclaim = runCLI(workspacePath, ['handoff', 'reclaim', handoffId, '--note', 'parent resumes locally']);
    expect(reclaim.status).toBe(0);

    const reclaimPayload = JSON.parse(reclaim.stdout);
    expect(reclaimPayload.handoff.status).toBe('reclaimed');

    const after = JSON.parse(runCLI(workspacePath, ['next']).stdout);
    expect(after.task.id).toBe(delegatedTaskId);
  });

  test('close only finalizes handoff lifecycle and does not mark task done', async () => {
    const { workspacePath, delegatedTaskId, handoffId } = await createLifecycleWorkspace();

    expect(runCLI(workspacePath, ['handoff', 'submit', handoffId]).status).toBe(0);
    const close = runCLI(workspacePath, ['handoff', 'close', handoffId, '--note', 'review finished']);
    expect(close.status).toBe(0);

    const payload = JSON.parse(close.stdout);
    expect(payload.handoff.status).toBe('closed');
    expect(payload.handoff.closedAt).toBeTruthy();

    const manager = new TaskManager(workspacePath);
    await manager.init();
    expect(manager.getTask(delegatedTaskId).status).toBe('backlog');
    expect(manager.getActiveHandoffForTask(delegatedTaskId)).toBeNull();
    expect(manager.getHandoff(handoffId).status).toBe('closed');
  });
});
