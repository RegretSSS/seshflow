import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { resolveOutputMode } from '../utils/output-mode.js';

export async function suspend(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = (!compactMode && process.stdout.isTTY) ? ora('Suspending current task').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const currentTask = manager.getCurrentTask();
    if (!currentTask) {
      spinner?.stop();
      if (compactMode) {
        console.log('NO_ACTIVE_SESSION');
      } else {
        console.log(chalk.yellow('\nNo active session.'));
      }
      return;
    }

    const reason = options.reason || options.note || 'Suspended';
    const suspendedTask = await manager.suspendCurrentTask(reason);
    await manager.saveData();

    const nextTask = manager.getNextTask();
    spinner?.succeed('Task suspended');

    if (compactMode) {
      console.log(`SUSPENDED | ${suspendedTask.id} | ${suspendedTask.title} | reason=${reason}`);
      if (nextTask) {
        console.log(`NEXT | ${nextTask.id} | ${nextTask.status} | ${nextTask.priority} | ${nextTask.title}`);
      }
      return;
    }

    console.log(chalk.yellow(`\nSuspended: ${suspendedTask.title}`));
    console.log(chalk.gray(`  ID: ${suspendedTask.id}`));
    console.log(chalk.gray(`  Reason: ${reason}`));

    if (nextTask) {
      console.log(chalk.blue('\nNext task:'), chalk.gray(`${nextTask.title} [${nextTask.priority}]`));
      console.log(chalk.gray('  Start with: seshflow next'));
    }
  } catch (error) {
    spinner?.fail('Failed to suspend task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
