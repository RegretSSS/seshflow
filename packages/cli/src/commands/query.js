import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatTaskJSON, formatSuccessResponse, outputJSON, isJSONMode } from '../utils/json-output.js';

/**
 * Display task in formatted way
 */
function displayTask(task, showIndex = false, index = 0) {
  const prefix = showIndex ? chalk.gray(`${index + 1}. `) : '';

  const priorityColor = {
    P0: 'red',
    P1: 'yellow',
    P2: 'blue',
    P3: 'green',
  }[task.priority] || 'gray';

  const statusIcon = {
    'done': chalk.green('✅'),
    'in-progress': chalk.yellow('⏳'),
    'todo': chalk.blue('⏸️'),
    'backlog': chalk.gray('⏸️'),
    'blocked': chalk.red('🚫'),
  }[task.status] || '⏸️';

  const timeInfo = task.actualHours > 0
    ? chalk.dim(` - ${task.actualHours}h`)
    : '';

  const tagsInfo = task.tags && task.tags.length > 0
    ? chalk.dim(` [${task.tags.join(', ')}]`)
    : '';

  console.log(
    prefix +
    statusIcon + ' ' +
    chalk.white(task.title) + ' ' +
    chalk[priorityColor](`[${task.priority}]`) +
    timeInfo +
    tagsInfo
  );
}

/**
 * Query tasks based on filters
 */
export async function query(options = {}) {
  const spinner = ora('Querying tasks').start();

  try {
    const manager = new TaskManager();
    await manager.init();
    const tagFilter = options.tags || options.tag;

    // Get all tasks
    const allTasks = manager.getTasks();

    // Apply filters
    let filteredTasks = allTasks;

    // Filter by priority
    if (options.priority) {
      filteredTasks = filteredTasks.filter(t => t.priority === options.priority);
    }

    // Filter by status
    if (options.status) {
      const statuses = options.status.split(',');
      filteredTasks = filteredTasks.filter(t => statuses.includes(t.status));
    }

    // Filter by tags
    if (tagFilter) {
      const tags = tagFilter.split(',');
      filteredTasks = filteredTasks.filter(t =>
        t.tags && t.tags.some(tag => tags.includes(tag))
      );
    }

    // Filter by assignee
    if (options.assignee) {
      filteredTasks = filteredTasks.filter(t =>
        t.assignee && t.assignee.includes(options.assignee)
      );
    }

    // Limit results
    if (options.limit !== undefined) {
      const limit = Number.parseInt(options.limit, 10);
      if (Number.isNaN(limit) || limit <= 0) {
        throw new Error('Invalid --limit value, expected a positive integer');
      }
      filteredTasks = filteredTasks.slice(0, limit);
    }

    spinner.stop();

    // JSON mode
    if (isJSONMode(options)) {
      outputJSON(formatSuccessResponse({
        tasks: filteredTasks.map(t => formatTaskJSON(t)),
        totalTasks: filteredTasks.length,
        filters: {
          priority: options.priority || null,
          status: options.status || null,
          tags: tagFilter || null,
          assignee: options.assignee || null,
          limit: options.limit ? Number.parseInt(options.limit, 10) : null,
        },
      }));
      return;
    }

    // Normal mode
    if (filteredTasks.length === 0) {
      console.log(chalk.gray('\nNo tasks found matching the criteria.\n'));
      console.log(chalk.blue('💡 Try:'));
      console.log(chalk.gray('  seshflow query --priority P0'));
      console.log(chalk.gray('  seshflow query --status done,in-progress'));
      console.log(chalk.gray('  seshflow query --tags bug,urgent\n'));
      return;
    }

    console.log(chalk.bold.cyan(`\n📊 Found ${filteredTasks.length} task(s)\n`));

    // Show active filters
    const activeFilters = [];
    if (options.priority) activeFilters.push(`priority: ${options.priority}`);
    if (options.status) activeFilters.push(`status: ${options.status}`);
    if (tagFilter) activeFilters.push(`tags: ${tagFilter}`);
    if (options.assignee) activeFilters.push(`assignee: ${options.assignee}`);
    if (options.limit) activeFilters.push(`limit: ${options.limit}`);

    if (activeFilters.length > 0) {
      console.log(chalk.gray(`Filters: ${activeFilters.join(', ')}\n`));
    }

    // Display tasks
    filteredTasks.forEach((task, index) => {
      displayTask(task, false, index);
    });

    console.log(chalk.blue('\n💡 View task details:'));
    if (filteredTasks.length > 0) {
      console.log(chalk.gray(`  seshflow show ${filteredTasks[0].id}`));
    }
    console.log(chalk.gray('  seshflow query --json  (for structured output)\n'));

  } catch (error) {
    spinner.fail('Failed to query tasks');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
