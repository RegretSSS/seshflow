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

async function createQueryWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-query-search-'));
  const previousHome = process.env.SESHFLOW_HOME;
  process.env.SESHFLOW_HOME = path.join(workspacePath, '.test-home');

  try {
    const manager = new TaskManager(workspacePath);
    await manager.init();
    const handoffTask = manager.createTask({
      title: 'Prepare delegated presence sync handoff',
      description: 'Package presence synchronization work for delegated execution',
      priority: 'P1',
      contractIds: ['contract.presence.sync'],
      tags: ['handoff', 'presence'],
      boundFiles: ['services/presence-sync.ts'],
    });
    manager.createTask({
      title: 'Document review notes',
      description: 'Pure documentation task',
      priority: 'P3',
      tags: ['docs'],
    });
    await manager.saveData();
    return { workspacePath, handoffTaskId: handoffTask.id };
  } finally {
    if (previousHome === undefined) {
      delete process.env.SESHFLOW_HOME;
    } else {
      process.env.SESHFLOW_HOME = previousHome;
    }
  }
}

describe('query search filters', () => {
  test('filters tasks by free text over handoff-related fields', async () => {
    const { workspacePath, handoffTaskId } = await createQueryWorkspace();
    const result = runCLI(workspacePath, ['query', '--text', 'presence-sync']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.tasks).toHaveLength(1);
    expect(payload.tasks[0].id).toBe(handoffTaskId);
    expect(payload.filters.text).toBe('presence-sync');
  });

  test('filters tasks by bound contract id', async () => {
    const { workspacePath, handoffTaskId } = await createQueryWorkspace();
    const result = runCLI(workspacePath, ['query', '--contract', 'presence.sync']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.tasks).toHaveLength(1);
    expect(payload.tasks[0].id).toBe(handoffTaskId);
    expect(payload.filters.contract).toBe('presence.sync');
  });
});
