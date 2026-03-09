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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-contracts-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

describe('contracts commands', () => {
  test('contracts add/list/show/check manage stored contract objects', async () => {
    const { workspacePath } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'create-user.contract.json');

    await fs.writeJson(sourceFile, {
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
      requestSchema: {
        type: 'object'
      },
      responseSchema: {
        type: 'object'
      }
    }, { spaces: 2 });

    const addResult = runCLI(workspacePath, ['contracts', 'add', sourceFile]);
    expect(addResult.status).toBe(0);
    const addPayload = JSON.parse(addResult.stdout);
    expect(addPayload.action).toBe('contracts.add');
    expect(addPayload.contract.id).toBe('contract.user-service.create-user');

    const listResult = runCLI(workspacePath, ['contracts', 'list']);
    expect(listResult.status).toBe(0);
    const listPayload = JSON.parse(listResult.stdout);
    expect(listPayload.total).toBe(1);
    expect(listPayload.contracts[0].id).toBe('contract.user-service.create-user');

    const showResult = runCLI(workspacePath, ['contracts', 'show', 'contract.user-service.create-user']);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.contract.endpoint.path).toBe('/users');
    expect(showPayload.boundTasks).toEqual([]);

    const checkResult = runCLI(workspacePath, ['contracts', 'check']);
    expect(checkResult.status).toBe(0);
    const checkPayload = JSON.parse(checkResult.stdout);
    expect(checkPayload.contractsChecked).toBe(1);
    expect(checkPayload.issues).toEqual([]);
  });

  test('contracts import supports json arrays and preserves metadata/extensions', async () => {
    const { workspacePath } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'contracts.bundle.json');

    await fs.writeJson(sourceFile, [
      {
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
        responseSchema: { type: 'object' },
        metadata: {
          domain: 'identity',
          rollout: 'beta'
        },
        extensions: {
          'x-agent': {
            reviewer: 'api-linter'
          }
        }
      },
      {
        id: 'contract.board-service.move-card',
        version: '1.1.0',
        kind: 'rpc',
        protocol: 'rpc-json',
        name: 'Move Card',
        owner: {
          service: 'board-service',
          team: 'collaboration',
          ownerTaskIds: ['task_move_card']
        },
        rpc: {
          service: 'board-service',
          method: 'MoveCard'
        },
        requestSchema: { type: 'object' },
        responseSchema: { type: 'object' }
      }
    ], { spaces: 2 });

    const importResult = runCLI(workspacePath, ['contracts', 'import', sourceFile]);
    expect(importResult.status).toBe(0);
    const payload = JSON.parse(importResult.stdout);
    expect(payload.action).toBe('contracts.import');
    expect(payload.importedCount).toBe(2);
    expect(payload.createdCount).toBe(2);

    const showResult = runCLI(workspacePath, ['contracts', 'show', 'contract.user-service.create-user']);
    expect(showResult.status).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.contract.metadata).toEqual(
      expect.objectContaining({
        domain: 'identity',
        rollout: 'beta',
      })
    );
    expect(showPayload.contract.extensions).toEqual(
      expect.objectContaining({
        'x-agent': expect.objectContaining({
          reviewer: 'api-linter',
        })
      })
    );
  });

  test('contracts import supports jsonl bundles', async () => {
    const { workspacePath } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'contracts.bundle.jsonl');

    await fs.writeFile(sourceFile, [
      JSON.stringify({
        id: 'contract.auth.register',
        version: '1.0.0',
        kind: 'api',
        protocol: 'http-json',
        name: 'Register User',
        owner: { service: 'auth-service', team: 'identity', ownerTaskIds: [] },
        endpoint: { method: 'POST', path: '/auth/register' },
        requestSchema: { type: 'object' },
        responseSchema: { type: 'object' }
      }),
      JSON.stringify({
        id: 'contract.auth.login',
        version: '1.0.0',
        kind: 'api',
        protocol: 'http-json',
        name: 'Login User',
        owner: { service: 'auth-service', team: 'identity', ownerTaskIds: [] },
        endpoint: { method: 'POST', path: '/auth/login' },
        requestSchema: { type: 'object' },
        responseSchema: { type: 'object' }
      })
    ].join('\n'), 'utf8');

    const importResult = runCLI(workspacePath, ['contracts', 'import', sourceFile]);
    expect(importResult.status).toBe(0);
    const payload = JSON.parse(importResult.stdout);
    expect(payload.importedCount).toBe(2);
    expect(payload.contracts.map(contract => contract.id)).toEqual(
      expect.arrayContaining(['contract.auth.register', 'contract.auth.login'])
    );
  });

  test('contracts import rejects duplicate contract ids in the same bundle', async () => {
    const { workspacePath } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'contracts.duplicate.json');

    await fs.writeJson(sourceFile, [
      {
        id: 'contract.auth.login',
        version: '1.0.0',
        kind: 'api',
        protocol: 'http-json',
        name: 'Login User',
        owner: { service: 'auth-service', team: 'identity', ownerTaskIds: [] },
        endpoint: { method: 'POST', path: '/auth/login' },
        requestSchema: { type: 'object' },
        responseSchema: { type: 'object' }
      },
      {
        id: 'contract.auth.login',
        version: '1.1.0',
        kind: 'api',
        protocol: 'http-json',
        name: 'Login User v2',
        owner: { service: 'auth-service', team: 'identity', ownerTaskIds: [] },
        endpoint: { method: 'POST', path: '/auth/login' },
        requestSchema: { type: 'object' },
        responseSchema: { type: 'object' }
      }
    ], { spaces: 2 });

    const result = runCLI(workspacePath, ['contracts', 'import', sourceFile]);
    expect(result.status).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.error.code).toBe('CONTRACT_VALIDATION_FAILED');
    expect(payload.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_CONTRACT_ID', contractId: 'contract.auth.login' }),
      ])
    );
  });

  test('contracts add returns structured validation errors for invalid contract files', async () => {
    const { workspacePath } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'invalid.contract.json');

    await fs.writeJson(sourceFile, {
      id: 'bad-id',
      version: '1.0.0',
      kind: 'api',
      protocol: 'http-json',
      name: 'Broken',
      owner: {
        service: ''
      }
    }, { spaces: 2 });

    const result = runCLI(workspacePath, ['contracts', 'add', sourceFile]);
    expect(result.status).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('CONTRACT_VALIDATION_FAILED');
    expect(payload.error.issueCount).toBeGreaterThan(0);
    expect(payload.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_CONTRACT_ID' }),
        expect.objectContaining({ field: 'owner.service' }),
      ])
    );
    expect(payload.error.examples.rpc).toBe('.seshflow/contracts/contract.board-service.move-card.json');
  });

  test('contracts check surfaces workspace-level contract reminders', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'create-user.contract.json');

    await fs.writeJson(sourceFile, {
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
      requestSchema: {
        type: 'object'
      },
      responseSchema: {
        type: 'object'
      },
      openQuestions: [
        {
          id: 'question_duplicate_email',
          title: 'How should duplicate email conflicts be returned?'
        }
      ]
    }, { spaces: 2 });

    const addResult = runCLI(workspacePath, ['contracts', 'add', sourceFile]);
    expect(addResult.status).toBe(0);

    manager.createTask({
      title: 'Implement create user route',
      contractIds: ['contract.user-service.create-user'],
      contractRole: 'producer',
      boundFiles: ['src/api/users.ts']
    });
    manager.createTask({
      title: 'Broken contract binding',
      contractIds: ['contract.missing.example']
    });
    await manager.saveData();

    const checkResult = runCLI(workspacePath, ['contracts', 'check']);
    expect(checkResult.status).toBe(0);
    const payload = JSON.parse(checkResult.stdout);
    expect(payload.issues).toEqual([]);
    expect(payload.reminderCount).toBeGreaterThanOrEqual(3);
    expect(payload.reminders.map(reminder => reminder.code)).toEqual(
      expect.arrayContaining(['OPEN_CONTRACT_QUESTIONS', 'BOUND_FILE_MISSING', 'MISSING_BOUND_CONTRACT'])
    );
  });

  test('contracts show returns contract-linked task bindings and dependency chains', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'create-user.contract.json');

    await fs.writeJson(sourceFile, {
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

    const addResult = runCLI(workspacePath, ['contracts', 'add', sourceFile]);
    expect(addResult.status).toBe(0);

    const designTask = manager.createTask({
      title: 'Draft create user contract',
      id: 'task_contract',
      contractIds: ['contract.user-service.create-user'],
      contractRole: 'reviewer',
    });
    manager.createTask({
      title: 'Implement create user route',
      contractIds: ['contract.user-service.create-user'],
      contractRole: 'producer',
      dependencies: [designTask.id],
    });
    await manager.saveData();

    const showResult = runCLI(workspacePath, ['contracts', 'show', 'contract.user-service.create-user']);
    expect(showResult.status).toBe(0);
    const payload = JSON.parse(showResult.stdout);
    expect(payload.boundTasks).toHaveLength(2);
    expect(payload.dependencyChains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromTaskId: 'task_contract' })
      ])
    );
    expect(payload.dependencySummary).toEqual(
      expect.objectContaining({
        taskCount: 2,
        internalEdgeCount: 1,
        topologicalOrder: expect.arrayContaining(['task_contract']),
      })
    );
  });

  test('contracts add validates rpc contracts with detailed issue output', async () => {
    const { workspacePath } = await createWorkspace();
    const sourceFile = path.join(workspacePath, 'move-card.contract.json');

    await fs.writeJson(sourceFile, {
      id: 'contract.board-service.move-card',
      version: '1.0.0',
      kind: 'rpc',
      protocol: 'rpc-json',
      name: 'Move Card',
      owner: {
        service: 'board-service',
      },
      rpc: {
        service: 'board-service',
      },
    }, { spaces: 2 });

    const result = runCLI(workspacePath, ['contracts', 'add', sourceFile]);
    expect(result.status).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.error.code).toBe('CONTRACT_VALIDATION_FAILED');
    expect(payload.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_RPC_TARGET' }),
      ])
    );
  });
});
