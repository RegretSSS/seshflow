import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TaskManager } from '../core/task-manager.js';
import { TaskTransitionService } from '../core/task-transition-service.js';
import {
  formatErrorResponse,
  formatRuntimeSummaryJSON,
  formatSuccessResponse,
  formatTaskActionJSON,
  formatWorkspaceJSON,
  isJSONMode,
  outputJSON
} from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';
import { omitEmptyFields } from '../utils/helpers.js';
import { handlePreInitGuard } from '../utils/workspace-guard.js';

function getProgress(tasks) {
  const total = tasks.length;
  const done = tasks.filter(task => task.status === 'done').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percent };
}

function getUnlockedTasks(tasks, completedTaskId) {
  return tasks.filter(task => {
    if (task.id === completedTaskId || task.status === 'done') {
      return false;
    }
    if (!task.dependencies || !task.dependencies.includes(completedTaskId)) {
      return false;
    }

    const remainingDeps = task.dependencies.filter(depId => depId !== completedTaskId);
    const hasUnmetRemaining = remainingDeps.some(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask && depTask.status !== 'done';
    });

    return !hasUnmetRemaining;
  });
}

function normalizeDoneInput(taskIdOrOptions, maybeOptions) {
  const normalizeOptions = (rawOptions = {}) => {
    if (rawOptions && typeof rawOptions.opts === 'function') {
      return {
        ...rawOptions.opts(),
      };
    }

    return rawOptions || {};
  };

  if (typeof taskIdOrOptions === 'string') {
    return {
      taskId: taskIdOrOptions,
      options: normalizeOptions(maybeOptions),
      fromExplicitTaskId: true,
    };
  }

  return {
    taskId: null,
    options: normalizeOptions(taskIdOrOptions),
    fromExplicitTaskId: false,
  };
}

export async function done(taskIdOrOptions = {}, maybeOptions = {}) {
  const { taskId, options, fromExplicitTaskId } = normalizeDoneInput(taskIdOrOptions, maybeOptions);
  if (handlePreInitGuard('done', options)) {
    process.exit(1);
  }

  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = compactMode ? null : ora('Loading workspace').start();
  let manager;

  try {
    manager = new TaskManager();
    await manager.init();
    const transitions = new TaskTransitionService(manager);

    let targetTask = null;
    const currentTask = manager.getCurrentTask();
    if (fromExplicitTaskId) {
      targetTask = manager.getTask(taskId);
      if (!targetTask) {
        spinner?.stop();
        if (isJSONMode(options)) {
          outputJSON(formatErrorResponse(new Error(`Task not found: ${taskId}`), 'TASK_NOT_FOUND'));
        }
        console.error(chalk.red(`\nTask not found: ${taskId}`));
        console.error(chalk.gray(`  Use 'seshflow list' to see all tasks`));
        process.exit(1);
      }
    } else {
      targetTask = currentTask;
    }

    if (!targetTask) {
      spinner?.stop();
      if (isJSONMode(options)) {
        const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length, { compact: true });
        const nextTask = manager.getNextTask();
        outputJSON(formatSuccessResponse(omitEmptyFields({
          action: 'done',
          changed: false,
          task: null,
          hasActiveSession: false,
          nextTask: nextTask ? formatTaskActionJSON(nextTask) : undefined,
        }), workspaceJSON));
        return;
      }
      if (compactMode) {
        console.log('NO_ACTIVE_SESSION');
      } else {
        console.log(chalk.yellow('\nNo active session.'));
        console.log(chalk.gray('  Start a task with: seshflow next'));
      }
      return;
    }

    const allTasksBefore = manager.getTasks();
    const progressBefore = getProgress(allTasksBefore);

    spinner?.stop();

    let hours = options.hours;
    let note = options.note || '';

    if (!hours && !note && process.stdin.isTTY) {
      const answers = await inquirer.prompt([
        {
          type: 'number',
          name: 'hours',
          message: 'Hours spent:',
          default: 0
        },
        {
          type: 'editor',
          name: 'note',
          message: 'Completion notes:',
          default: ''
        }
      ]);
      hours = answers.hours;
      note = answers.note;
    }

    const completeSpinner = compactMode ? null : ora('Completing task').start();
    const result = await transitions.completeTask(targetTask.id, {
      hours,
      note,
      source: 'cli.done',
    });
    await manager.saveData();
    completeSpinner?.succeed('Task completed');

    const allTasksAfter = manager.getTasks();
    const progressAfter = getProgress(allTasksAfter);
    const unlockedTasks = getUnlockedTasks(allTasksAfter, targetTask.id);
    const nextTask = manager.getNextTask();

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length, { compact: true });
      outputJSON(formatSuccessResponse(omitEmptyFields({
        action: 'done',
        changed: true,
        task: formatTaskActionJSON(targetTask),
        runtimeSummary: formatRuntimeSummaryJSON(manager.getRuntimeSummary(targetTask)),
        announcementResults: result.announcementResults?.length ? result.announcementResults : undefined,
        transitionEvent: result.transitionEvent,
        hasActiveSession: false,
        hours: hours ? Number.parseFloat(hours) : null,
        note: note || undefined,
        progress: {
          before: progressBefore,
          after: progressAfter,
        },
        unlockedTasks: unlockedTasks.length > 0 ? unlockedTasks.map(task => formatTaskActionJSON(task)) : undefined,
        nextTask: nextTask ? formatTaskActionJSON(nextTask) : undefined,
      }), workspaceJSON));
      return;
    }

    if (compactMode) {
      const announcementInfo = result.announcementResults?.length ? ` | announcements=${result.announcementResults.length}` : '';
      console.log(`DONE | ${targetTask.id} | ${targetTask.title}${hours ? ` | hours=${hours}` : ''}${announcementInfo}`);
      console.log(`PROGRESS | ${progressBefore.done}/${progressBefore.total} -> ${progressAfter.done}/${progressAfter.total} (${progressAfter.percent}%)`);
      if (unlockedTasks.length > 0) {
        console.log(`UNLOCKED | ${unlockedTasks.map(task => task.id).join(',')}`);
      }
      if (nextTask) {
        console.log(`NEXT | ${nextTask.id} | ${nextTask.status} | ${nextTask.priority} | ${nextTask.title}`);
      }
      return;
    }

    console.log(chalk.green(`\nTask completed: ${targetTask.title}`));
    console.log(chalk.gray(`  ID: ${targetTask.id}`));
    if (hours) {
      console.log(chalk.gray(`  Time: ${hours}h`));
    }
    if (note) {
      console.log(chalk.gray(`  Notes: ${note}`));
    }

    console.log(chalk.blue('\nProgress:'));
    console.log(chalk.gray(`  ${progressBefore.done}/${progressBefore.total} -> ${progressAfter.done}/${progressAfter.total} (${progressAfter.percent}%)`));

    if (unlockedTasks.length > 0) {
      console.log(chalk.blue('\nUnlocked tasks:'));
      unlockedTasks.forEach(task => {
        console.log(chalk.gray(`  - ${task.title} [${task.priority}] (${task.id})`));
      });
    }

    if (nextTask) {
      console.log(chalk.blue('\nNext task:'), chalk.gray(`${nextTask.title} [${nextTask.priority}]`));
      console.log(chalk.gray('  Start with: seshflow next'));
    } else {
      console.log(chalk.green('\nAll tasks completed.'));
    }
  } catch (error) {
    if (manager) {
      try {
        await manager.saveData();
      } catch {
        // Best-effort persistence for hook/runtime failures.
      }
    }
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'DONE_FAILED'));
    }
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

export async function completeTask(taskId, options = {}) {
  return done(taskId, options);
}
