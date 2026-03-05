import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON } from '../utils/json-output.js';

/**
 * Delete a task
 */
export async function deleteTask(taskId, options = {}) {
  const spinner = ora('Loading task').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    // Find task
    const task = manager.getTask(taskId);

    if (!task) {
      spinner.stop();
      console.error(chalk.red(`\n✖ Task not found: ${taskId}`));
      console.error(chalk.gray(`   Use 'seshflow list' to see all tasks`));
      process.exit(1);
    }

    spinner.stop();

    // Check for dependencies
    const dependentTasks = manager.getTasks().filter(t =>
      t.dependencies.includes(taskId)
    );

    const blockedByTasks = task.blockedBy || [];

    // Show warnings unless --force is used
    if (!options.force) {
      let hasWarnings = false;

      if (dependentTasks.length > 0) {
        hasWarnings = true;
        console.log(chalk.yellow('\n⚠️  Warning: This task is being depended on by:'));
        dependentTasks.forEach(dep => {
          console.log(chalk.gray(`   • ${dep.id}: ${dep.title}`));
        });
      }

      if (blockedByTasks.length > 0) {
        hasWarnings = true;
        console.log(chalk.yellow('\n⚠️  Warning: This task depends on:'));
        blockedByTasks.forEach(blocker => {
          console.log(chalk.gray(`   • ${blocker.id}: ${blocker.title}`));
        });
      }

      if (hasWarnings) {
        console.log(chalk.yellow('\n💡 Tip: Use --force to delete anyway'));
        console.log(chalk.gray('   This will remove the task from all dependency lists\n'));

        // In non-JSON mode, ask for confirmation
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

          if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
            console.log(chalk.gray('\n✖ Delete cancelled'));
            process.exit(0);
          }
        }
      }
    }

    // Delete the task
    const deleteSpinner = ora('Deleting task').start();

    try {
      manager.deleteTask(taskId);
      await manager.saveData();
      deleteSpinner.succeed('Task deleted');
    } catch (error) {
      deleteSpinner.fail('Failed to delete task');
      throw error;
    }

    // Show success message
    if (!isJSONMode(options)) {
      console.log(chalk.green(`\n✓ Deleted task: ${task.title}`));
      console.log(chalk.gray(`   ID: ${task.id}`));

      if (dependentTasks.length > 0 && !options.force) {
        console.log(chalk.cyan('\n📝 Note: Dependent tasks had their dependencies updated'));
      }
    } else {
      outputJSON(formatSuccessResponse({
        deleted: true,
        taskId: taskId,
        taskTitle: task.title,
        dependentTasksUpdated: dependentTasks.length > 0
      }, formatWorkspaceJSON(manager.storage, manager.getTasks().length)));
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
