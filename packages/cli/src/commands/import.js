import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import crypto from 'crypto';
import { TaskManager } from '../core/task-manager.js';
import {
  formatValidationIssue,
  parseMarkdownFile,
  printMarkdownTaskFormatHints,
  validateParsedTasks,
} from './markdown-task-format.js';

/**
 * Generate task hash for deduplication.
 */
function generateTaskHash(title, description) {
  const content = `${title.trim()}\n${(description || '').trim()}`;
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}

/**
 * Resolve dependencies from numbers/indices to task IDs.
 */
function resolveDependencies(createdTasks, knownTasks = []) {
  const resolveDependencyRef = (dep) => {
    const value = String(dep).trim();
    if (!value) return null;

    const numericIndex = Number.parseInt(value, 10);
    if (Number.isInteger(numericIndex) && numericIndex > 0) {
      const indexedTask = createdTasks[numericIndex - 1];
      if (indexedTask) return indexedTask.id;
    }

    if (knownTasks.some(task => task.id === value)) {
      return value;
    }

    const byTitle = createdTasks.find(task => task.title === value)
      || knownTasks.find(task => task.title === value);
    if (byTitle) return byTitle.id;

    return value;
  };

  createdTasks.forEach((task) => {
    if (task.dependencies && task.dependencies.length > 0) {
      const resolvedDeps = task.dependencies
        .map(resolveDependencyRef)
        .filter(Boolean);

      task.dependencies = [...new Set(resolvedDeps)];
    }
  });
}

function buildPlanningUpdatePayload(existingTask, taskData) {
  return {
    title: taskData.title,
    description: taskData.description,
    priority: taskData.priority,
    tags: taskData.tags,
    estimatedHours: taskData.estimatedHours,
    assignee: taskData.assignee,
    dependencies: taskData.dependencies,
    contractIds: taskData.contractIds,
    contractRole: taskData.contractRoleSpecified ? taskData.contractRole : (existingTask.contractRole || null),
    boundFiles: taskData.boundFiles,
    subtasks: taskData.subtasks || [],
  };
}

/**
 * Import tasks from a managed Markdown planning file.
 */
