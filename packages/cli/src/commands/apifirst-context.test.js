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

async function createApiFirstWorkspace() {
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-apifirst-context-'));
  const initResult = runCLI(workspacePath, ['init', 'apifirst', '--force']);
  expect(initResult.status).toBe(0);
  return { workspacePath };
}

describe('api-first context resolution', () => {
  test('ncfr next and show surface contract-first context in apifirst mode', async () => {
    const { workspacePath } = await createApiFirstWorkspace();
    const contractPath = path.join(workspacePath, '.seshflow/contracts/contract.user-service.create-user.json');
    await fs.writeFile(contractPath, JSON.stringify({
      schemaVersion: 1,
      id: 'contract.user-service.create-user',
      version: '1.2.0',
      kind: 'api',
      protocol: 'http-json',
      name: 'Create User',
      owner: {
        service: 'user-service',
        team: 'identity',
        ownerTaskIds: ['task_contract']
      },
      lifecycle: {
        status: 'draft',
        compatibility: 'backward-compatible',
        supersedes: [],
        replacedBy: null
      },
      endpoint: {
        method: 'POST',
        path: '/users'
      },
      requestSchema: { type: 'object' },
      responseSchema: { type: 'object' },
      consumers: [],
      implementationBindings: [],
      openQuestions: [
        {
          id: 'question_duplicate_email',
          title: 'How should duplicate email conflicts be returned?'
        }
      ],
      notes: []
    }, null, 2), 'utf8');

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const taskA = manager.createTask({
      title: 'Implement create user route',
      priority: 'P0',
      status: 'todo',
      contractIds: ['contract.user-service.create-user'],
      contractRole: 'producer',
      boundFiles: ['src/api/users.ts']
    });
    manager.createTask({
      title: 'Consume create user API',
      priority: 'P1',
      status: 'backlog',
      contractIds: ['contract.user-service.create-user'],
      contractRole: 'consumer',
      boundFiles: ['src/client/users.ts']
    });
    await manager.saveData();

    const ncfrResult = runCLI(workspacePath, ['ncfr']);
    expect(ncfrResult.status).toBe(0);
    const ncfrPayload = JSON.parse(ncfrResult.stdout);
    expect(ncfrPayload.mode).toBe('apifirst');
    expect(ncfrPayload.focus).toBe('contract-first');
    expect(ncfrPayload.currentContract.id).toBe('contract.user-service.create-user');
    expect(ncfrPayload.openContractQuestions).toHaveLength(1);
    expect(ncfrPayload.relatedTasks.map(task => task.id)).toContain(taskA.id);

    const nextResult = runCLI(workspacePath, ['next']);
    expect(nextResult.status).toBe(0);
    const nextPayload = JSON.parse(nextResult.stdout);
    expect(nextPayload.mode).toBe('apifirst');
    expect(nextPayload.currentContract.id).toBe('contract.user-service.create-user');
    expect(nextPayload.relatedContracts).toHaveLength(1);

    const showResult = runCLI(workspacePath, ['show', taskA.id]);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.mode).toBe('apifirst');
    expect(showPayload.currentContract.id).toBe('contract.user-service.create-user');
    expect(showPayload.relatedContracts).toHaveLength(1);
    expect(showPayload.openContractQuestions[0].id).toBe('question_duplicate_email');
    expect(showPayload.relatedContractTasks.map(task => task.id)).toContain(taskA.id);
  });
});
