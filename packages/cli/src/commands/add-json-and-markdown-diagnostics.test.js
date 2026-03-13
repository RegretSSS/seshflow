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
  const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-add-json-'));
  const manager = new TaskManager(workspacePath);
  await manager.init();
  return { workspacePath, manager };
}

describe('add json and markdown diagnostics', () => {
  test('add --json returns structured task data and dependency warnings', async () => {
    const { workspacePath } = await createWorkspace();
    const result = runCLI(workspacePath, ['add', 'Draft API contract', '--priority', 'P1', '--depends', 'task_missing', '--json']);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.success).toBe(true);
    expect(payload.action).toBe('add');
    expect(payload.task.title).toBe('Draft API contract');
    expect(payload.warnings).toHaveLength(1);
    expect(payload.warnings[0].dependencyId).toBe('task_missing');
    expect(payload.workspace.totalTasks).toBe(1);
  });

  test('validate surfaces line-aware markdown fix hints', async () => {
    const { workspacePath } = await createWorkspace();
    const markdownPath = path.join(workspacePath, 'invalid-plan.md');
    await fs.writeFile(markdownPath, '- [ ] Broken task\n  estimate: nope\n', 'utf8');

    const result = runCLI(workspacePath, ['validate', 'invalid-plan.md']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Line 2: invalid estimate value "nope"');
    expect(result.stderr).toContain('fix: use number or number+h');
    expect(result.stderr).toContain('Accepted task patterns:');
  });

  test('import validation prints stable-id guidance', async () => {
    const { workspacePath } = await createWorkspace();
    const markdownPath = path.join(workspacePath, 'duplicate-plan.md');
    await fs.writeFile(markdownPath, [
      '- [ ] First task [P1] [id:task_same]',
      '- [ ] Second task [P2] [id:task_same]',
    ].join('\n'), 'utf8');

    const result = runCLI(workspacePath, ['import', 'duplicate-plan.md']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('duplicate stable id task_same');
    expect(result.stderr).toContain('fix: keep each [id:task_xxx] unique within the file');
    expect(result.stderr).toContain('Accepted task patterns:');
  });

  test('validate accepts indented root tasks and warns about ambiguous indentation', async () => {
    const { workspacePath } = await createWorkspace();
    const markdownPath = path.join(workspacePath, 'indented-plan.md');
    await fs.writeFile(markdownPath, [
      '# Plan',
      '',
      '  - [ ] First task [id:task_first] [P1] [estimate: 2h]',
      '',
      '  - [ ] Second task [id:task_second] [P1] [dependency:task_first]',
    ].join('\n'), 'utf8');

    const result = runCLI(workspacePath, ['validate', 'indented-plan.md']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Tasks found: 2');
    expect(result.stdout).toContain('top-level task is indented; parsed as a root task for compatibility');
  });

  test('import supports inline estimate metadata tokens', async () => {
    const { workspacePath } = await createWorkspace();
    const markdownPath = path.join(workspacePath, 'estimate-token-plan.md');
    await fs.writeFile(markdownPath, [
      '- [ ] Tokenized estimate [id:task_estimate] [P1] [estimate: 2h]',
      '- [ ] Priority token variant [id:task_priority] [priority:P2] [dependency:task_estimate]',
    ].join('\n'), 'utf8');

    const result = runCLI(workspacePath, ['import', 'estimate-token-plan.md']);
    expect(result.status).toBe(0);

    const manager = new TaskManager(workspacePath);
    await manager.init();
    expect(manager.getTask('task_estimate').estimatedHours).toBe(2);
    expect(manager.getTask('task_priority').priority).toBe('P2');
    expect(manager.getTask('task_priority').dependencies).toEqual(['task_estimate']);
  });
});
