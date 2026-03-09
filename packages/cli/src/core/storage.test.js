import { describe, expect, test } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { Storage } from './storage.js';
import { getDefaultTaskTemplate } from '../commands/init.js';

describe('UTF-8 stabilization', () => {
  test('default task template contains readable Chinese copy', () => {
    const template = getDefaultTaskTemplate();

    expect(template).toContain('# 项目任务模板');
    expect(template).toContain('## 快速开始');
    expect(template).toContain('最后更新:');
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
          { id: 'backlog', name: '寰呭姙姹?', color: '#94a3b8' },
          { id: 'todo', name: '鍑嗗鍋?', color: '#3b82f6' },
          { id: 'in-progress', name: '杩涜涓?', color: '#eab308' }
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
