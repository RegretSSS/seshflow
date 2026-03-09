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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-contract-binding-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

describe('contract binding flows', () => {
  test('add supports inline contract metadata and bound files', async () => {
    const { workspacePath } = await createWorkspace();

    const result = runCLI(workspacePath, [
      'add',
      'Implement API handler [contracts:contract.user-service.create-user] [files:src/api/users.ts]',
      '--contract-role',
      'producer',
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.task.contractIds).toEqual(['contract.user-service.create-user']);
    expect(payload.task.contractRole).toBe('producer');
    expect(payload.task.boundFiles).toEqual(['src/api/users.ts']);
  });

  test('edit can bind contracts and files to existing tasks', async () => {
    const { workspacePath, manager } = await createWorkspace();
    const task = manager.createTask({ title: 'Wire consumer task' });
    await manager.saveData();

    const result = runCLI(workspacePath, [
      'edit',
      task.id,
      '--bind-contract',
      'contract.user-service.create-user',
      '--contract-role',
      'consumer',
      '--bind-file',
      'src/client/user.ts'
    ]);

    expect(result.status).toBe(0);

    const reloaded = new TaskManager(workspacePath);
    await reloaded.init();
    const updated = reloaded.getTask(task.id);
    expect(updated.contractIds).toEqual(['contract.user-service.create-user']);
    expect(updated.contractRole).toBe('consumer');
    expect(updated.boundFiles).toEqual(['src/client/user.ts']);
  });

  test('import applies contract headings and exports contract metadata', async () => {
    const { workspacePath } = await createWorkspace();
    const markdownPath = path.join(workspacePath, 'contract-plan.md');
    const exportPath = path.join(workspacePath, 'contract-plan-export.md');
    const modeResult = runCLI(workspacePath, ['mode', 'set', 'apifirst']);
    expect(modeResult.status).toBe(0);

    await fs.writeFile(markdownPath, [
      '# API planning',
      '',
      '## Contract: contract.user-service.create-user',
      '',
      '- [ ] Implement create user endpoint [P0] [contract-role:producer] [files:src/api/users.ts]',
      '  dependency: task_auth',
      '',
      '## Todo',
      '',
      '- [ ] Verify client integration [P1] [contracts:contract.user-service.create-user] [contract-role:consumer] [files:src/client/users.ts]',
    ].join('\n'), 'utf8');

    const importResult = runCLI(workspacePath, ['import', 'contract-plan.md', '--force']);
    expect(importResult.status).toBe(0);

    const manager = new TaskManager(workspacePath);
    await manager.init();
    const tasks = manager.getTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[0].contractIds).toEqual(['contract.user-service.create-user']);
    expect(tasks[0].contractRole).toBe('producer');
    expect(tasks[0].boundFiles).toEqual(['src/api/users.ts']);
    expect(tasks[1].contractIds).toEqual(['contract.user-service.create-user']);
    expect(tasks[1].contractRole).toBe('consumer');
    expect(tasks[1].boundFiles).toEqual(['src/client/users.ts']);

    const exportResult = runCLI(workspacePath, ['export', exportPath, '--md']);
    expect(exportResult.status).toBe(0);
    const exported = await fs.readFile(exportPath, 'utf8');
    expect(exported).toContain('## Contract: contract.user-service.create-user');
    expect(exported).toContain('### backlog');
    expect(exported).toContain('[contracts:contract.user-service.create-user]');
    expect(exported).toContain('[contract-role:producer]');
    expect(exported).toContain('[files:src/api/users.ts]');
  });
});
