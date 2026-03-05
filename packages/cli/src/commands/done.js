import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TaskManager } from '../core/task-manager.js';

/**
 * Complete current task
 */
export async function done(options = {}) {
  const spinner = ora('Loading workspace').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    // Get current session
    const currentTask = manager.getCurrentTask();
    if (!currentTask) {
      spinner.stop();
      console.log(chalk.yellow('\n⚠️  No active session'));
      console.log(
        chalk.gray('   Start a task with: seshflow next')
      );
      return;
    }

    spinner.stop();

    // Prompt for completion details if not provided
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

    // Complete task
    const completeSpinner = ora('Completing task').start();
    await manager.completeTask(currentTask.id, {
      hours,
      note
    });
    await manager.saveData();
    completeSpinner.succeed('Task completed');

    // Display summary
    console.log(chalk.green(`\n✓ Task completed: ${currentTask.title}`));
    console.log(chalk.gray(`  ID: ${currentTask.id}`));
    if (hours) {
      console.log(chalk.gray(`  Time: ${hours}h`));
    }
    if (note) {
      console.log(chalk.gray(`  Notes: ${note}`));
    }

    // Get next task
    const nextTask = manager.getNextTask();
    if (nextTask) {
      console.log(chalk.blue('\nNext task:'), chalk.gray(nextTask.title));
      console.log(chalk.gray('  Start with: seshflow next'));
    } else {
      console.log(chalk.green('\n🎉 All tasks completed!'));
    }
  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Complete a specific task by ID
 */
export async function completeTask(taskId, options = {}) {
  const spinner = ora('Completing task').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    const task = manager.getTask(taskId);
    if (!task) {
      spinner.stop();
      console.error(chalk.red(`\n✖ Task not found: ${taskId}`));
      console.error(chalk.gray(`   Use 'seshflow list' to see all tasks`));
      process.exit(1);
    }

    await manager.completeTask(taskId, {
      hours: options.hours,
      note: options.note || ''
    });
    await manager.saveData();

    spinner.succeed('Task completed');

    console.log(chalk.green(`\n✓ ${task.title}`));
  } catch (error) {
    spinner.fail('Failed to complete task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
