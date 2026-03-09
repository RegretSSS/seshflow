import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { truncate } from '../utils/helpers.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON, formatTaskJSON, formatTaskSummaryJSON } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';
import { shouldShowWorkspaceHint } from '../utils/hint-throttle.js';

function subtaskProgress(task) {
  if (!task.subtasks || task.subtasks.length === 0) {
    return '';
  }
  const completed = task.subtasks.filter(st => st.completed).length;
  return ` [${completed}/${task.subtasks.length}]`;
}

function displayCompactTask(task) {
  console.log(`${task.id} | ${task.status} | ${task.priority} | ${truncate(task.title, 72)}${subtaskProgress(task)}`);
}

function displayPrettyTask(task) {
  const statusEmoji = {
    backlog: 'B',
    todo: 'T',
    'in-progress': 'I',
    review: 'R',
    done: 'D',
    blocked: 'X'
  };

  const statusColor = {
    backlog: chalk.gray,
    todo: chalk.blue,
    'in-progress': chalk.yellow,
    review: chalk.magenta,
    done: chalk.green,
    blocked: chalk.red
  };

  const symbol = statusEmoji[task.status] || 'B';
  const colorFn = statusColor[task.status] || chalk.white;
  const line = `${symbol} ${colorFn(task.status.padEnd(12))} ${chalk.bold(task.id.padEnd(28))} ${chalk.white.bold(task.priority.padEnd(3))}  ${truncate(task.title, 50)}${chalk.cyan(subtaskProgress(task))}`;
  console.log(line);
}

function displayPrettyHeader() {
  console.log(chalk.cyan('\n' + '='.repeat(100)));
  console.log(chalk.cyan.bold('  STATUS       ID                            PRI  TITLE'));
  console.log(chalk.cyan('='.repeat(100)));
}

function displayPrettyFooter(taskCount) {
  console.log(chalk.cyan('='.repeat(100)));
  console.log(chalk.gray(`\n  Total: ${taskCount} tasks\n`));
}

export async function list(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const jsonMode = isJSONMode(options);
  const spinner = compactMode ? null : ora('Loading tasks').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    let tasks = manager.getTasks();
    const hasExplicitFilter = Boolean(
      options.status || options.priority || options.tag || options.assignee
    );

    if (options.status) {
      const statuses = options.status.split(',');
      tasks = tasks.filter(task => statuses.includes(task.status));
    }

    if (options.priority) {
      const priorities = options.priority.split(',');
      tasks = tasks.filter(task => priorities.includes(task.priority));
    }

    if (options.tag) {
      const tags = options.tag.split(',');
      tasks = tasks.filter(task => task.tags.some(taskTag => tags.includes(taskTag)));
    }

    if (options.assignee) {
      tasks = tasks.filter(task => task.assignee === options.assignee);
    }

    if (!jsonMode && !options.all && !hasExplicitFilter) {
      tasks = tasks.filter(task => task.status === 'in-progress' || task.status === 'todo');
    }

    let offset = 0;
    if (options.offset !== undefined) {
      offset = Number.parseInt(options.offset, 10);
      if (Number.isNaN(offset) || offset < 0) {
        throw new Error('Invalid --offset value, expected a non-negative integer');
      }
    }

    let limit = null;
    if (options.limit !== undefined) {
      const parsedLimit = Number.parseInt(options.limit, 10);
      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new Error('Invalid --limit value, expected a positive integer');
      }
      limit = parsedLimit;
    } else if (!options.all && !jsonMode) {
      limit = 10;
    }

    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    tasks.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const totalBeforePaging = tasks.length;
    if (offset > 0) {
      tasks = tasks.slice(offset);
    }
    if (limit !== null) {
      tasks = tasks.slice(0, limit);
    }

    spinner?.stop();

    if (isJSONMode(options)) {
      const formattedTasks = tasks.map(task => (options.full ? formatTaskJSON(task) : formatTaskSummaryJSON(task)));
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);

      outputJSON(formatSuccessResponse({
        tasks: formattedTasks,
        total: formattedTasks.length,
        detailLevel: options.full ? 'full' : 'summary'
      }, workspaceJSON));
      return;
    }

    if (tasks.length === 0) {
      const noActionableOnly = !options.all && !hasExplicitFilter;
      if (compactMode) {
        if (noActionableOnly) {
          console.log('NO_ACTIONABLE_TASKS | hint=use --all');
        } else {
          console.log('NO_TASKS');
        }
      } else {
        if (noActionableOnly) {
          console.log(chalk.yellow('\nNo actionable tasks found.'));
          console.log(chalk.gray('  Use --all to see all tasks'));
        } else {
          console.log(chalk.yellow('\nNo tasks found.'));
          console.log(chalk.gray('  Try adjusting filters or add new tasks'));
        }
      }
      return;
    }

    if (compactMode) {
      if (!options.all && !hasExplicitFilter && totalBeforePaging > tasks.length) {
        console.log(`SHOWING | ${tasks.length}/${totalBeforePaging} (use --all or --limit/--offset)`);
      }
      tasks.forEach(displayCompactTask);
      return;
    }

    displayPrettyHeader();
    tasks.forEach(displayPrettyTask);
    displayPrettyFooter(tasks.length);

    if (!options.all && !hasExplicitFilter && totalBeforePaging > tasks.length) {
      console.log(chalk.blue(`Showing ${tasks.length}/${totalBeforePaging} tasks (use --all or --limit/--offset)`));
      console.log('');
    }

    if (options.status || options.priority || options.tag || options.limit || options.offset || options.all) {
      console.log(chalk.blue('Filters applied:'));
      if (options.status) console.log(chalk.gray(`  Status: ${options.status}`));
      if (options.priority) console.log(chalk.gray(`  Priority: ${options.priority}`));
      if (options.tag) console.log(chalk.gray(`  Tags: ${options.tag}`));
      if (options.limit) console.log(chalk.gray(`  Limit: ${options.limit}`));
      if (options.offset) console.log(chalk.gray(`  Offset: ${options.offset}`));
      if (options.all) console.log(chalk.gray('  All: true'));
      console.log('');
    }

    if (await shouldShowWorkspaceHint(manager.storage, 'list:pretty-hint')) {
      console.log(chalk.blue('Machine step:'));
      console.log(chalk.gray('  seshflow list --json'));
      console.log(chalk.gray('  seshflow list --json --full'));
      console.log('');
    }
  } catch (error) {
    spinner?.fail('Failed to list tasks');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