export async function importTasks(filePath, options = {}) {
  const spinner = process.stdout.isTTY ? ora('Loading and parsing tasks').start() : null;

  try {
    if (!(await fs.pathExists(filePath))) {
      spinner?.fail('File not found');
      console.error(chalk.red(`\nError: File not found: ${filePath}`));
      process.exit(1);
    }

    if (spinner) spinner.text = 'Parsing markdown file';
    const parsed = await parseMarkdownFile(filePath);
    const tasks = parsed.tasks;

    if (tasks.length === 0) {
      spinner?.warn('No tasks found');
      console.log(chalk.yellow('\nNo tasks found in the file.'));
      printMarkdownTaskFormatHints(console.log);
      return;
    }

    if (spinner) spinner.text = 'Validating tasks';
    const validation = validateParsedTasks(tasks);
    const errors = [...parsed.errors, ...validation.errors];
    const warnings = [...parsed.warnings, ...validation.warnings];

    if (errors.length > 0) {
      spinner?.fail('Validation failed');
      console.error(chalk.red('\nValidation errors:'));
      errors.forEach(error => console.error(chalk.red(`  - ${formatValidationIssue(error)}`)));
      if (warnings.length > 0) {
        console.error(chalk.yellow('\nWarnings:'));
        warnings.forEach(warning => console.error(chalk.yellow(`  - ${formatValidationIssue(warning)}`)));
      }
      printMarkdownTaskFormatHints(console.error);
      process.exit(1);
    }

    if (warnings.length > 0 && !options.force) {
      spinner?.warn('Validation warnings');
      console.log(chalk.yellow('\nWarnings:'));
      warnings.forEach(warning => console.log(chalk.yellow(`  - ${formatValidationIssue(warning)}`)));

      if (!options.dryRun) {
        console.log(chalk.gray('\nUse --force to ignore warnings'));
      }
    }

    if (options.dryRun) {
      spinner?.succeed('Dry run completed');
      console.log(chalk.green(`\nWould import ${tasks.length} tasks:\n`));

      tasks.forEach((task, index) => {
        const descPreview = task.description
          ? task.description.substring(0, 50) + (task.description.length > 50 ? '...' : '')
          : '(no description)';

        console.log(chalk.gray(`${index + 1}. ${task.title}`));
        console.log(chalk.dim(`   Priority: ${task.priority}`));
        console.log(chalk.dim(`   Tags: ${task.tags.join(', ') || 'none'}`));
        console.log(chalk.dim(`   Description: ${descPreview}`));
        if (task.estimatedHours > 0) {
          console.log(chalk.dim(`   Hours: ${task.estimatedHours}h`));
        }
        console.log('');
      });

      return;
    }

    if (spinner) spinner.text = 'Importing tasks';
    const manager = new TaskManager();
    await manager.init();

    const existingTasks = manager.getTasks();
    const existingHashes = new Map();
    const existingById = new Map();

    existingTasks.forEach(task => {
      const hash = generateTaskHash(task.title, task.description);
      existingHashes.set(hash, task);
      existingById.set(task.id, task);
    });

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      duplicates: [],
    };

    const importedTasks = [];

    for (const taskData of tasks) {
      const hash = generateTaskHash(taskData.title, taskData.description);
      const existing = taskData.id ? existingById.get(taskData.id) : existingHashes.get(hash);

      if (!existing) {
        const created = await manager.createTask({
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
          contractIds: taskData.contractIds,
          contractRole: taskData.contractRole,
          boundFiles: taskData.boundFiles,
        });

        created.subtasks = taskData.subtasks || [];
        importedTasks.push(created);
        results.created++;
        existingById.set(created.id, created);
        continue;
      }

      if (options.update) {
        await manager.updateTask(existing.id, buildPlanningUpdatePayload(existing, taskData));
        importedTasks.push(manager.getTask(existing.id));
        results.updated++;
        continue;
      }

      if (options.force) {
        const created = await manager.createTask({
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
          contractIds: taskData.contractIds,
          contractRole: taskData.contractRole,
          boundFiles: taskData.boundFiles,
        });

        created.subtasks = taskData.subtasks || [];
        importedTasks.push(created);
        results.created++;
        existingById.set(created.id, created);
        continue;
      }

      results.skipped++;
      results.duplicates.push({
        existing,
        new: taskData,
      });
    }

    await manager.saveData();

    resolveDependencies(importedTasks, manager.getTasks());

    for (const task of importedTasks) {
      await manager.updateTask(task.id, {
        dependencies: task.dependencies,
        contractIds: task.contractIds,
        contractRole: task.contractRole,
        boundFiles: task.boundFiles,
        subtasks: task.subtasks,
      });
    }

    await manager.saveData();

    spinner?.succeed('Tasks imported successfully');

    const countByPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
    let dependencyCount = 0;
    let subtaskCount = 0;
    importedTasks.forEach(task => {
      if (countByPriority[task.priority] !== undefined) {
        countByPriority[task.priority] += 1;
      }
      dependencyCount += (task.dependencies || []).length;
      subtaskCount += (task.subtasks || []).length;
    });

    console.log(chalk.green(`\nImported ${results.created} task(s).`));
    console.log(
      chalk.gray(
        `  Processed: ${tasks.length} | Created: ${results.created} | Skipped: ${results.skipped}${results.updated > 0 ? ` | Updated: ${results.updated}` : ''}`
      )
    );
    console.log(
      chalk.gray(
        `  P0: ${countByPriority.P0} | P1: ${countByPriority.P1} | P2: ${countByPriority.P2} | P3: ${countByPriority.P3}`
      )
    );
    console.log(chalk.gray(`  Dependencies: ${dependencyCount} | Subtasks: ${subtaskCount}`));

    if (options.verbose && importedTasks.length > 0) {
      console.log(chalk.blue('\nVerbose imported task list:'));
      importedTasks.forEach((task, index) => {
        const priorityColor = {
          P0: 'red',
          P1: 'yellow',
          P2: 'blue',
          P3: 'green',
        }[task.priority] || 'gray';

        console.log(chalk.gray(`${index + 1}. ${task.title}`));
        console.log(chalk.dim(`   ID: ${task.id}`));
        console.log(chalk[priorityColor](`   Priority: ${task.priority}`));

        if (task.tags && task.tags.length > 0) {
          console.log(chalk.dim(`   Tags: ${task.tags.join(', ')}`));
        }

        if (task.description) {
          const descPreview = task.description.substring(0, 60);
          console.log(chalk.dim(`   Description: ${descPreview}${task.description.length > 60 ? '...' : ''}`));
        }

        if (task.estimatedHours > 0) {
          console.log(chalk.dim(`   Hours: ${task.estimatedHours}h`));
        }

        if (task.dependencies && task.dependencies.length > 0) {
          console.log(chalk.dim(`   Depends on: ${task.dependencies.join(', ')}`));
        }

        if (task.subtasks && task.subtasks.length > 0) {
          console.log(chalk.dim(`   Subtasks: ${task.subtasks.length}`));
        }

        console.log('');
      });
    }

    if (results.skipped > 0 && !options.force) {
      console.log(chalk.blue('\nTip: Use --update to update existing tasks'));
      console.log(chalk.gray('         Use --force to force create duplicates\n'));
    }

    console.log(chalk.blue('Next steps:'));
    console.log(chalk.gray('  seshflow next     - Start working on first task'));
    console.log(chalk.gray('  seshflow query    - Query tasks by filters'));
    console.log(chalk.gray('  seshflow stats    - Show statistics'));
  } catch (error) {
    spinner?.fail('Import failed');
    console.error(chalk.red(`\nError: ${error.message}`));

    if (error.message.includes('unexpected token')) {
      console.error(chalk.yellow('\nTip: Make sure your markdown file is properly formatted'));
      printMarkdownTaskFormatHints(console.error);
    }

    process.exit(1);
  }
}
