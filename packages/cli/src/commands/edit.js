import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TaskManager } from '../core/task-manager.js';
import {
  isJSONMode,
  formatSuccessResponse,
  formatWorkspaceJSON,
  outputJSON,
  formatTaskJSON
} from '../utils/json-output.js';

export async function edit(taskId, options = {}) {
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

    const description = options.description ?? options.desc;
    const estimatedHours = options.hours ?? options.estimate;
    const hasDirectOptions =
      options.title !== undefined ||
      options.priority !== undefined ||
      options.status !== undefined ||
      description !== undefined ||
      estimatedHours !== undefined ||
      options.assignee !== undefined ||
      options.branch !== undefined ||
      options.tags !== undefined ||
      options.tag !== undefined;

    if (hasDirectOptions) {
      if (options.title) task.title = options.title;
      if (options.priority) task.priority = options.priority;
      if (options.status) task.status = options.status;
      if (description !== undefined) task.description = description;
      if (estimatedHours !== undefined) task.estimatedHours = parseFloat(estimatedHours);
      if (options.assignee) task.assignee = options.assignee;
      if (options.branch) task.gitBranch = options.branch;
      if (options.tags !== undefined || options.tag !== undefined) {
        const rawTags = options.tags ?? options.tag ?? '';
        task.tags = rawTags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      await manager.saveData();

      if (!isJSONMode(options)) {
        console.log(chalk.green(`\nTask updated: ${task.title}`));
        console.log(chalk.gray(`   ID: ${task.id}`));
      } else {
        const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
        outputJSON(formatSuccessResponse({
          updated: true,
          task: formatTaskJSON(task)
        }, workspaceJSON));
      }
      return;
    }

    if (!process.stdin.isTTY) {
      console.error(chalk.red('\nInteractive edit is not available in non-TTY environments.'));
      console.error(chalk.gray('   Use flags, e.g. seshflow edit <taskId> --title "..." --description "..."'));
      process.exit(1);
    }

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

    task.title = answers.title;
    task.priority = answers.priority;
    task.status = answers.status;
    task.description = answers.description;
    task.assignee = answers.assignee || null;
    task.gitBranch = answers.branch || task.gitBranch;

    const saveSpinner = ora('Saving changes').start();
    await manager.saveData();
    saveSpinner.succeed('Task updated');

    console.log(chalk.green(`\nUpdated task: ${task.title}`));
  } catch (error) {
    spinner.fail('Failed to edit task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
