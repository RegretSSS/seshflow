import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import {
  formatValidationIssue,
  parseMarkdownFile,
  printMarkdownTaskFormatHints,
  validateParsedTasks,
} from './markdown-task-format.js';

function printIssues(errors, warnings) {
  console.error(chalk.red('\nErrors:'));
  errors.forEach(issue => console.error(chalk.red(`  - ${formatValidationIssue(issue)}`)));

  if (warnings.length > 0) {
    console.error(chalk.yellow('\nWarnings:'));
    warnings.forEach(issue => console.error(chalk.yellow(`  - ${formatValidationIssue(issue)}`)));
  }
}

export async function validateMarkdown(filePath) {
  const spinner = ora('Validating markdown task file').start();

  try {
    if (!(await fs.pathExists(filePath))) {
      spinner.fail('Validation failed');
      console.error(chalk.red(`\nFile not found: ${filePath}`));
      process.exit(1);
    }

    const parsed = await parseMarkdownFile(filePath);
    const tasks = parsed.tasks;
    const validation = validateParsedTasks(tasks);
    const errors = [...parsed.errors, ...validation.errors];
    const warnings = [...parsed.warnings, ...validation.warnings];

    if (tasks.length === 0) {
      errors.push({
        message: 'no task lines found',
        line: null,
        suggestion: 'start each task with "- [ ] Task title [id:task_example] [P1]"',
      });
    }

    if (errors.length > 0) {
      spinner.fail('Validation failed');
      printIssues(errors, warnings);
      printMarkdownTaskFormatHints(console.error);
      process.exit(1);
    }

    spinner.succeed('Validation passed');
    console.log(chalk.green(`\nTasks found: ${tasks.length}`));
    if (warnings.length > 0) {
      console.log(chalk.yellow(`Warnings: ${warnings.length}`));
      warnings.forEach(warning => console.log(chalk.yellow(`  - ${formatValidationIssue(warning)}`)));
    } else {
      console.log(chalk.green('Warnings: 0'));
    }
  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
