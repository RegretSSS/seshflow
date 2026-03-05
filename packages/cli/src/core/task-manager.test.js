import { TaskManager } from './task-manager.js';
import { Storage } from './storage.js';
import fs from 'fs-extra';
import path from 'path';

describe('TaskManager', () => {
  let testDir;
  let manager;

  beforeEach(async () => {
    // Create temporary directory for testing
    testDir = path.join(process.cwd(), 'test-temp', Date.now().toString());
    await fs.ensureDir(testDir);
    manager = new TaskManager(testDir);
    await manager.init();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(path.join(process.cwd(), 'test-temp'));
  });

  test('should initialize workspace', async () => {
    const storage = new Storage(testDir);
    expect(await storage.exists(path.join(testDir, '.seshflow/tasks.json'))).toBe(true);
  });

  test('should create a task', async () => {
    const task = manager.createTask({
      title: 'Test Task',
      description: 'Test description',
      priority: 'P1',
      tags: ['test', 'unit']
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.priority).toBe('P1');
    expect(task.tags).toEqual(['test', 'unit']);
  });

  test('should get task by ID', async () => {
    const created = manager.createTask({
      title: 'Test Task'
    });

    const found = manager.getTask(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
  });

  test('should update task', async () => {
    const task = manager.createTask({
      title: 'Original Title'
    });

    const updated = manager.updateTask(task.id, {
      title: 'Updated Title',
      priority: 'P0'
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.priority).toBe('P0');
  });

  test('should delete task', async () => {
    const task = manager.createTask({
      title: 'To Delete'
    });

    manager.deleteTask(task.id);
    const found = manager.getTask(task.id);

    expect(found).toBeUndefined();
  });

  test('should handle task dependencies', async () => {
    const task1 = manager.createTask({
      title: 'Task 1'
    });

    const task2 = manager.createTask({
      title: 'Task 2',
      dependencies: [task1.id]
    });

    expect(task2.dependencies).toContain(task1.id);
    expect(task2.blockedBy).toContain(task1.id);
  });

  test('should get next task', async () => {
    manager.createTask({
      title: 'Low Priority',
      priority: 'P3',
      status: 'todo'
    });

    const highPriority = manager.createTask({
      title: 'High Priority',
      priority: 'P0',
      status: 'todo'
    });

    const next = manager.getNextTask();
    expect(next.id).toBe(highPriority.id);
  });

  test('should start and end session', async () => {
    const task = manager.createTask({
      title: 'Session Task'
    });

    manager.startSession(task.id);
    let current = manager.getCurrentTask();
    expect(current.id).toBe(task.id);
    expect(current.status).toBe('in-progress');

    await manager.endSession('Test session');
    current = manager.getCurrentTask();
    expect(current).toBeNull();
  });

  test('should complete task', async () => {
    const task = manager.createTask({
      title: 'Complete Me'
    });

    await manager.completeTask(task.id, {
      hours: 4,
      note: 'All done'
    });

    const completed = manager.getTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.actualHours).toBe(4);
    expect(completed.completedAt).toBeDefined();
  });

  test('should add subtask', async () => {
    const task = manager.createTask({
      title: 'Parent Task'
    });

    const subtask = manager.addSubtask(task.id, 'Subtask 1');
    expect(subtask.title).toBe('Subtask 1');
    expect(task.subtasks).toHaveLength(1);
  });

  test('should toggle subtask', async () => {
    const task = manager.createTask({
      title: 'Parent Task'
    });

    const subtask = manager.addSubtask(task.id, 'Subtask 1');
    expect(subtask.completed).toBe(false);

    manager.toggleSubtask(task.id, subtask.id);
    const updated = manager.getTask(task.id);
    expect(updated.subtasks[0].completed).toBe(true);
  });
});
