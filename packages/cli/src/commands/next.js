import { formatTaskJSON, formatWorkspaceJSON, formatSuccessResponse, outputJSON, isJSONMode } from '../utils/json-output.js';
import chalk from 'chalk';
import ora from 'ora';
import simpleGit from 'simple-git';
import { TaskManager } from '../core/task-manager.js';
import { truncate } from '../utils/helpers.js';
import { resolveOutputMode } from '../utils/output-mode.js';

function displayTask(task, showFull = false) {
  console.log(chalk.bold.cyan(`\n- ${task.title}`));
  console.log(chalk.cyan(`  ID: ${task.id}`));
  console.log(chalk.cyan(`  Priority: ${task.priority}`));
  console.log(chalk.cyan(`  Status: ${task.status}`));

  if (task.actualHours > 0) {
    console.log(chalk.cyan(`  Actual: ${task.actualHours}h`));
  }

  if (task.tags.length > 0) {
    console.log(chalk.cyan(`  Tags: ${task.tags.join(', ')}`));
  }

  if (task.description) {
    console.log(chalk.cyan(''));
    console.log(chalk.cyan(`  Description:\n${chalk.white(task.description.split('\n').map(line => `    ${line}`).join('\n'))}`));
  }

  if (task.dependencies.length > 0) {
    console.log(chalk.cyan(''));
    console.log(chalk.cyan(`  Dependencies: ${task.dependencies.join(', ')}`));
  }

  if (task.subtasks && task.subtasks.length > 0) {
    const completedCount = task.subtasks.filter(st => st.completed).length;
    console.log(chalk.cyan(''));
    console.log(chalk.cyan(`  Subtasks (${completedCount}/${task.subtasks.length}):`));
    task.subtasks.forEach((subtask, index) => {
      const status = subtask.completed ? '[x]' : '[ ]';
      console.log(chalk.cyan(`    ${index + 1}. ${status} ${subtask.title}`));
    });
  }

  if (task.context.relatedFiles.length > 0) {
    console.log(chalk.cyan(''));
    console.log(chalk.cyan(`  Related Files:\n${task.context.relatedFiles.map(f => `    - ${f}`).join('\n')}`));
  }

  if (showFull && task.sessions.length > 0) {
    const lastSession = task.sessions[task.sessions.length - 1];
    console.log(chalk.cyan(''));
    console.log(chalk.cyan(`  Last Session: ${lastSession.note || 'No notes'}`));
  }
}

function toCompactLine(task) {
  return `${task.id} | ${task.status} | ${task.priority} | ${task.title}`;
}

function compactTaskContext(task, manager) {
  if (task.description) {
    console.log(`desc=${truncate(task.description.replace(/\s+/g, ' '), 140)}`);
  }
  if (task.subtasks?.length) {
    const preview = task.subtasks
      .slice(0, 5)
      .map(st => `${st.completed ? '[x]' : '[ ]'} ${truncate(st.title, 40)}`)
      .join(' ; ');
    console.log(`subtasks=${preview}`);
  }
  if (task.dependencies?.length) {
    console.log(`deps=${task.dependencies.join(',')}`);
  }
  const dependents = manager.getTasks().filter(t => (t.dependencies || []).includes(task.id));
  if (dependents.length > 0) {
    console.log(`unlocks=${dependents.map(t => t.id).join(',')}`);
  }
}

