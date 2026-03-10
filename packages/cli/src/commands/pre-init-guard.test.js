import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../../bin/seshflow.js');

function runCLI(workspacePath, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8',
  });
}

describe('pre-init command guardrails', () => {
  test('ncfr returns bootstrap context without creating seshflow files', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-preinit-ncfr-'));

    const result = runCLI(workspacePath, ['ncfr']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(true);
    expect(payload.workspaceState).toBe('uninitialized');
    expect(payload.focus).toBe('bootstrap');
    expect(payload.bootstrapCommands).toEqual(['seshflow init', 'seshflow init contractfirst']);
    expect(payload.workspace.path).toBe(workspacePath);
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow'))).toBe(false);
  });

  test('ncfr reports partial bootstrap safely without completing initialization', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-preinit-partial-'));
    await fs.ensureDir(path.join(workspacePath, '.seshflow'));

    const result = runCLI(workspacePath, ['ncfr']);
    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.workspaceState).toBe('partial');
    expect(payload.focus).toBe('bootstrap');
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow', 'tasks.json'))).toBe(false);
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow', 'config.yaml'))).toBe(false);
  });

  test('next returns a lightweight pre-init error without writing files', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-preinit-next-'));

    const result = runCLI(workspacePath, ['next']);
    expect(result.status).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('WORKSPACE_NOT_INITIALIZED');
    expect(payload.workspaceState).toBe('uninitialized');
    expect(payload.workspace.path).toBe(workspacePath);
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow'))).toBe(false);
  });

  test('contracts list is guarded before init and stays side-effect free', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-preinit-contracts-'));

    const result = runCLI(workspacePath, ['contracts', 'list']);
    expect(result.status).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.error.code).toBe('WORKSPACE_NOT_INITIALIZED');
    expect(payload.workspaceState).toBe('uninitialized');
    expect(await fs.pathExists(path.join(workspacePath, '.seshflow'))).toBe(false);
  });
});
