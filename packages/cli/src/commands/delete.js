import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON } from '../utils/json-output.js';

export async function deleteTask(taskId, options = {}) {
  const spinner = ora('Loading task').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    const task = manager.getTask(taskId);
    if (!task) {
      spinner.stop();
      console.error(chalk.red(`\nTask not found: ${taskId}`));
      console.error(chalk.gray("   Use 'seshflow list' to see all tasks"));
      process.exit(1);
    }

    spinner.stop();

    const dependentTasks = manager.getTasks().filter(candidate => candidate.dependencies.includes(taskId));
    const blockedByTasks = manager.getBlockedBy(task);

    if (!options.force) {
      let hasWarnings = false;

      if (dependentTasks.length > 0) {
        hasWarnings = true;
        console.log(chalk.yellow('\nWarning: This task is being depended on by:'));
        dependentTasks.forEach(dep => {
          console.log(chalk.gray(`   - ${dep.id}: ${dep.title}`));
        });
      }

      if (blockedByTasks.length > 0) {
        hasWarnings = true;
        console.log(chalk.yellow('\nWarning: This task depends on:'));
        blockedByTasks.forEach(blocker => {
          const blockerTask = manager.getTask(blocker) || blocker;
          if (typeof blockerTask === 'string') {
            console.log(chalk.gray(`   - ${blockerTask}`));
          } else {
            console.log(chalk.gray(`   - ${blockerTask.id}: ${blockerTask.title}`));
          }
        });
      }

      if (hasWarnings) {
        console.log(chalk.yellow('\nTip: Use --force to delete anyway'));
        console.log(chalk.gray('   This will remove the task from all dependency lists\n'));

        if (!isJSONMode(options)) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const answer = await new Promise(resolve => {
            rl.question(chalk.yellow('Delete this task? (yes/no): '), resolve);
          });
          rl.close();

          if (!['yes', 'y'].includes(String(answer).toLowerCase())) {
            console.log(chalk.gray('\nDelete cancelled'));
            process.exit(0);
          }
        }
      }
    }

    const deleteSpinner = ora('Deleting task').start();
    manager.deleteTask(taskId);
    await manager.saveData();
    deleteSpinner.succeed('Task deleted');

    if (!isJSONMode(options)) {
      console.log(chalk.green(`\nDeleted task: ${task.title}`));
      console.log(chalk.gray(`   ID: ${task.id}`));

      if (dependentTasks.length > 0 && !options.force) {
        console.log(chalk.cyan('\nNote: dependent tasks had their dependencies updated'));
      }
    } else {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        deleted: true,
        taskId,
        taskTitle: task.title,
        dependentTasksUpdated: dependentTasks.length > 0
      }, workspaceJSON));
    }
  } catch (error) {
    if (!isJSONMode(options)) {
      console.error(chalk.red(`\nError: ${error.message}`));
    } else {
      outputJSON({
        success: false,
        error: error.message
      });
    }
    process.exit(1);
  }
}
