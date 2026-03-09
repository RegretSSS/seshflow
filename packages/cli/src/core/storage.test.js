import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { Storage } from './storage.js';
import { getDefaultTaskTemplate } from '../commands/init.js';

describe('UTF-8 stabilization', () => {
  test('default task template contains readable managed markdown copy', () => {
    const template = getDefaultTaskTemplate();

    expect(template).toContain('# Seshflow Planning Template');
    expect(template).toContain('## Managed Markdown contract');
    expect(template).toContain('Last updated:');
    expect(template).toContain('[id:task_design]');
    expect(template).not.toContain('椤圭洰');
  });

  test('storage normalizes columns and workspace defaults on read/write', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-utf8-'));
    const storage = new Storage(workspacePath);

    await fs.ensureDir(path.join(workspacePath, '.seshflow'));
    await fs.writeFile(
      path.join(workspacePath, '.seshflow', 'tasks.json'),
      JSON.stringify({
        version: '1.0.0',
        workspace: {
          name: '',
          path: '',
          gitBranch: ''
        },
        metadata: {},
        columns: [
          { id: 'backlog', name: '瀵板懎濮欏Ч?', color: '#94a3b8' },
          { id: 'todo', name: '閸戝棗顦崑?', color: '#3b82f6' },
          { id: 'in-progress', name: '鏉╂稖顢戞稉?', color: '#eab308' }
        ],
        tasks: [],
        currentSession: null,
        statistics: {}
      }),
      'utf-8'
    );

    const data = await storage.readTasksFile();
    expect(data.workspace.path).toBe(workspacePath);
    expect(data.workspace.name).toBe(path.basename(workspacePath));
    expect(data.columns.find(column => column.id === 'backlog')?.name).toBe('Backlog');
    expect(data.columns.find(column => column.id === 'todo')?.name).toBe('Todo');

    await storage.writeTasksFile(data);

    const persisted = JSON.parse(await fs.readFile(path.join(workspacePath, '.seshflow', 'tasks.json'), 'utf-8'));
    expect(persisted.workspace.path).toBe(workspacePath);
    expect(persisted.workspace.name).toBe(path.basename(workspacePath));
    expect(persisted.columns.find(column => column.id === 'backlog')?.name).toBe('Backlog');
  });
});

describe('workspace auto-discovery', () => {
  test('resolves an existing seshflow workspace from a nested directory', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-root-'));
    const nestedPath = path.join(rootPath, 'packages', 'cli', 'src');

    await fs.ensureDir(path.join(rootPath, '.seshflow'));
    await fs.ensureDir(nestedPath);
    await fs.writeFile(path.join(rootPath, '.seshflow', 'tasks.json'), JSON.stringify({ tasks: [] }), 'utf-8');

    const storage = new Storage(nestedPath);
    const workspaceInfo = storage.getWorkspaceRecordSync();

    expect(storage.getWorkspacePath()).toBe(rootPath);
    expect(workspaceInfo.source).toBe('workspace-file');
    expect(workspaceInfo.requestedPath).toBe(path.resolve(nestedPath));
    expect(workspaceInfo.sourcePath).toBe(path.join(rootPath, '.seshflow', 'tasks.json'));
  });

  test('prefers git root during init when no seshflow workspace exists yet', async () => {
    const gitRootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'seshflow-git-'));
    const nestedPath = path.join(gitRootPath, 'packages', 'cli');

    await fs.ensureDir(path.join(gitRootPath, '.git'));
    await fs.ensureDir(nestedPath);

    const storage = new Storage(nestedPath, { preferGitRoot: true });
    const workspaceInfo = storage.getWorkspaceRecordSync();

    expect(storage.getWorkspacePath()).toBe(gitRootPath);
    expect(workspaceInfo.source).toBe('git-root');
    expect(workspaceInfo.sourcePath).toBe(path.join(gitRootPath, '.git'));
  });
});
