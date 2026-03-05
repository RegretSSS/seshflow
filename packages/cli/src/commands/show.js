import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatHours, truncate } from '../utils/helpers.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON, formatTaskJSON } from '../utils/json-output.js';

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

/**
 * Display task details
 */
function displayTaskDetails(task) {
  console.log(chalk.bold.cyan(`\n┌─ ${task.title}`));
  console.log(chalk.cyan('├' + '─'.repeat(Math.max(task.title.length + 2, 50)) + '┐'));
  console.log(chalk.cyan(`│ ID: ${task.id}`));
  console.log(chalk.cyan(`│ Priority: ${task.priority}`));
  console.log(chalk.cyan(`│ Status: ${task.status}`));
  console.log(chalk.cyan(`│ Created: ${formatDateTime(task.createdAt)}`));

  if (task.startedAt) {
    console.log(chalk.cyan(`│ Started: ${formatDateTime(task.startedAt)}`));
  }

  if (task.completedAt) {
    console.log(chalk.cyan(`│ Completed: ${formatDateTime(task.completedAt)}`));
  }

  if (task.estimatedHours > 0) {
    console.log(
      chalk.cyan(
        `│ Estimated: ${formatHours(task.estimatedHours)} (Actual: ${formatHours(
          task.actualHours
        )})`
      )
    );
  }

  if (task.assignee) {
    console.log(chalk.cyan(`│ Assignee: ${task.assignee}`));
  }

  if (task.tags.length > 0) {
    console.log(chalk.cyan(`│ Tags: ${task.tags.join(', ')}`));
  }

  if (task.description) {
    console.log(chalk.cyan('│'));
    console.log(
      chalk.cyan(
        `│ Description:\n${chalk.white(
          task.description
            .split('\n')
            .map(line => `│   ${line}`)
            .join('\n')
        )}`
      )
    );
  }

  if (task.subtasks && task.subtasks.length > 0) {
    const completedCount = task.subtasks.filter(st => st.completed).length;
    console.log(chalk.cyan('│'));
    console.log(chalk.cyan(`│ Subtasks (${completedCount}/${task.subtasks.length}):`));
    task.subtasks.forEach((subtask, index) => {
      const status = subtask.completed ? '✅' : '⏸️';
      const hours = subtask.estimatedHours ? ` [${subtask.estimatedHours}h]` : '';
      console.log(chalk.cyan(`│   ${status} ${subtask.title}${hours}`));
    });
  }

  if (task.dependencies && task.dependencies.length > 0) {
    console.log(chalk.cyan('│'));
    console.log(chalk.cyan(`│ Dependencies:`));
    task.dependencies.forEach(depId => {
      console.log(chalk.cyan(`│   • ${depId}`));
    });
  }

  if (task.blockedBy && Array.isArray(task.blockedBy) && task.blockedBy.length > 0) {
    console.log(chalk.cyan('│'));
    console.log(chalk.cyan(`│ Blocked By:`));
    task.blockedBy.forEach(blocker => {
      if (blocker && blocker.id) {
        console.log(chalk.cyan(`│   • ${blocker.id}: ${truncate(blocker.title || blocker.id, 50)}`));
      }
    });
  }

  if (task.context.relatedFiles.length > 0) {
    console.log(chalk.cyan('│'));
    console.log(
      chalk.cyan(
        `│ Related Files:\n${task.context.relatedFiles
          .map(f => `│   • ${f}`)
          .join('\n')}`
      )
    );
  }

  if (task.sessions.length > 0) {
    console.log(chalk.cyan('│'));
    console.log(chalk.cyan(`│ Sessions (${task.sessions.length}):`));
    task.sessions.slice(-3).forEach((session, index) => {
      const date = formatDateTime(session.startedAt || session.startTime);
      const note = session.note ? truncate(session.note, 40) : 'No notes';
      console.log(chalk.cyan(`│   ${date}: ${note}`));
    });
  }

  if (task.gitBranch) {
    console.log(chalk.cyan('│'));
    console.log(chalk.cyan(`│ Git Branch: ${task.gitBranch}`));
  }

  console.log(chalk.cyan('└' + '─'.repeat(Math.max(task.title.length + 2, 50)) + '┘'));
}

/**
 * Show task details
 */
export async function show(taskId, options = {}) {
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

    // JSON mode
    if (isJSONMode(options)) {
      outputJSON(formatSuccessResponse({
        task: formatTaskJSON(task)
      }, formatWorkspaceJSON(manager.storage, 1)));
      return;
    }

    // Display mode
    displayTaskDetails(task);

    // Show related commands
    console.log(chalk.blue('\nCommands:'));
    if (task.status === 'backlog' || task.status === 'todo') {
      console.log(chalk.gray('  seshflow next'), chalk.gray('- Start this task'));
    }
    if (task.status === 'in-progress') {
      console.log(chalk.gray('  seshflow done [options]'), chalk.gray('- Complete this task'));
    }
    console.log(chalk.gray(`  seshflow deps ${taskId}`), chalk.gray('- Show dependencies'));
    console.log(chalk.gray(`  seshflow delete ${taskId}`), chalk.gray('- Delete this task'));

  } catch (error) {
    spinner.fail('Failed to show task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
