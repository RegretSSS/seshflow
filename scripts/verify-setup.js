#!/usr/bin/env node

/**
 * Verification script to test basic functionality
 */

import { TaskManager } from '../packages/cli/src/core/task-manager.js';
import { Storage } from '../packages/cli/src/core/storage.js';
import path from 'path';
import { promises as fs } from 'fs';

console.log('🧪 Testing Seshflow Core...\n');

// Create test directory
const testDir = path.join(process.cwd(), 'test-verification');

async function runTests() {
  try {
    // Clean up any existing test directory
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });

    console.log('✓ Test directory created');

    // Test 1: Storage initialization
    console.log('\n📦 Testing Storage...');
    const storage = new Storage(testDir);
    await storage.init();

    const tasksFile = path.join(testDir, '.seshflow/tasks.json');
    const exists = await storage.exists(tasksFile);
    if (!exists) throw new Error('Tasks file not created');
    console.log('✓ Storage initialized successfully');

    // Test 2: TaskManager initialization
    console.log('\n🎯 Testing TaskManager...');
    const manager = new TaskManager(testDir);
    await manager.init();
    console.log('✓ TaskManager initialized successfully');

    // Test 3: Create task
    console.log('\n➕ Testing task creation...');
    const task1 = manager.createTask({
      title: 'Design database schema',
      description: 'Design user and article tables',
      priority: 'P0',
      tags: ['database', 'design'],
      estimatedHours: 4
    });

    if (!task1.id) throw new Error('Task ID not generated');
    console.log(`✓ Task created: ${task1.title} (${task1.id})`);

    // Test 4: Create dependent task
    const task2 = manager.createTask({
      title: 'Implement API',
      description: 'Implement RESTful endpoints',
      priority: 'P1',
      dependencies: [task1.id],
      estimatedHours: 8
    });

    if (!task2.dependencies.includes(task1.id)) {
      throw new Error('Dependency not set correctly');
    }
    console.log(`✓ Dependent task created: ${task2.title}`);

    // Test 5: Get next task
    console.log('\n🔜 Testing next task selection...');
    const nextTask = manager.getNextTask();
    if (nextTask.id !== task1.id) {
      throw new Error('Should return task1 (no dependencies)');
    }
    console.log(`✓ Next task selected: ${nextTask.title}`);

    // Test 6: Start session
    console.log('\n▶️  Testing session start...');
    manager.startSession(task1.id);
    const currentTask = manager.getCurrentTask();
    if (currentTask.id !== task1.id) throw new Error('Session not started');
    if (currentTask.status !== 'in-progress') {
      throw new Error('Task status not updated');
    }
    console.log(`✓ Session started for: ${currentTask.title}`);

    // Test 7: Add subtask
    console.log('\n📝 Testing subtask addition...');
    const subtask = manager.addSubtask(task1.id, 'Design user table');
    if (!subtask.id) throw new Error('Subtask ID not generated');
    console.log(`✓ Subtask added: ${subtask.title}`);

    // Test 8: Toggle subtask
    manager.toggleSubtask(task1.id, subtask.id);
    const updated = manager.getTask(task1.id);
    if (!updated.subtasks[0].completed) {
      throw new Error('Subtask not toggled');
    }
    console.log('✓ Subtask toggled');

    // Test 9: Complete task
    console.log('\n✅ Testing task completion...');
    await manager.completeTask(task1.id, {
      hours: 3.5,
      note: 'Database design completed'
    });

    const completed = manager.getTask(task1.id);
    if (completed.status !== 'done') {
      throw new Error('Task not marked as done');
    }
    console.log(`✓ Task completed: ${completed.title}`);

    // Test 10: Persistence
    console.log('\n💾 Testing data persistence...');
    const newManager = new TaskManager(testDir);
    await newManager.init();

    const loaded = newManager.getTask(task1.id);
    if (!loaded || loaded.status !== 'done') {
      throw new Error('Data not persisted correctly');
    }
    console.log('✓ Data persisted and loaded correctly');

    // Test 11: Statistics
    console.log('\n📊 Testing statistics...');
    const stats = newManager.getStatistics();
    if (stats.totalTasks !== 2) {
      throw new Error('Statistics incorrect');
    }
    console.log(`✓ Statistics: ${stats.totalTasks} tasks, ${stats.completedTasks} completed`);

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('✓ Test directory removed');

    console.log('\n✨ All tests passed!\n');
    console.log('📋 Summary:');
    console.log('   • Storage layer working');
    console.log('   • Task creation and management');
    console.log('   • Dependencies handling');
    console.log('   • Session management');
    console.log('   • Task completion');
    console.log('   • Data persistence');
    console.log('   • Statistics calculation');
    console.log('\n🚀 Seshflow core is ready for use!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await fs.rm(testDir, { recursive: true, force: true });
    process.exit(1);
  }
}

runTests();
