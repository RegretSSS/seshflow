import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { existsSync } from 'fs';
import path from 'path';
import { formatTaskJSON, formatWorkspaceJSON, formatSuccessResponse, outputJSON, isJSONMode } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';

function collectStats(tasks) {
  return {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'done').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    backlog: tasks.filter(t => t.status === 'backlog').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  };
}

function printCompactContext(data) {
  const { project, stats, task, dependencies, dependents } = data;
  const taskText = task
    ? `${task.id} | ${task.status} | ${task.priority} | ${task.title}`
    : 'none';

  console.log(`PROJECT | ${project.name} | tasks=${stats.total} | done=${stats.completed} | in_progress=${stats.inProgress}`);
  console.log(`CURRENT | ${taskText}`);

  if (dependencies.length > 0) {
    console.log(`DEPS | ${dependencies.map(t => t.id).join(',')}`);
  }

  if (dependents.length > 0) {
    console.log(`DEPENDENTS | ${dependents.map(t => t.id).join(',')}`);
  }
}

function printPrettyContext(data, options = {}) {
  const { project, stats, task, dependencies, dependents, keyFiles } = data;

  console.log(chalk.bold.cyan('\nSeshflow Project Context\n'));
  console.log(chalk.bold('Project'));
  console.log(chalk.gray(`  Name: ${project.name}`));
  console.log(chalk.gray(`  Path: ${project.path}`));
  if (project.gitBranch && project.gitBranch !== 'unknown') {
    console.log(chalk.gray(`  Git: ${project.gitBranch}`));
  }

  console.log(chalk.bold('\nProgress'));
  console.log(chalk.gray(`  Total: ${stats.total}`));
  console.log(chalk.gray(`  Done: ${stats.completed} | In Progress: ${stats.inProgress} | Todo: ${stats.todo} | Backlog: ${stats.backlog} | Blocked: ${stats.blocked}`));

  console.log(chalk.bold('\nCurrent Task'));
  if (!task) {
    console.log(chalk.gray('  None'));
  } else {
    console.log(chalk.white(`  ${task.title}`));
    console.log(chalk.gray(`  ${task.id} | ${task.priority} | ${task.status}`));
    if (task.tags?.length > 0) {
      console.log(chalk.gray(`  Tags: ${task.tags.join(', ')}`));
    }
    if (task.subtasks?.length > 0) {
      const done = task.subtasks.filter(s => s.completed).length;
      console.log(chalk.gray(`  Subtasks: ${done}/${task.subtasks.length}`));
    }
  }

  if (dependencies.length > 0) {
    console.log(chalk.bold('\nUnmet Dependencies'));
    dependencies.forEach(dep => {
      console.log(chalk.gray(`  - ${dep.id} | ${dep.status} | ${dep.title}`));
    });
  }

  if (dependents.length > 0) {
    console.log(chalk.bold('\nDependent Tasks'));
    dependents.forEach(dep => {
      console.log(chalk.gray(`  - ${dep.id} | ${dep.status} | ${dep.title}`));
    });
  }

  if (keyFiles.length > 0) {
    console.log(chalk.bold('\nKey Files'));
    keyFiles.forEach(file => {
      const displayFile = options.showPaths ? path.join(project.path, file) : file;
      console.log(chalk.gray(`  - ${displayFile}`));
    });
  }

  console.log(chalk.blue('\nQuick Commands:'));
  console.log(chalk.gray('  seshflow next --compact'));
  console.log(chalk.gray('  seshflow list --compact'));
  console.log(chalk.gray('  seshflow show <task-id> --json'));
  console.log('');
}

export async function newchatfirstround(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = compactMode ? null : ora('Loading project context').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    const workspacePath = process.cwd();
    const projectName = path.basename(workspacePath);
    const gitBranch = await manager.storage.getGitBranch();

    const allTasks = manager.getTasks() || [];
    const stats = collectStats(allTasks);

    const currentTask = manager.getCurrentTask();
    const nextTask = currentTask ? null : manager.getNextTask();
    const task = currentTask || nextTask;

    let dependencies = [];
    let dependents = [];
    if (task) {
      dependencies = manager.getUnmetDependencies(task);
      dependents = allTasks.filter(t => t.dependencies && t.dependencies.includes(task.id));
    }

    const keyFiles = ['README.md', 'docs.md', 'QUICKSTART.md', 'ARCHITECTURE.md', 'API.md']
      .filter(file => existsSync(path.join(workspacePath, file)));

    const contextData = {
      project: {
        name: projectName,
        path: workspacePath,
        gitBranch: gitBranch || 'unknown',
      },
      stats,
      task,
      dependencies,
      dependents,
      keyFiles,
    };

    if (isJSONMode(options)) {
      spinner?.stop();
      const workspaceJSON = formatWorkspaceJSON(manager.storage, allTasks.length);
      outputJSON(formatSuccessResponse({
        project: contextData.project,
        statistics: stats,
        currentTask: task ? formatTaskJSON(task) : null,
        dependencies: dependencies.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
        dependents: dependents.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
        keyFiles,
      }, workspaceJSON));
      return;
    }

    spinner?.stop();
    if (compactMode) {
      printCompactContext(contextData);
    } else {
      printPrettyContext(contextData, options);
    }
  } catch (error) {
    spinner?.fail('Failed to load context');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
