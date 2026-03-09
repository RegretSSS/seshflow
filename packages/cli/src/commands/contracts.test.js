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

    const checkResult = runCLI(workspacePath, ['contracts', 'check']);
    expect(checkResult.status).toBe(0);
    const checkPayload = JSON.parse(checkResult.stdout);
    expect(checkPayload.contractsChecked).toBe(1);
    expect(checkPayload.issues).toEqual([]);
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
  });
});
