import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TaskManager } from '../core/task-manager.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON, formatTaskJSON } from '../utils/json-output.js';

/**
 * Edit a task interactively
 */
export async function edit(taskId, options = {}) {
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

    // If direct options provided, use them
    if (options.title || options.priority || options.status || options.description !== undefined) {
      // Non-interactive mode
      if (options.title) task.title = options.title;
      if (options.priority) task.priority = options.priority;
      if (options.status) task.status = options.status;
      if (options.description !== undefined) task.description = options.description;
      if (options.estimate) task.estimatedHours = parseFloat(options.estimate);
      if (options.assignee) task.assignee = options.assignee;
      if (options.branch) task.gitBranch = options.branch;

      await manager.saveData();

      if (!isJSONMode(options)) {
        console.log(chalk.green(`\n✓ Task updated: ${task.title}`));
        console.log(chalk.gray(`   ID: ${task.id}`));
      } else {
        outputJSON(formatSuccessResponse({
          updated: true,
          task: formatTaskJSON(task)
        }, formatWorkspaceJSON(manager.storage, manager.getTasks().length)));
      }
      return;
    }

    // Interactive mode
    console.log(chalk.cyan(`\nEditing task: ${task.title}`));
    console.log(chalk.gray(`ID: ${task.id}\n`));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Title:',
        default: task.title
      },
      {
        type: 'list',
        name: 'priority',
        message: 'Priority:',
        choices: ['P0', 'P1', 'P2', 'P3'],
        default: task.priority
      },
      {
        type: 'list',
        name: 'status',
        message: 'Status:',
        choices: ['backlog', 'todo', 'in-progress', 'done'],
        default: task.status
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: task.description || ''
      },
      {
        type: 'input',
        name: 'assignee',
        message: 'Assignee:',
        default: task.assignee || ''
      },
      {
        type: 'input',
        name: 'branch',
        message: 'Git Branch:',
        default: task.gitBranch || ''
      }
    ]);

    // Update task
    task.title = answers.title;
    task.priority = answers.priority;
    task.status = answers.status;
    task.description = answers.description;
    if (answers.assignee) task.assignee = answers.assignee;
    if (answers.branch) task.gitBranch = answers.branch;

    // Save
    const saveSpinner = ora('Saving changes').start();
    await manager.saveData();
    saveSpinner.succeed('Task updated');

    console.log(chalk.green(`\n✓ Updated task: ${task.title}`));

  } catch (error) {
    spinner.fail('Failed to edit task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
