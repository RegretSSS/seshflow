import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../../bin/seshflow.js');

async function createWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-output-layering-'));
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

describe('output layering', () => {
  test('query json is summary by default and full with --full', async () => {
    const { workspacePath, manager } = await createWorkspace();
    manager.createTask({
      title: 'Query Target',
      description: 'Detailed description should not appear in summary mode.',
      priority: 'P0',
      status: 'todo',
      tags: ['cli']
    });
    await manager.saveData();

    const summaryResult = runCLI(workspacePath, ['query', '--json']);
    expect(summaryResult.status).toBe(0);
    const summaryPayload = JSON.parse(summaryResult.stdout);

    expect(summaryPayload.detailLevel).toBe('summary');
    expect(summaryPayload.tasks[0].description).toBeUndefined();
    expect(summaryPayload.tasks[0].subtaskCount).toBe(0);

    const fullResult = runCLI(workspacePath, ['query', '--json', '--full']);
    expect(fullResult.status).toBe(0);
    const fullPayload = JSON.parse(fullResult.stdout);

    expect(fullPayload.detailLevel).toBe('full');
    expect(fullPayload.tasks[0].description).toContain('Detailed description');
  });

  test('ncfr keeps currentTask null when no active session exists', async () => {
    const { workspacePath, manager } = await createWorkspace();
    manager.createTask({ title: 'Ready Task', priority: 'P0', status: 'todo' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['ncfr', '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);

    expect(payload.currentTask).toBeUndefined();
    expect(payload.nextReadyTask.id).toBeTruthy();
    expect(payload.focus).toBe('next-ready-task');
    expect(payload.project).toBeUndefined();
  });

  test('next omits empty contract and runtime sections by default in contract-first mode', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const config = await manager.storage.readConfigFile();
    await manager.storage.writeConfigFile({
      ...config,
      mode: 'apifirst',
    });
    manager.createTask({ title: 'Contractless ready task', priority: 'P0', status: 'todo' });
    await manager.saveData();

    const result = runCLI(workspacePath, ['next', '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);

    expect(payload.mode).toBe('apifirst');
    expect(payload.task.id).toBeTruthy();
    expect(payload.currentContract).toBeUndefined();
    expect(payload.relatedContracts).toBeUndefined();
    expect(payload.openContractQuestions).toBeUndefined();
    expect(payload.contractReminders).toBeUndefined();
    expect(payload.contractReminderSummary).toBeUndefined();
    expect(payload.runtimeSummary).toBeUndefined();
    expect(payload.processSummary).toBeUndefined();
    expect(payload.contextPriority).toBeUndefined();
    expect(payload.workspace.sourcePath).toBeUndefined();
  });

  test('show json is summary by default and exposes recent runtime events only with --full', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({
      title: 'Show Target',
      description: 'Detailed task',
      priority: 'P0',
      status: 'todo',
    });
    manager.startSession(task.id);
    manager.recordRuntime(task.id, {
      command: 'pnpm test',
      outputRoot: 'packages/cli/coverage',
    });
    manager.appendRuntimeEvent({
      taskId: task.id,
      type: 'transition.execution',
      action: 'start',
      status: 'success',
    });
    await manager.saveData();

    const summaryResult = runCLI(workspacePath, ['show', task.id, '--json']);
    expect(summaryResult.status).toBe(0);
    const summaryPayload = JSON.parse(summaryResult.stdout);

    expect(summaryPayload.detailLevel).toBe('summary');
    expect(summaryPayload.runtimeEventSummary.recordCount).toBeGreaterThan(0);
    expect(summaryPayload.recentRuntimeEvents).toBeUndefined();
    expect(summaryPayload.contractReminders).toBeUndefined();
    expect(summaryPayload.processSummary).toBeUndefined();

    const fullResult = runCLI(workspacePath, ['show', task.id, '--json', '--full']);
    expect(fullResult.status).toBe(0);
    const fullPayload = JSON.parse(fullResult.stdout);

    expect(fullPayload.detailLevel).toBe('full');
    expect(fullPayload.recentRuntimeEvents).toHaveLength(1);
  });

  test('show omits empty execution sections by default', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({
      title: 'Lean show target',
      priority: 'P0',
      status: 'todo',
    });
    await manager.saveData();

    const result = runCLI(workspacePath, ['show', task.id, '--json']);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);

    expect(payload.runtimeSummary).toBeUndefined();
    expect(payload.recentRuntime).toBeUndefined();
    expect(payload.processSummary).toBeUndefined();
    expect(payload.recentProcesses).toBeUndefined();
    expect(payload.runtimeEventSummary).toBeUndefined();
    expect(payload.workspace.sourcePath).toBeUndefined();
  });

  test('storage throttles repeated workspace hints within the cooldown window', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-hints-'));
    const storage = new Storage(workspacePath);
    await storage.init();

    const first = await storage.shouldShowHint('query:pretty-hint', 60_000);
    const second = await storage.shouldShowHint('query:pretty-hint', 60_000);

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  test('init quick start points to ncfr and json follow-up flow', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-init-output-'));
    const result = runCLI(workspacePath, ['init']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('seshflow ncfr');
    expect(result.stdout).toContain('seshflow next');
    expect(result.stdout).not.toContain('CMD alternative');
  });
});