export async function next(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = compactMode ? null : ora('Loading workspace').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    if (isJSONMode(options)) {
      const currentTask = manager.getCurrentTask();
      if (currentTask) {
        spinner?.stop();
        outputJSON(formatSuccessResponse({
          task: formatTaskJSON(currentTask),
          hasActiveSession: true,
        }, formatWorkspaceJSON(manager.storage, manager.getTasks().length)));
        return;
      }

      const nextTask = manager.getNextTask({
        priority: options.priority,
        tag: options.tag,
        assignee: options.assignee
      });

      spinner?.stop();

      if (!nextTask) {
        outputJSON(formatSuccessResponse({
          task: null,
          message: 'No tasks to work on',
        }, formatWorkspaceJSON(manager.storage, manager.getTasks().length)));
        return;
      }

      const unmetDeps = manager.getUnmetDependencies(nextTask);
      outputJSON(formatSuccessResponse({
        task: formatTaskJSON(nextTask),
        unmetDependencies: unmetDeps.map(d => ({
          id: d.id,
          title: d.title,
          status: d.status,
        })),
        hasActiveSession: false,
      }, formatWorkspaceJSON(manager.storage, manager.getTasks().length)));
      return;
    }

    const currentTask = manager.getCurrentTask();
    if (currentTask) {
      spinner?.stop();
      if (compactMode) {
        console.log(`ACTIVE | ${toCompactLine(currentTask)}`);
        compactTaskContext(currentTask, manager);
      } else {
        console.log(chalk.yellow('\nYou have an active session:'));
        displayTask(currentTask, true);
        console.log(
          chalk.blue('\nCommands:'),
          chalk.gray('seshflow done'),
          chalk.gray('|'),
          chalk.gray('seshflow show ' + currentTask.id)
        );
      }
      return;
    }

    const nextTask = manager.getNextTask({
      priority: options.priority,
      tag: options.tag,
      assignee: options.assignee
    });

    spinner?.stop();

    if (!nextTask) {
      if (compactMode) {
        console.log('NO_TASK');
      } else {
        console.log(chalk.green('\nNo tasks to work on.'));
        console.log(chalk.gray('  Add a new task with: seshflow add "Task name"'));
      }
      return;
    }

    const unmetDeps = manager.getUnmetDependencies(nextTask);
    if (unmetDeps.length > 0) {
      if (compactMode) {
        const depIds = unmetDeps.map(dep => dep.id).join(',');
        console.log(`BLOCKED | ${toCompactLine(nextTask)} | deps=${depIds}`);
      } else {
        console.log(chalk.yellow('\nNext task has unmet dependencies:'));
        unmetDeps.forEach(dep => {
          console.log(chalk.gray(`  - ${dep.title} (${dep.id})`));
        });
        console.log(chalk.gray('\n  Complete these tasks first:'));
        unmetDeps.forEach(dep => {
          console.log(chalk.gray(`    seshflow show ${dep.id}`));
        });
      }
      return;
    }

    const sessionSpinner = compactMode ? null : ora('Starting session').start();
    manager.startSession(nextTask.id);
    await manager.saveData();
    sessionSpinner?.succeed('Session started');

    if (compactMode) {
      const subtaskInfo = nextTask.subtasks?.length
        ? ` | subtasks=${nextTask.subtasks.filter(st => st.completed).length}/${nextTask.subtasks.length}`
        : '';
      console.log(`NEXT | ${toCompactLine(nextTask)}${subtaskInfo}`);
      compactTaskContext(nextTask, manager);
    } else {
      displayTask(nextTask, true);
    }

    if (nextTask.gitBranch && options.git) {
      try {
        const git = simpleGit();
        const currentBranch = (await git.branch()).current;

        if (currentBranch !== nextTask.gitBranch) {
          console.log(chalk.blue(`\nGit: switching to branch ${nextTask.gitBranch}`));
        }
      } catch (error) {
        console.warn(chalk.yellow(`\nGit operation skipped: ${error.message}`));
      }
    }

    if (compactMode) {
      return;
    }

    console.log(chalk.bold('\nAI Context:'));
    console.log(chalk.white(`Current Task: ${nextTask.title}`));
    console.log(chalk.white(`Description: ${truncate(nextTask.description, 200)}`));
    if (nextTask.context.relatedFiles.length > 0) {
      console.log(chalk.white(`Related Files: ${nextTask.context.relatedFiles.join(', ')}`));
    }
    if (nextTask.sessions.length > 0) {
      const lastSession = nextTask.sessions[nextTask.sessions.length - 1];
      console.log(chalk.white(`Last Session: ${lastSession.note || 'No notes from last session'}`));
    }

    console.log(chalk.blue('\nCommands:'), chalk.gray('seshflow done [options]'));
  } catch (error) {
    spinner?.fail('Failed to get next task');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
