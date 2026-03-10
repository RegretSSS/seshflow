import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../../bin/seshflow.js');

function runCLI(workspacePath, args, seshflowHome) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspacePath,
    encoding: 'utf8',
    env: {
      ...process.env,
      SESHFLOW_HOME: seshflowHome,
    },
  });
}

describe('issue command', () => {
  test('discloses issue usage during init and ncfr', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-issue-hint-'));
    const workspacePath = path.join(root, 'workspace');
    const seshflowHome = path.join(root, '.seshflow-home');
    await fs.ensureDir(workspacePath);

    const initResult = runCLI(workspacePath, ['init', '--force'], seshflowHome);
    expect(initResult.status).toBe(0);
    expect(initResult.stdout).toMatch(/seshflow issue "<title>" --trigger "\.\.\." --actual "\.\.\." --expected "\.\.\." --impact "\.\.\."/i);

    const ncfrResult = runCLI(workspacePath, ['ncfr'], seshflowHome);
    expect(ncfrResult.status).toBe(0);
    const payload = JSON.parse(ncfrResult.stdout);
    expect(payload.issueHint.command).toMatch(/seshflow issue/i);
  });

  test('files feedback into the remembered workspace without initializing the source directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-issue-'));
    const targetWorkspace = path.join(root, 'target');
    const sourceWorkspace = path.join(root, 'source');
    const seshflowHome = path.join(root, '.seshflow-home');
    await fs.ensureDir(targetWorkspace);
    await fs.ensureDir(sourceWorkspace);

    const initResult = runCLI(targetWorkspace, ['init', '--force'], seshflowHome);
    expect(initResult.status).toBe(0);

    const ncfrResult = runCLI(targetWorkspace, ['ncfr'], seshflowHome);
    expect(ncfrResult.status).toBe(0);

    const issueResult = runCLI(sourceWorkspace, [
      'issue',
      'Record regression in contract warning flow',
      '--trigger',
      'Running handoff submit after a failed validation attempt',
      '--actual',
      'The warning is too generic to diagnose quickly',
      '--expected',
      'The command should point to the missing artifact and suggested next step',
      '--impact',
      'Main agent had to manually inspect logs and spent extra context',
    ], seshflowHome);

    expect(issueResult.status).toBe(0);
    const payload = JSON.parse(issueResult.stdout);
    expect(payload.success).toBe(true);
    expect(payload.action).toBe('issue');
    expect(payload.issue.targetWorkspace.path).toBe(targetWorkspace);
    expect(payload.issue.sourceWorkspace.cwd).toBe(sourceWorkspace);
    expect(payload.issue.sourceWorkspace.workspaceState).toBe('uninitialized');
    expect(await fs.pathExists(path.join(sourceWorkspace, '.seshflow'))).toBe(false);

    const tasksFile = await fs.readJson(path.join(targetWorkspace, '.seshflow', 'tasks.json'));
    const createdTask = tasksFile.tasks.find(task => task.id === payload.task.id);
    expect(createdTask).toBeDefined();
    expect(createdTask.tags).toEqual(expect.arrayContaining(['issue', 'feedback']));
    expect(createdTask.description).toContain('## Trigger');
    expect(createdTask.description).toContain(sourceWorkspace);
  });

  test('requires the four structured feedback fields', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-issue-required-'));
    const workspacePath = path.join(root, 'workspace');
    const seshflowHome = path.join(root, '.seshflow-home');
    await fs.ensureDir(workspacePath);

    const initResult = runCLI(workspacePath, ['init', '--force'], seshflowHome);
    expect(initResult.status).toBe(0);

    const result = runCLI(workspacePath, [
      'issue',
      'Missing required fields example',
      '--trigger',
      'Trying to file an incomplete issue',
      '--actual',
      'Only actual and trigger were provided',
    ], seshflowHome);

    expect(result.status).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('ISSUE_CREATE_FAILED');
    expect(payload.error.message).toMatch(/Missing required field: expected/i);
  });
});
