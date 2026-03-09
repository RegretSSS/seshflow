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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-integration-seams-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

describe('integration seams', () => {
  test('mode contract and binding events are persisted as runtime events', async () => {
    const { workspacePath } = await createWorkspace();
    const contractFile = path.join(workspacePath, 'create-user.contract.json');

    await fs.writeJson(contractFile, {
      id: 'contract.user-service.create-user',
      version: '1.0.0',
      kind: 'api',
      protocol: 'http-json',
      name: 'Create User',
      owner: {
        service: 'user-service',
        team: 'identity',
        ownerTaskIds: ['task_contract']
      },
      endpoint: {
        method: 'POST',
        path: '/users'
      },
      requestSchema: { type: 'object' },
      responseSchema: { type: 'object' }
    }, { spaces: 2 });

    expect(runCLI(workspacePath, ['mode', 'set', 'apifirst']).status).toBe(0);
    expect(runCLI(workspacePath, ['contracts', 'add', contractFile]).status).toBe(0);
    expect(
      runCLI(workspacePath, [
        'add',
        'Implement API route',
        '--contracts',
        'contract.user-service.create-user',
        '--contract-role',
        'producer'
      ]).status
    ).toBe(0);

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const runtimeTypes = manager.getRuntimeEvents().map(event => event.type);
    expect(runtimeTypes).toEqual(
      expect.arrayContaining(['mode.changed', 'contract.changed', 'contract.bound'])
    );
  });

  test('rpc shell exposes stable workspace task and contract payloads', async () => {
    const { workspacePath } = await createWorkspace();
    expect(runCLI(workspacePath, ['mode', 'set', 'apifirst']).status).toBe(0);

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const task = manager.createTask({
      title: 'Implement create user route',
      contractIds: ['contract.user-service.create-user'],
      contractRole: 'producer',
      boundFiles: ['src/api/users.ts']
    });
    await manager.saveData();

    const workspaceResult = runCLI(workspacePath, ['rpc', 'shell', 'workspace']);
    expect(workspaceResult.status).toBe(0);
    const workspacePayload = JSON.parse(workspaceResult.stdout);
    expect(workspacePayload.surface).toBe('workspace');
    expect(workspacePayload.workspace.mode).toBe('apifirst');

    const taskResult = runCLI(workspacePath, ['rpc', 'shell', 'task', task.id]);
    expect(taskResult.status).toBe(0);
    const taskPayload = JSON.parse(taskResult.stdout);
    expect(taskPayload.surface).toBe('task');
    expect(taskPayload.task.id).toBe(task.id);
    expect(taskPayload.currentContract.id).toBe('contract.user-service.create-user');

    const contractResult = runCLI(workspacePath, ['rpc', 'shell', 'contract', 'contract.user-service.create-user']);
    expect(contractResult.status).toBe(0);
    const contractPayload = JSON.parse(contractResult.stdout);
    expect(contractPayload.surface).toBe('contract');
    expect(contractPayload.contract.id).toBe('contract.user-service.create-user');
    expect(contractPayload.relatedTasks.map(item => item.id)).toContain(task.id);
  });
});
