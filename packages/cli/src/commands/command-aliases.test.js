import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import { Storage } from '../core/storage.js';

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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-aliases-'));
  return { workspacePath };
}

describe('command and mode aliases', () => {
  test('init contractfirst resolves to apifirst mode', async () => {
    const { workspacePath } = await createWorkspace();

    const result = runCLI(workspacePath, ['init', 'contractfirst', '--force']);
    expect(result.status).toBe(0);

    const storage = new Storage(workspacePath);
    const config = await storage.readConfigFile();
    expect(config.mode).toBe('apifirst');
  });

  test('mode set contract-first resolves to apifirst mode', async () => {
    const { workspacePath } = await createWorkspace();

    expect(runCLI(workspacePath, ['init', '--force']).status).toBe(0);
    const result = runCLI(workspacePath, ['mode', 'set', 'contract-first']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.mode).toBe('apifirst');
    expect(payload.profile.preset).toBe('apifirst');
  });

  test('workspace and contract singular aliases resolve correctly', async () => {
    const { workspacePath } = await createWorkspace();

    expect(runCLI(workspacePath, ['init', 'contractfirst', '--force']).status).toBe(0);
    expect(runCLI(workspacePath, ['contract', 'list']).status).toBe(0);

    const currentResult = runCLI(workspacePath, ['workspace', 'current']);
    expect(currentResult.status).toBe(0);
    const currentPayload = JSON.parse(currentResult.stdout);
    expect(currentPayload.workspace.path).toBe(workspacePath);
  });

  test('proc, pause, and rm aliases work for execution commands', async () => {
    const { workspacePath } = await createWorkspace();

    expect(runCLI(workspacePath, ['init', '--force']).status).toBe(0);
    const addResult = runCLI(workspacePath, ['add', 'Alias task', '--priority', 'P0']);
    expect(addResult.status).toBe(0);
    const taskId = JSON.parse(addResult.stdout).task.id;

    expect(runCLI(workspacePath, ['start', taskId]).status).toBe(0);

    const pauseResult = runCLI(workspacePath, ['pause']);
    expect(pauseResult.status).toBe(0);
    expect(JSON.parse(pauseResult.stdout).task.status).toBe('todo');

    const procResult = runCLI(workspacePath, ['proc', 'list', taskId]);
    expect(procResult.status).toBe(0);
    expect(JSON.parse(procResult.stdout).taskId).toBe(taskId);

    const deleteResult = runCLI(workspacePath, ['rm', taskId, '--force']);
    expect(deleteResult.status).toBe(0);
    expect(JSON.parse(deleteResult.stdout).taskId).toBe(taskId);
  });
});
