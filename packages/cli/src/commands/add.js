import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TaskManager } from '../core/task-manager.js';
import { isValidPriority, truncate } from '../utils/helpers.js';

/**
 * Add a new task
 */
export async function add(title, options = {}) {
  try {
    const manager = new TaskManager();
    await manager.init();

    let description = options.description ?? options.desc ?? '';

    // Interactive description input if not provided
    if (!description && process.stdin.isTTY) {
      const answers = await inquirer.prompt([
        {
          type: 'editor',
          name: 'description',
          message: 'Enter task description (Markdown supported):',
          default: description
        }
      ]);
      description = answers.description;
    }

    // Parse tags
    const tags = options.tags
      ? options.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    // Parse dependencies
    const dependencies = options.depends
      ? options.depends.split(',').map(d => d.trim()).filter(Boolean)
      : [];

    // Validate priority
    const priority = isValidPriority(options.priority)
      ? options.priority
      : 'P2';

    // Validate dependencies
    const invalidDeps = manager.validateDependencies(dependencies);
    if (invalidDeps.length > 0) {
      console.warn(
        chalk.yellow(
          `\n⚠️  Warning: The following task dependencies do not exist: ${invalidDeps.join(
            ', '
          )}`
        )
      );
    }

    // Create task
    const spinner = ora('Creating task').start();

    const task = manager.createTask({
      title,
      description,
      priority,
      tags,
      dependencies,
      estimatedHours: (options.hours ?? options.estimate) ? parseFloat(options.hours ?? options.estimate) : 0,
      assignee: options.assignee || null,
      branch: options.branch || null
    });

    await manager.saveData();
    spinner.succeed('Task created');

    // Display task info
    console.log(chalk.green(`\n✓ Task: ${chalk.bold(task.title)}`));
    console.log(chalk.gray(`  ID: ${task.id}`));
    console.log(chalk.gray(`  Priority: ${task.priority}`));
    if (description) {
      console.log(chalk.gray(`  Description: ${truncate(description, 80)}`));
    }
    if (tags.length > 0) {
      console.log(chalk.gray(`  Tags: ${tags.join(', ')}`));
    }
    if (dependencies.length > 0) {
      console.log(chalk.gray(`  Dependencies: ${dependencies.join(', ')}`));
    }
    if (task.estimatedHours > 0) {
      console.log(chalk.gray(`  Estimated: ${task.estimatedHours}h`));
    }

    console.log(chalk.blue('\nNext:'), chalk.gray('seshflow next'));
  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
