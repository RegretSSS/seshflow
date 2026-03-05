import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { resolveOutputMode } from '../utils/output-mode.js';

export async function start(taskId, options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = (!compactMode && process.stdout.isTTY) ? ora('Starting task').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const task = manager.getTask(taskId);
    if (!task) {
      spinner?.fail('Task not found');
      console.error(chalk.red(`\nTask not found: ${taskId}`));
      process.exit(1);
    }

    if (task.status === 'done' && !options.force) {
      spinner?.fail('Task already completed');
      console.error(chalk.yellow('\nTask is already done. Use --force to reopen and start.'));
      process.exit(1);
    }

    const currentTask = manager.getCurrentTask();
    if (currentTask && currentTask.id === task.id) {
      spinner?.stop();
      if (compactMode) {
        console.log(`ACTIVE | ${task.id} | ${task.status} | ${task.priority} | ${task.title}`);
      } else {
        console.log(chalk.yellow('\nTask is already active.'));
      }
      return;
    }

    if (currentTask && currentTask.id !== task.id) {
      if (!options.force) {
        spinner?.fail('Another session is active');
        console.error(chalk.yellow(`\nSession conflict: active task exists (${currentTask.id} | ${currentTask.title})`));
        console.error(chalk.gray('Use --force to switch task, or run seshflow done / seshflow skip first.'));
        process.exit(1);
      }

      await manager.endSession('Switched by start --force');
      if (currentTask.status === 'in-progress') {
        manager.updateTask(currentTask.id, { status: 'backlog' });
      }
    }

    const unmetDeps = manager.getUnmetDependencies(task);
    if (unmetDeps.length > 0 && !options.force) {
      spinner?.fail('Task has unmet dependencies');
      console.error(chalk.yellow('\nCannot start task due to unmet dependencies:'));
      unmetDeps.forEach(dep => console.error(chalk.gray(`  - ${dep.id} | ${dep.status} | ${dep.title}`)));
      console.error(chalk.gray('Use --force to start anyway.'));
      process.exit(1);
    }

    if (task.status === 'done' && options.force) {
      manager.updateTask(task.id, { status: 'backlog', completedAt: null });
    }

    manager.startSession(task.id);
    await manager.saveData();
    spinner?.succeed('Task started');

    const subTotal = task.subtasks?.length || 0;
    const subDone = task.subtasks?.filter(st => st.completed).length || 0;

    if (compactMode) {
      const subInfo = subTotal ? ` | subtasks=${subDone}/${subTotal}` : '';
      console.log(`STARTED | ${task.id} | in-progress | ${task.priority} | ${task.title}${subInfo}`);
      return;
    }

    console.log(chalk.green(`\nStarted: ${task.title}`));
    console.log(chalk.gray(`  ID: ${task.id}`));
    console.log(chalk.gray(`  Priority: ${task.priority}`));
    if (subTotal) {
      console.log(chalk.gray(`  Subtasks: ${subDone}/${subTotal}`));
    }
  } catch (error) {
    spinner?.fail('Failed to start task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
