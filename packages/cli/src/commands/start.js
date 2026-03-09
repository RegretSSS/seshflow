import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatErrorResponse, formatSuccessResponse, formatTaskJSON, formatWorkspaceJSON, isJSONMode, outputJSON } from '../utils/json-output.js';
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
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(new Error(`Task not found: ${taskId}`), 'TASK_NOT_FOUND'));
      }
      console.error(chalk.red(`\nTask not found: ${taskId}`));
      process.exit(1);
    }

    if (task.status === 'done' && !options.force) {
      spinner?.fail('Task already completed');
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(new Error('Task is already done. Use --force to reopen and start.'), 'TASK_ALREADY_DONE'));
      }
      console.error(chalk.yellow('\nTask is already done. Use --force to reopen and start.'));
      process.exit(1);
    }

    const currentTask = manager.getCurrentTask();
    if (currentTask && currentTask.id === task.id) {
      spinner?.stop();
      if (isJSONMode(options)) {
        const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
        outputJSON(formatSuccessResponse({
          action: 'start',
          changed: false,
          task: formatTaskJSON(task),
          runtimeSummary: manager.getRuntimeSummary(task),
          hasActiveSession: true,
          switched: false,
        }, workspaceJSON));
        return;
      }
      if (compactMode) {
        console.log(`ACTIVE | ${task.id} | ${task.status} | ${task.priority} | ${task.title}`);
      } else {
        console.log(chalk.yellow('\nTask is already active.'));
      }
      return;
    }

    if (currentTask && currentTask.id !== task.id) {
      if (!options.force && !options.switch) {
        spinner?.fail('Another session is active');
        if (isJSONMode(options)) {
          outputJSON(formatErrorResponse(new Error(`Session conflict: active task exists (${currentTask.id} | ${currentTask.title})`), 'SESSION_CONFLICT'));
        }
        console.error(chalk.yellow(`\nSession conflict: active task exists (${currentTask.id} | ${currentTask.title})`));
        console.error(chalk.gray('Use --switch to suspend the current task and continue here, or run seshflow suspend / done first.'));
        process.exit(1);
      }

      if (options.switch) {
        await manager.suspendCurrentTask(`Switched to ${task.id}`);
      } else {
        await manager.endSession('Switched by start --force');
        if (currentTask.status === 'in-progress') {
          manager.updateTask(currentTask.id, { status: 'backlog' });
        }
      }
    }

    const unmetDeps = manager.getUnmetDependencies(task);
    if (unmetDeps.length > 0 && !options.force) {
      spinner?.fail('Task has unmet dependencies');
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(new Error(`Cannot start task due to unmet dependencies: ${unmetDeps.map(dep => dep.id).join(', ')}`), 'UNMET_DEPENDENCIES'));
      }
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

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        action: 'start',
        changed: true,
        task: formatTaskJSON(task),
        runtimeSummary: manager.getRuntimeSummary(task),
        hasActiveSession: true,
        switched: Boolean(options.switch),
        previousTask: currentTask && currentTask.id !== task.id ? formatTaskJSON(currentTask) : null,
        unmetDependencies: unmetDeps.map(dep => ({
          id: dep.id,
          title: dep.title,
          status: dep.status,
          priority: dep.priority,
        })),
      }, workspaceJSON));
      return;
    }

    if (compactMode) {
      const subInfo = subTotal ? ` | subtasks=${subDone}/${subTotal}` : '';
      const switchInfo = options.switch ? ' | switched=true' : '';
      console.log(`STARTED | ${task.id} | in-progress | ${task.priority} | ${task.title}${subInfo}${switchInfo}`);
      return;
    }

    console.log(chalk.green(`\nStarted: ${task.title}`));
    console.log(chalk.gray(`  ID: ${task.id}`));
    console.log(chalk.gray(`  Priority: ${task.priority}`));
    if (options.switch) {
      console.log(chalk.gray('  Previous active task was suspended.'));
    }
    if (subTotal) {
      console.log(chalk.gray(`  Subtasks: ${subDone}/${subTotal}`));
    }
  } catch (error) {
    spinner?.fail('Failed to start task');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'START_FAILED'));
    }
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
