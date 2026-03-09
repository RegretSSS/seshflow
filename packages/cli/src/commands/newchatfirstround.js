import { TaskManager } from '../core/task-manager.js';
import { existsSync } from 'fs';
import path from 'path';
import { formatTaskJSON, formatTaskSummaryJSON, formatWorkspaceJSON, formatSuccessResponse, formatErrorResponse, outputJSON, isJSONMode } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';
import { truncate } from '../utils/helpers.js';
import { shouldShowWorkspaceHint } from '../utils/hint-throttle.js';
import { loadTextUI } from '../utils/text-ui.js';
import { resolveWorkspaceMode } from '../core/workspace-mode.js';
import { buildApiFirstContext } from '../core/apifirst-context.js';

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

function priorityWeight(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function sortByPriorityAndCreated(a, b) {
  if (priorityWeight(a.priority) !== priorityWeight(b.priority)) {
    return priorityWeight(a.priority) - priorityWeight(b.priority);
  }
  return new Date(a.createdAt) - new Date(b.createdAt);
}

function taskRef(task, withStatus = true) {
  const head = withStatus ? `${task.id}:${task.status}:${task.priority}` : task.id;
  return `${head}:${truncate(task.title || task.id, 44).replace(/\|/g, '/')}`;
}

function printCompactContext(data) {
  const {
    project,
    stats,
    currentTask,
    nextReadyTask,
    dependencies,
    fullMode,
    dependents,
    blockedTasks,
    recentlyCompleted,
    keyFiles,
  } = data;
  console.log(`PROJECT | ${project.name} | tasks=${stats.total} | done=${stats.completed} | in_progress=${stats.inProgress}`);
  console.log(`WORKSPACE_SOURCE | ${project.source} | ${project.sourcePath}`);
  if (project.gitBranch && project.gitBranch !== 'unknown') {
    console.log(`BRANCH | ${project.gitBranch}`);
  }
  console.log(`STATS | total=${stats.total} | done=${stats.completed} | in_progress=${stats.inProgress} | todo=${stats.todo} | backlog=${stats.backlog} | blocked=${stats.blocked}`);
  if (currentTask) {
    console.log(`CURRENT | ${currentTask.id} | ${currentTask.status} | ${currentTask.priority} | ${currentTask.title}`);
  }
  if (nextReadyTask) {
    console.log(`NEXT | ${nextReadyTask.id} | ${nextReadyTask.status} | ${nextReadyTask.priority} | ${nextReadyTask.title}`);
  }

  if (dependencies.length > 0) {
    console.log(`DEPS | ${dependencies.map(t => taskRef(t, false)).join(',')}`);
  }

  if (fullMode && dependents.length > 0) {
    console.log(`DEPENDENTS | ${dependents.map(t => taskRef(t, false)).join(',')}`);
  }

  if (fullMode && blockedTasks.length > 0) {
    console.log(`BLOCKED_TOP | ${blockedTasks.map(item => taskRef(item.task)).join(',')}`);
  }

  if (fullMode && recentlyCompleted.length > 0) {
    console.log(`RECENT_DONE | ${recentlyCompleted.map(t => taskRef(t, false)).join(',')}`);
  }

  if (fullMode && keyFiles.length > 0) {
    console.log(`KEY_FILES | ${keyFiles.join(',')}`);
  }
}

function printPrettyContext(data, chalk, options = {}) {
  const { project, stats, currentTask, nextReadyTask, dependencies, dependents, keyFiles, blockedTasks, recentlyCompleted, fullMode, showCommandHints } = data;

  console.log(chalk.bold.cyan('\nSeshflow Project Context\n'));
  console.log(chalk.bold('Project'));
  console.log(chalk.gray(`  Name: ${project.name}`));
  console.log(chalk.gray(`  Path: ${project.path}`));
  console.log(chalk.gray(`  Source: ${project.source}`));
  console.log(chalk.gray(`  Source Path: ${project.sourcePath}`));
  if (project.gitBranch && project.gitBranch !== 'unknown') {
    console.log(chalk.gray(`  Git: ${project.gitBranch}`));
  }

  console.log(chalk.bold('\nProgress'));
  console.log(chalk.gray(`  Total: ${stats.total}`));
  console.log(chalk.gray(`  Done: ${stats.completed} | In Progress: ${stats.inProgress} | Todo: ${stats.todo} | Backlog: ${stats.backlog} | Blocked: ${stats.blocked}`));

  console.log(chalk.bold('\nCurrent Task'));
  if (currentTask) {
    console.log(chalk.white(`  ${currentTask.title}`));
    console.log(chalk.gray(`  ${currentTask.id} | ${currentTask.priority} | ${currentTask.status}`));
    if (currentTask.tags?.length > 0) {
      console.log(chalk.gray(`  Tags: ${currentTask.tags.join(', ')}`));
    }
    if (currentTask.subtasks?.length > 0) {
      const done = currentTask.subtasks.filter(s => s.completed).length;
      console.log(chalk.gray(`  Subtasks: ${done}/${currentTask.subtasks.length}`));
    }
  }

  console.log(chalk.bold('\nNext Ready Task'));
  if (nextReadyTask) {
    console.log(chalk.white(`  ${nextReadyTask.title}`));
    console.log(chalk.gray(`  ${nextReadyTask.id} | ${nextReadyTask.priority} | ${nextReadyTask.status}`));
  }

  if (dependencies.length > 0) {
    console.log(chalk.bold('\nUnmet Dependencies'));
    dependencies.forEach(dep => {
      console.log(chalk.gray(`  - ${dep.id} | ${dep.status} | ${dep.title}`));
    });
  }

  if (fullMode && dependents.length > 0) {
    console.log(chalk.bold('\nDependent Tasks'));
    dependents.forEach(dep => {
      console.log(chalk.gray(`  - ${dep.id} | ${dep.status} | ${dep.title}`));
    });
  }

  if (fullMode && blockedTasks.length > 0) {
    console.log(chalk.bold('\nBlocked Snapshot'));
    blockedTasks.forEach(item => {
      const blockers = item.blockers.length > 0
        ? item.blockers.map(t => `${t.id}:${truncate(t.title || t.id, 28)}`).join(', ')
        : 'unknown';
      console.log(chalk.gray(`  - ${item.task.id} | ${item.task.priority} | ${item.task.title}`));
      console.log(chalk.gray(`    blockers: ${blockers}`));
    });
  }

  if (fullMode && recentlyCompleted.length > 0) {
    console.log(chalk.bold('\nRecently Completed'));
    recentlyCompleted.forEach(item => {
      console.log(chalk.gray(`  - ${item.id} | ${item.priority} | ${item.title}`));
    });
  }

  if (fullMode && keyFiles.length > 0) {
    console.log(chalk.bold('\nKey Files'));
    keyFiles.forEach(file => {
      const displayFile = options.showPaths ? path.join(project.path, file) : file;
      console.log(chalk.gray(`  - ${displayFile}`));
    });
  }

  if (showCommandHints) {
    console.log(chalk.blue('\nQuick Commands:'));
    console.log(chalk.gray('  seshflow next --compact'));
    console.log(chalk.gray('  seshflow list --compact'));
    console.log(chalk.gray('  seshflow show <task-id>'));
    console.log('');
  }
}

export async function newchatfirstround(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const fullMode = options.full === true;
  const jsonMode = isJSONMode(options);
  const { chalk, ora } = jsonMode ? { chalk: null, ora: null } : await loadTextUI();
  const spinner = (!jsonMode && !compactMode && process.stdout.isTTY) ? ora('Loading project context').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const workspaceInfo = await manager.storage.getWorkspaceInfo();
    const modeInfo = await resolveWorkspaceMode(manager.storage);
    const workspacePath = workspaceInfo.path;
    const projectName = workspaceInfo.name;
    const gitBranch = workspaceInfo.gitBranch;

    const allTasks = manager.getTasks() || [];
    const stats = collectStats(allTasks);

    const currentTask = manager.getCurrentTask();
    const nextTask = manager.getNextTask();
    const focusTask = currentTask || nextTask;
    const apiFirstContext = await buildApiFirstContext(manager, modeInfo, focusTask);

    let dependencies = [];
    let dependents = [];
    if (focusTask) {
      dependencies = currentTask ? manager.getUnmetDependencies(currentTask) : [];
      dependents = allTasks.filter(t => t.dependencies && t.dependencies.includes(focusTask.id));
    }

    const blockedTasks = allTasks
      .filter(t => (t.status === 'todo' || t.status === 'backlog' || t.status === 'blocked') && manager.getUnmetDependencies(t).length > 0)
      .sort(sortByPriorityAndCreated)
      .slice(0, 5)
      .map(taskItem => ({
        task: taskItem,
        blockers: manager.getUnmetDependencies(taskItem),
      }));

    const recentlyCompleted = allTasks
      .filter(t => t.status === 'done')
      .sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0))
      .slice(0, 5);

    const keyFiles = ['README.md', 'docs.md', 'QUICKSTART.md', 'ARCHITECTURE.md', 'API.md']
      .filter(file => existsSync(path.join(workspacePath, file)));

    const project = {
      name: projectName,
      path: workspacePath,
      gitBranch: gitBranch || null,
      source: workspaceInfo.source,
      sourcePath: workspaceInfo.sourcePath,
    };

    if (fullMode) {
      project.requestedPath = workspaceInfo.requestedPath;
      project.configPath = workspaceInfo.configPath;
    }

    const contextData = {
      project,
      stats,
      currentTask,
      nextReadyTask: nextTask,
      dependencies,
      dependents,
      blockedTasks,
      recentlyCompleted,
      keyFiles,
      fullMode,
      showCommandHints: await shouldShowWorkspaceHint(manager.storage, 'ncfr:pretty-hints'),
    };

    if (jsonMode) {
      spinner?.stop();
      const responseData = {
        statistics: stats,
        mode: modeInfo.mode,
        currentTask: currentTask ? formatTaskJSON(currentTask) : null,
        dependencies: dependencies.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
        nextReadyTask: nextTask ? formatTaskSummaryJSON(nextTask) : null,
        focus: apiFirstContext?.currentContract ? 'contract-first' : (currentTask ? 'current-task' : (nextTask ? 'next-ready-task' : 'none')),
      };

      if (apiFirstContext) {
        responseData.currentContract = apiFirstContext.currentContract;
        responseData.relatedContracts = apiFirstContext.relatedContracts;
        responseData.openContractQuestions = apiFirstContext.openContractQuestions;
        responseData.relatedTasks = apiFirstContext.relatedTasks;
        responseData.contractReminders = apiFirstContext.contractReminders;
        responseData.contractReminderSummary = apiFirstContext.contractReminderSummary;
      }

      if (fullMode) {
        responseData.dependents = dependents.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        }));
        responseData.blockedTasks = blockedTasks.map(item => ({
          task: formatTaskJSON(item.task),
          blockers: item.blockers.map(blocker => ({
            id: blocker.id,
            title: blocker.title,
            status: blocker.status,
            priority: blocker.priority,
          })),
        }));
        responseData.recentlyCompleted = recentlyCompleted.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          completedAt: t.completedAt || null,
        }));
        responseData.keyFiles = keyFiles;
      }

      const workspaceJSON = await formatWorkspaceJSON(manager.storage, allTasks.length, { full: fullMode });
      outputJSON(formatSuccessResponse(responseData, workspaceJSON));
      return;
    }

    spinner?.stop();
    if (compactMode) {
      printCompactContext(contextData);
    } else {
      printPrettyContext(contextData, chalk, options);
    }
  } catch (error) {
    spinner?.fail('Failed to load context');
    if (jsonMode) {
      outputJSON(formatErrorResponse(error, 'NCFR_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
