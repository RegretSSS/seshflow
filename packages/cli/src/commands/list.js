import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatHours, truncate } from '../utils/helpers.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON } from '../utils/json-output.js';

/**
 * Display task summary line
 */
function displayTaskSummary(task, index) {
  const statusEmoji = {
    'backlog': '📋',
    'todo': '📝',
    'in-progress': '🔄',
    'review': '👀',
    'done': '✅',
    'blocked': '🚫'
  };

  const statusColor = {
    'backlog': chalk.gray,
    'todo': chalk.blue,
    'in-progress': chalk.yellow,
    'review': chalk.magenta,
    'done': chalk.green,
    'blocked': chalk.red
  };

  const emoji = statusEmoji[task.status] || '📋';
  const statusText = task.status.padEnd(12);

  // Format subtasks if present
  let subtaskInfo = '';
  if (task.subtasks && task.subtasks.length > 0) {
    const completedCount = task.subtasks.filter(st => st.completed).length;
    subtaskInfo = chalk.cyan(` [${completedCount}/${task.subtasks.length}]`);
  }

  // Format hours
  const hoursInfo = task.estimatedHours > 0
    ? chalk.gray(`(${formatHours(task.estimatedHours)} / ${formatHours(task.actualHours)})`)
    : '';

  // Truncate title if too long
  const title = truncate(task.title, 50);

  const colorFn = statusColor[task.status] || chalk.white;
  const line = `${emoji} ${colorFn(statusText)} ${chalk.bold(task.id.padEnd(28))} ${chalk.white.bold(task.priority.padEnd(3))}  ${title}${subtaskInfo} ${hoursInfo}`;

  console.log(line);
}

/**
 * Display table header
 */
function displayHeader() {
  console.log(chalk.cyan('\n' + '═'.repeat(120)));
  console.log(chalk.cyan.bold('  STATUS           ID                            PRI  TITLE' + ' '.repeat(35) + 'HOURS'));
  console.log(chalk.cyan('═'.repeat(120)));
}

/**
 * Display table footer
 */
function displayFooter(taskCount) {
  console.log(chalk.cyan('═'.repeat(120)));
  console.log(chalk.gray(`\n  Total: ${taskCount} tasks\n`));
}

/**
 * List tasks
 */
export async function list(options = {}) {
  const spinner = ora('Loading tasks').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    // Get all tasks
    let tasks = manager.getTasks();

    // Apply filters
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
      tasks = tasks.filter(task =>
        task.tags.some(taskTag => tags.includes(taskTag))
      );
    }

    if (options.assignee) {
      tasks = tasks.filter(task => task.assignee === options.assignee);
    }

    // Apply limit
    if (options.limit && tasks.length > parseInt(options.limit)) {
      tasks = tasks.slice(0, parseInt(options.limit));
    }

    // Sort by priority and creation date
    const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
    tasks.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    spinner.stop();

    // JSON mode
    if (isJSONMode(options)) {
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        assignee: task.assignee,
        subtaskCount: task.subtasks?.length || 0,
        completedSubtasks: task.subtasks?.filter(st => st.completed).length || 0,
        createdAt: task.createdAt
      }));

      outputJSON(formatSuccessResponse({
        tasks: formattedTasks,
        total: formattedTasks.length
      }, formatWorkspaceJSON(manager.storage, tasks.length)));
      return;
    }

    // Display mode
    if (tasks.length === 0) {
      console.log(chalk.yellow('\n📭 No tasks found'));
      console.log(chalk.gray('   Try adjusting filters or add new tasks'));
      return;
    }

    displayHeader();
    tasks.forEach((task, index) => {
      displayTaskSummary(task, index);
    });
    displayFooter(tasks.length);

    // Show filter info if any
    if (options.status || options.priority || options.tag || options.limit) {
      console.log(chalk.blue('📊 Filters applied:'));
      if (options.status) console.log(chalk.gray(`   Status: ${options.status}`));
      if (options.priority) console.log(chalk.gray(`   Priority: ${options.priority}`));
      if (options.tag) console.log(chalk.gray(`   Tags: ${options.tag}`));
      if (options.limit) console.log(chalk.gray(`   Limit: ${options.limit}`));
      console.log('');
    }

  } catch (error) {
    spinner.fail('Failed to list tasks');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
