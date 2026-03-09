import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { truncate } from '../utils/helpers.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON, formatTaskJSON } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';

function subtaskProgress(task) {
  const total = task.subtasks?.length || 0;
  const done = task.subtasks?.filter(st => st.completed).length || 0;
  return { total, done };
}

function displayCompact(task, blockers = []) {
  const progress = subtaskProgress(task);
  const tags = task.tags?.length ? ` | tags=${task.tags.join(',')}` : '';
  const sub = progress.total > 0 ? ` | subtasks=${progress.done}/${progress.total}` : '';
  console.log(`${task.id} | ${task.status} | ${task.priority} | ${task.title}${sub}${tags}`);
  if (task.description) {
    console.log(`desc=${truncate(task.description.replace(/\s+/g, ' '), 160)}`);
  }
  if (task.subtasks?.length) {
    const preview = task.subtasks.slice(0, 6);
    console.log(`subtasks=${progress.done}/${progress.total}`);
    preview.forEach((st, index) => {
      console.log(`subtask_${index + 1}=${st.completed ? '[x]' : '[ ]'} ${truncate(st.title, 48)}`);
    });
    if (task.subtasks.length > preview.length) {
      console.log(`subtask_more=${task.subtasks.length - preview.length}`);
    }
  }
  if (task.dependencies?.length) {
    console.log(`deps=${task.dependencies.join(',')}`);
  }
  if (blockers.length) {
    console.log(`blocked_by=${blockers.map(t => t.id).join(',')}`);
  }
}

function displayPretty(task, blockers = []) {
  const progress = subtaskProgress(task);

  console.log(chalk.bold.cyan(`\n- ${task.title}`));
  console.log(chalk.cyan(`  ID: ${task.id}`));
  console.log(chalk.cyan(`  Priority: ${task.priority}`));
  console.log(chalk.cyan(`  Status: ${task.status}`));
  if (task.actualHours > 0) {
    console.log(chalk.cyan(`  Actual: ${task.actualHours}h`));
  }
  if (task.assignee) {
    console.log(chalk.cyan(`  Assignee: ${task.assignee}`));
  }
  if (task.tags?.length > 0) {
    console.log(chalk.cyan(`  Tags: ${task.tags.join(', ')}`));
  }

  if (task.description) {
    console.log(chalk.cyan('\n  Description:'));
    task.description.split('\n').forEach(line => {
      console.log(chalk.white(`    ${line}`));
    });
  }

  if (progress.total > 0) {
    console.log(chalk.cyan(`\n  Subtasks (${progress.done}/${progress.total}):`));
    task.subtasks.forEach((subtask, index) => {
      const mark = subtask.completed ? '[x]' : '[ ]';
      console.log(chalk.cyan(`    ${index + 1}. ${mark} ${subtask.title}`));
    });
  }

  if (task.dependencies?.length > 0) {
    console.log(chalk.cyan('\n  Dependencies:'));
    task.dependencies.forEach(depId => {
      console.log(chalk.cyan(`    - ${depId}`));
    });
  }

  if (blockers.length > 0) {
    console.log(chalk.yellow('\n  Blocked By:'));
    blockers.forEach(blocker => {
      console.log(chalk.yellow(`    - ${blocker.id}: ${truncate(blocker.title || blocker.id, 60)}`));
    });
  }

  if (task.context.relatedFiles?.length > 0) {
    console.log(chalk.cyan('\n  Related Files:'));
    task.context.relatedFiles.forEach(file => {
      console.log(chalk.cyan(`    - ${file}`));
    });
  }

  if (task.sessions?.length > 0) {
    console.log(chalk.cyan(`\n  Sessions (${task.sessions.length}):`));
    task.sessions.slice(-3).forEach(session => {
      const note = session.note ? truncate(session.note, 60) : 'No notes';
      console.log(chalk.cyan(`    - ${note}`));
    });
  }
}

export async function show(taskId, options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = (!compactMode && process.stdout.isTTY) ? ora('Loading task').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const task = manager.getTask(taskId);
    if (!task) {
      spinner?.stop();
      console.error(chalk.red(`\nTask not found: ${taskId}`));
      console.error(chalk.gray(`  Use 'seshflow list' to see all tasks`));
      process.exit(1);
    }

    const blockers = (task.blockedBy || [])
      .map(id => manager.getTask(id))
      .filter(Boolean);

    spinner?.stop();

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, 1);
      outputJSON(formatSuccessResponse({
        task: formatTaskJSON(task),
        subtasks: task.subtasks || [],
        dependencies: task.dependencies || [],
        blockedBy: blockers.map(t => ({ id: t.id, title: t.title, status: t.status })),
      }, workspaceJSON));
      return;
    }

    if (compactMode) {
      displayCompact(task, blockers);
      return;
    }

    displayPretty(task, blockers);

    console.log(chalk.blue('\nCommands:'));
    if (task.status === 'backlog' || task.status === 'todo') {
      console.log(chalk.gray('  seshflow next - Start this task'));
    }
    if (task.status === 'in-progress') {
      console.log(chalk.gray('  seshflow done [options] - Complete this task'));
    }
    console.log(chalk.gray(`  seshflow deps ${taskId} - Show dependencies`));
    console.log(chalk.gray(`  seshflow delete ${taskId} - Delete this task`));
  } catch (error) {
    spinner?.fail('Failed to show task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
