import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { TaskManager } from './task-manager.js';

describe('handoff model', () => {
  test('creates a parent-managed handoff record with task and contract bindings', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-handoff-'));
    const manager = new TaskManager(workspacePath);
    await manager.init();

    const task = manager.createTask({
      title: 'Delegate card implementation',
      contractIds: ['contract.board-service.create-card'],
      priority: 'P0',
    });

    const handoff = manager.createHandoff({
      sourceTaskId: task.id,
      targetWorktreePath: path.join(workspacePath, '..', 'seshflow-card-worktree'),
      targetBranchName: 'handoff/create-card',
      executorKind: 'agent',
      owner: {
        id: 'subagent-card-builder',
        label: 'Card builder',
      },
      bundle: {
        scope: 'local-closure',
      },
    });

    expect(handoff.sourceTaskId).toBe(task.id);
    expect(handoff.sourceContractIds).toEqual(['contract.board-service.create-card']);
    expect(handoff.status).toBe('created');
    expect(handoff.executorKind).toBe('agent');
    expect(handoff.bundle).toEqual({ scope: 'local-closure' });
    expect(manager.getTaskHandoffs(task.id)).toHaveLength(1);
  });

  test('prevents multiple active handoffs for the same task', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-handoff-'));
    const manager = new TaskManager(workspacePath);
    await manager.init();

    const task = manager.createTask({
      title: 'Delegate auth fix',
      priority: 'P1',
    });

    manager.createHandoff({
      sourceTaskId: task.id,
      targetWorktreePath: path.join(workspacePath, '..', 'seshflow-auth-worktree'),
      targetBranchName: 'handoff/auth-fix',
    });

    expect(() => manager.createHandoff({
      sourceTaskId: task.id,
      targetWorktreePath: path.join(workspacePath, '..', 'seshflow-auth-worktree-2'),
      targetBranchName: 'handoff/auth-fix-2',
    })).toThrow(/active handoff/i);
  });

  test('persists handoff lifecycle records in canonical workspace storage', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-handoff-'));
    const manager = new TaskManager(workspacePath);
    await manager.init();

    const task = manager.createTask({
      title: 'Delegate review handoff',
      priority: 'P2',
    });

    manager.createHandoff({
      sourceTaskId: task.id,
      targetWorktreePath: path.join(workspacePath, '..', 'seshflow-review-worktree'),
      targetBranchName: 'handoff/review',
      status: 'submitted',
      submittedAt: '2026-03-10T00:00:00.000Z',
      resultRef: {
        type: 'git-commit',
        value: 'abc1234',
      },
    });

    await manager.saveData();

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();

    expect(reloaded.getHandoffs()).toHaveLength(1);
    expect(reloaded.getHandoffs()[0]).toEqual(
      expect.objectContaining({
        sourceTaskId: task.id,
        status: 'submitted',
        resultRef: expect.objectContaining({
          type: 'git-commit',
          value: 'abc1234',
        }),
      })
    );
  });
});
