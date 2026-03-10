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

async function createDelegatedWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-delegation-'));
  const previousHome = process.env.SESHFLOW_HOME;
  process.env.SESHFLOW_HOME = path.join(workspacePath, '.test-home');

  try {
    const manager = new TaskManager(workspacePath);
    await manager.init();
    const delegatedTask = manager.createTask({
      title: 'Delegated API task',
      priority: 'P0',
    });
    const localTask = manager.createTask({
      title: 'Local follow-up task',
      priority: 'P1',
    });
    await manager.saveData();

    expect(runGit(workspacePath, ['init']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.email', 'tests@example.com']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.name', 'Seshflow Tests']).status).toBe(0);
    expect(runGit(workspacePath, ['add', '.']).status).toBe(0);
    expect(runGit(workspacePath, ['commit', '-m', 'initial workspace']).status).toBe(0);

    const handoffResult = runCLI(workspacePath, ['handoff', 'create', delegatedTask.id]);
    expect(handoffResult.status).toBe(0);

    return {
      workspacePath,
      delegatedTaskId: delegatedTask.id,
      localTaskId: localTask.id,
    };
  } finally {
    if (previousHome === undefined) {
      delete process.env.SESHFLOW_HOME;
    } else {
      process.env.SESHFLOW_HOME = previousHome;
    }
  }
}

describe('delegation registry surfaces', () => {
  test('next skips delegated tasks and returns local ready work', async () => {
    const { workspacePath, delegatedTaskId, localTaskId } = await createDelegatedWorkspace();

    const result = runCLI(workspacePath, ['next']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.task.id).toBe(localTaskId);
    expect(payload.task.id).not.toBe(delegatedTaskId);
  });

  test('show exposes active delegation summary for delegated tasks', async () => {
    const { workspacePath, delegatedTaskId } = await createDelegatedWorkspace();

    const result = runCLI(workspacePath, ['show', delegatedTaskId]);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.task.id).toBe(delegatedTaskId);
    expect(payload.delegation.handoffId).toMatch(/^handoff_/);
    expect(payload.delegation.targetBranchName).toContain(`handoff/${delegatedTaskId}`);
  });

  test('start blocks delegated tasks unless forced', async () => {
    const { workspacePath, delegatedTaskId } = await createDelegatedWorkspace();

    const result = runCLI(workspacePath, ['start', delegatedTaskId]);
    expect(result.status).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.error.code).toBe('TASK_DELEGATED');
    expect(payload.error.message).toMatch(/delegated via handoff/i);
  });
});
