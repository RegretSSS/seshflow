import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { isJSONMode, formatErrorResponse, formatSuccessResponse, formatWorkspaceJSON, outputJSON } from '../utils/json-output.js';

function toPlainOptions(rawOptions = {}) {
  if (rawOptions && typeof rawOptions.opts === 'function') {
    return {
      ...rawOptions.opts(),
    };
  }

  return rawOptions || {};
}

function normalizeInput(taskIdOrOptions, maybeOptions) {
  if (typeof taskIdOrOptions === 'string') {
    return {
      taskId: taskIdOrOptions,
      options: toPlainOptions(maybeOptions),
    };
  }

  return {
    taskId: null,
    options: toPlainOptions(taskIdOrOptions),
  };
}

function resolveTargetTask(manager, taskId) {
  if (taskId) {
    return manager.getTask(taskId);
  }
  return manager.getCurrentTask();
}

function printProcessEntries(entries) {
  entries.forEach(entry => {
    const parts = [`pid=${entry.pid}`, `state=${entry.state}`];
    if (entry.command) parts.push(`cmd=${entry.command}`);
    if (entry.outputRoot) parts.push(`out=${entry.outputRoot}`);
    console.log(`PROCESS | ${parts.join(' | ')}`);
  });
}

export async function addProcess(taskIdOrOptions = {}, maybeOptions = {}) {
  const { taskId, options } = normalizeInput(taskIdOrOptions, maybeOptions);
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Registering process').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const targetTask = resolveTargetTask(manager, taskId);
    if (!targetTask) {
      spinner?.stop();
      const message = taskId ? `Task not found: ${taskId}` : 'No active session. Provide <taskId> or start a task first.';
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(new Error(message), taskId ? 'TASK_NOT_FOUND' : 'NO_ACTIVE_SESSION'));
      } else {
        console.error(chalk.red(`\n${message}`));
      }
      process.exit(1);
    }

    if (!options.pid) {
      spinner?.stop();
      const message = 'Process registration requires --pid.';
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(new Error(message), 'PID_REQUIRED'));
      } else {
        console.error(chalk.red(`\n${message}`));
      }
      process.exit(1);
    }

    const entry = manager.registerProcess(targetTask.id, {
      pid: options.pid,
      command: options.command || '',
      cwd: options.cwd || manager.storage.getWorkspacePath(),
      outputRoot: options.outputRoot || null,
      note: options.note || '',
      state: options.state || null,
    });
    await manager.saveData();
    spinner?.succeed('Process registered');

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        taskId: targetTask.id,
        processEntry: entry,
        processSummary: manager.getProcessSummary(targetTask),
      }, workspaceJSON));
      return;
    }

    printProcessEntries([entry]);
  } catch (error) {
    spinner?.fail('Failed to register process');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'PROCESS_ADD_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

export async function listProcesses(taskIdOrOptions = {}, maybeOptions = {}) {
  const { taskId, options } = normalizeInput(taskIdOrOptions, maybeOptions);
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Loading process registry').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const targetTask = resolveTargetTask(manager, taskId);
    if (!targetTask) {
      spinner?.stop();
      const message = taskId ? `Task not found: ${taskId}` : 'No active session. Provide <taskId> or start a task first.';
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(new Error(message), taskId ? 'TASK_NOT_FOUND' : 'NO_ACTIVE_SESSION'));
      } else {
        console.error(chalk.red(`\n${message}`));
      }
      process.exit(1);
    }

    if (options.refresh) {
      manager.refreshProcessStates(targetTask.id);
      await manager.saveData();
    }

    const refreshedTask = manager.getTask(targetTask.id);
    const entries = manager.getRecentProcessEntries(refreshedTask, Number.parseInt(options.limit, 10) || 20);
    spinner?.succeed('Process registry loaded');

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        taskId: refreshedTask.id,
        processes: entries,
        processSummary: manager.getProcessSummary(refreshedTask),
      }, workspaceJSON));
      return;
    }

    if (entries.length === 0) {
      console.log('NO_PROCESS');
      return;
    }

    printProcessEntries(entries);
  } catch (error) {
    spinner?.fail('Failed to load process registry');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'PROCESS_LIST_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
