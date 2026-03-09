import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { TaskTransitionService } from '../core/task-transition-service.js';
import { formatErrorResponse, formatSuccessResponse, formatTaskJSON, formatWorkspaceJSON, isJSONMode, outputJSON } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';

export async function start(taskId, options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = (!compactMode && process.stdout.isTTY) ? ora('Starting task').start() : null;
  let manager;

  try {
    manager = new TaskManager();
    await manager.init();
    const transitions = new TaskTransitionService(manager);

    const task = manager.getTask(taskId);
    if (!task) {
      spinner?.fail('Task not found');
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(new Error(`Task not found: ${taskId}`), 'TASK_NOT_FOUND'));
      }
      console.error(chalk.red(`\nTask not found: ${taskId}`));
      process.exit(1);
    }

    const result = await transitions.startTask(task.id, {
      force: options.force,
      switch: options.switch,
      source: 'cli.start',
    });
    await manager.saveData();
    spinner?.succeed('Task started');

    const subTotal = task.subtasks?.length || 0;
    const subDone = task.subtasks?.filter(st => st.completed).length || 0;

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        action: 'start',
        changed: result.changed,
        task: formatTaskJSON(task),
        runtimeSummary: manager.getRuntimeSummary(task),
        hasActiveSession: true,
        switched: result.switched,
        previousTask: result.previousTask ? formatTaskJSON(result.previousTask) : null,
        unmetDependencies: result.unmetDependencies.map(dep => ({
          id: dep.id,
          title: dep.title,
          status: dep.status,
          priority: dep.priority,
        })),
        transitionEvent: result.transitionEvent,
      }, workspaceJSON));
      return;
    }

    if (compactMode) {
      const subInfo = subTotal ? ` | subtasks=${subDone}/${subTotal}` : '';
      const switchInfo = result.switched ? ' | switched=true' : '';
      console.log(`${result.changed ? 'STARTED' : 'ACTIVE'} | ${task.id} | in-progress | ${task.priority} | ${task.title}${subInfo}${switchInfo}`);
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
    if (manager) {
      try {
        await manager.saveData();
      } catch {
        // Best-effort persistence for hook/runtime failures.
      }
    }
    spinner?.fail('Failed to start task');
    if (isJSONMode(options)) {
      const code = error.message.includes('Session conflict')
        ? 'SESSION_CONFLICT'
        : error.message.includes('unmet dependencies')
          ? 'UNMET_DEPENDENCIES'
          : error.message.includes('already done')
            ? 'TASK_ALREADY_DONE'
            : 'START_FAILED';
      outputJSON(formatErrorResponse(error, code));
    }
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
