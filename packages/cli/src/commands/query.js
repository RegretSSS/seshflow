import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatTaskJSON, formatTaskSummaryJSON, formatSuccessResponse, formatErrorResponse, outputJSON, isJSONMode } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';
import { truncate } from '../utils/helpers.js';
import { shouldShowWorkspaceHint } from '../utils/hint-throttle.js';
import { handlePreInitGuard } from '../utils/workspace-guard.js';

function matchesTag(taskTag, inputTag) {
  const taskValue = String(taskTag || '').toLowerCase();
  const inputValue = String(inputTag || '').toLowerCase();
  if (!taskValue || !inputValue) return false;
  return taskValue === inputValue || taskValue.includes(inputValue) || inputValue.includes(taskValue);
}

function displayCompactTask(task) {
  const subtaskInfo = task.subtasks?.length
    ? ` [${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}]`
    : '';
  console.log(`${task.id} | ${task.status} | ${task.priority} | ${truncate(task.title, 72)}${subtaskInfo}`);
}

function displayPrettyTask(task) {
  const statusIcon = {
    done: 'D',
    'in-progress': 'I',
    todo: 'T',
    backlog: 'B',
    blocked: 'X',
    review: 'R',
  }[task.status] || 'B';

  const priorityColor = {
    P0: 'red',
    P1: 'yellow',
    P2: 'blue',
    P3: 'green',
  }[task.priority] || 'gray';

  const tags = (task.tags || []).filter(tag => tag && tag !== task.priority);
  const subtaskInfo = task.subtasks?.length
    ? ` [${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}]`
    : '';
  const tagsInfo = tags.length > 0 ? ` [${tags.join(', ')}]` : '';

  console.log(`${statusIcon} ${task.id} | ${task.status} | ${chalk[priorityColor](task.priority)} | ${task.title}${subtaskInfo}${chalk.dim(tagsInfo)}`);
}

export async function query(options = {}) {
  if (handlePreInitGuard('query', options)) {
    process.exit(1);
  }

  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = compactMode ? null : ora('Querying tasks').start();

  try {
    const manager = new TaskManager();
    await manager.init();
    const tagFilter = options.tags || options.tag;

    const allTasks = manager.getTasks();
    let filteredTasks = allTasks;

    if (options.priority) {
      filteredTasks = filteredTasks.filter(t => t.priority === options.priority);
    }

    if (options.status && options.status.toLowerCase() !== 'all') {
      const statuses = options.status.split(',');
      filteredTasks = filteredTasks.filter(t => statuses.includes(t.status));
    }

    if (tagFilter) {
      const tags = tagFilter.split(',').map(tag => tag.trim()).filter(Boolean);
      filteredTasks = filteredTasks.filter(
        t => t.tags && t.tags.some(taskTag => tags.some(inputTag => matchesTag(taskTag, inputTag)))
      );
    }

    if (options.assignee) {
      filteredTasks = filteredTasks.filter(t => t.assignee && t.assignee.includes(options.assignee));
    }

    if (options.limit !== undefined) {
      const limit = Number.parseInt(options.limit, 10);
      if (Number.isNaN(limit) || limit <= 0) {
        throw new Error('Invalid --limit value, expected a positive integer');
      }
      filteredTasks = filteredTasks.slice(0, limit);
    }

    spinner?.stop();

    if (isJSONMode(options)) {
      outputJSON(formatSuccessResponse({
        tasks: filteredTasks.map(t => (options.full ? formatTaskJSON(t) : formatTaskSummaryJSON(t))),
        totalTasks: filteredTasks.length,
        detailLevel: options.full ? 'full' : 'summary',
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

    if (filteredTasks.length === 0) {
      if (compactMode) {
        console.log('NO_MATCH');
      } else {
        console.log(chalk.gray('\nNo tasks found matching the criteria.\n'));
      }
      return;
    }

    if (compactMode) {
      filteredTasks.forEach(displayCompactTask);
      return;
    }

    console.log(chalk.bold.cyan(`\nFound ${filteredTasks.length} task(s)\n`));

    const activeFilters = [];
    if (options.priority) activeFilters.push(`priority: ${options.priority}`);
    if (options.status) activeFilters.push(`status: ${options.status}`);
    if (tagFilter) activeFilters.push(`tags: ${tagFilter}`);
    if (options.assignee) activeFilters.push(`assignee: ${options.assignee}`);
    if (options.limit) activeFilters.push(`limit: ${options.limit}`);

    if (activeFilters.length > 0) {
      console.log(chalk.gray(`Filters: ${activeFilters.join(', ')}\n`));
    }

    filteredTasks.forEach(displayPrettyTask);

    console.log(chalk.blue('\nView task details:'));
    if (filteredTasks.length > 0) {
      console.log(chalk.gray(`  seshflow show ${filteredTasks[0].id}`));
    }
    if (await shouldShowWorkspaceHint(manager.storage, 'query:pretty-hint')) {
      console.log(chalk.gray('  seshflow query'));
      console.log(chalk.gray('  seshflow query --full'));
    }
    console.log('');
  } catch (error) {
    spinner?.fail('Failed to query tasks');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'QUERY_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
