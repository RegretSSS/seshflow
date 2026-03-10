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

async function createGitWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-handoff-cli-'));
  const previousHome = process.env.SESHFLOW_HOME;
  process.env.SESHFLOW_HOME = path.join(workspacePath, '.test-home');

  try {
    const manager = new TaskManager(workspacePath);
    await manager.init();
    const task = manager.createTask({
      title: 'Delegate card creation',
      priority: 'P0',
      contractIds: ['contract.board-service.create-card'],
    });
    await manager.saveData();

    expect(runGit(workspacePath, ['init']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.email', 'tests@example.com']).status).toBe(0);
    expect(runGit(workspacePath, ['config', 'user.name', 'Seshflow Tests']).status).toBe(0);
    expect(runGit(workspacePath, ['add', '.']).status).toBe(0);
    expect(runGit(workspacePath, ['commit', '-m', 'initial workspace']).status).toBe(0);

    return { workspacePath, taskId: task.id };
  } finally {
    if (previousHome === undefined) {
      delete process.env.SESHFLOW_HOME;
    } else {
      process.env.SESHFLOW_HOME = previousHome;
    }
  }
}

describe('handoff create command', () => {
  test('creates a delegated git worktree with manifest and parent binding', async () => {
    const { workspacePath, taskId } = await createGitWorkspace();

    const result = runCLI(workspacePath, ['handoff', 'create', taskId, '--executor-kind', 'agent', '--owner', 'codex']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.action).toBe('handoff.create');
    expect(payload.handoff.sourceTaskId).toBe(taskId);
    expect(payload.handoff.status).toBe('active');
    expect(payload.handoff.executorKind).toBe('agent');
    expect(payload.handoff.owner.id).toBe('codex');
    expect(await fs.pathExists(payload.targetWorktree.path)).toBe(true);
    expect(await fs.pathExists(payload.manifestPath)).toBe(true);

    const manifest = await fs.readJson(payload.manifestPath);
    expect(manifest.handoffId).toBe(payload.handoff.handoffId);
    expect(manifest.task.id).toBe(taskId);
    expect(manifest.executionBoundary.sourceOfTruth).toBe('parent-workspace');

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const handoff = manager.getHandoff(payload.handoff.handoffId);
    expect(handoff).not.toBeNull();
    expect(handoff.status).toBe('active');
    expect(handoff.targetBranchName).toContain(`handoff/${taskId}`);
  });

  test('prevents creating a second active handoff for the same task', async () => {
    const { workspacePath, taskId } = await createGitWorkspace();

    const first = runCLI(workspacePath, ['handoff', 'create', taskId]);
    expect(first.status).toBe(0);

    const second = runCLI(workspacePath, ['handoff', 'create', taskId, '--path', '../duplicate-handoff']);
    expect(second.status).toBe(1);

    const payload = JSON.parse(second.stdout);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('HANDOFF_CREATE_FAILED');
    expect(payload.error.message).toMatch(/active handoff/i);
  });
});
