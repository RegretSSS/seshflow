import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { TaskTransitionService } from '../core/task-transition-service.js';
import { formatErrorResponse, formatSuccessResponse, formatTaskJSON, formatWorkspaceJSON, isJSONMode, outputJSON } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';

export async function skip(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = (!compactMode && process.stdout.isTTY) ? ora('Skipping current task').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();
    const transitions = new TaskTransitionService(manager);

    const currentTask = manager.getCurrentTask();
    if (!currentTask) {
      spinner?.stop();
      if (isJSONMode(options)) {
        const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
        const nextTask = manager.getNextTask();
        outputJSON(formatSuccessResponse({
          action: 'skip',
          changed: false,
          task: null,
          hasActiveSession: false,
          nextTask: nextTask ? formatTaskJSON(nextTask) : null,
        }, workspaceJSON));
        return;
      }
      if (compactMode) {
        console.log('NO_ACTIVE_SESSION');
      } else {
        console.log(chalk.yellow('\nNo active session.'));
      }
      return;
    }

    const reason = options.reason || options.note || 'Skipped';

    const result = await transitions.skipCurrentTask({
      reason,
      note: reason,
      source: 'cli.skip',
    });
    await manager.saveData();

    const nextTask = manager.getNextTask();
    spinner?.succeed('Task skipped');

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        action: 'skip',
        changed: true,
        task: formatTaskJSON(currentTask),
        runtimeSummary: manager.getRuntimeSummary(currentTask),
        transitionEvent: result.transitionEvent,
        hasActiveSession: false,
        reason,
        nextTask: nextTask ? formatTaskJSON(nextTask) : null,
      }, workspaceJSON));
      return;
    }

    if (compactMode) {
      console.log(`SKIPPED | ${currentTask.id} | ${currentTask.title} | reason=${reason}`);
      if (nextTask) {
        console.log(`NEXT | ${nextTask.id} | ${nextTask.status} | ${nextTask.priority} | ${nextTask.title}`);
      }
      return;
    }

    console.log(chalk.yellow(`\nSkipped: ${currentTask.title}`));
    console.log(chalk.gray(`  ID: ${currentTask.id}`));
    console.log(chalk.gray(`  Reason: ${reason}`));

    if (nextTask) {
      console.log(chalk.blue('\nNext task:'), chalk.gray(`${nextTask.title} [${nextTask.priority}]`));
      console.log(chalk.gray('  Start with: seshflow next'));
    }
  } catch (error) {
    spinner?.fail('Failed to skip task');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'SKIP_FAILED'));
    }
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
