import { formatTaskJSON, formatWorkspaceJSON, formatSuccessResponse, formatErrorResponse, outputJSON, isJSONMode } from '../utils/json-output.js';
import { TaskManager } from '../core/task-manager.js';
import { TaskTransitionService } from '../core/task-transition-service.js';
import { truncate } from '../utils/helpers.js';
import { resolveOutputMode } from '../utils/output-mode.js';
import { shouldShowWorkspaceHint } from '../utils/hint-throttle.js';
import { loadTextUI } from '../utils/text-ui.js';
import { resolveWorkspaceMode } from '../core/workspace-mode.js';
import { buildApiFirstContext } from '../core/apifirst-context.js';

function displayTask(task, chalk, showFull = false) {
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

function priorityWeight(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function formatTaskRef(task) {
  return `${task.id}:${truncate(task.title || task.id, 50).replace(/\|/g, '/')}`;
}

function findTopBlockedTask(manager, filters = {}) {
  let candidates = manager.getTasks().filter(t => t.status === 'todo' || t.status === 'backlog');

  if (filters.priority) {
    const minWeight = priorityWeight(filters.priority);
    candidates = candidates.filter(t => priorityWeight(t.priority) <= minWeight);
  }
  if (filters.tag) {
    candidates = candidates.filter(t => t.tags.includes(filters.tag));
  }
  if (filters.assignee) {
    candidates = candidates.filter(t => t.assignee === filters.assignee);
  }

  const blockedCandidates = candidates
    .map(task => ({ task, unmetDeps: manager.getUnmetDependencies(task) }))
    .filter(entry => entry.unmetDeps.length > 0)
    .sort((a, b) => {
      if (priorityWeight(a.task.priority) !== priorityWeight(b.task.priority)) {
        return priorityWeight(a.task.priority) - priorityWeight(b.task.priority);
      }
      return new Date(a.task.createdAt) - new Date(b.task.createdAt);
    });

  return blockedCandidates[0] || null;
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
    console.log(`unlocks=${dependents.map(formatTaskRef).join(',')}`);
  }
  const runtimeSummary = manager.getRuntimeSummary(task);
  if (runtimeSummary.recordCount > 0) {
    const parts = [`count=${runtimeSummary.recordCount}`];
    if (runtimeSummary.lastCommand) parts.push(`cmd=${truncate(runtimeSummary.lastCommand, 48)}`);
    if (runtimeSummary.lastOutputRoot) parts.push(`out=${truncate(runtimeSummary.lastOutputRoot, 32)}`);
    if (runtimeSummary.lastArtifacts.length > 0) parts.push(`artifacts=${runtimeSummary.lastArtifacts.length}`);
    console.log(`runtime=${parts.join(' | ')}`);
  }
  const processSummary = manager.getProcessSummary(task);
  if (processSummary.recordCount > 0) {
    const parts = [`count=${processSummary.recordCount}`];
    if (processSummary.runningCount > 0) parts.push(`running=${processSummary.runningCount}`);
    if (processSummary.missingCount > 0) parts.push(`missing=${processSummary.missingCount}`);
    if (processSummary.lastPid) parts.push(`pid=${processSummary.lastPid}`);
    console.log(`processes=${parts.join(' | ')}`);
  }
}

export async function next(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const jsonMode = isJSONMode(options);
  const { chalk, ora } = jsonMode ? { chalk: null, ora: null } : await loadTextUI();
  const spinner = (!jsonMode && !compactMode) ? ora('Loading workspace').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();
    const transitions = new TaskTransitionService(manager);
    const modeInfo = await resolveWorkspaceMode(manager.storage);

    if (jsonMode) {
      const currentTask = manager.getCurrentTask();
      if (currentTask) {
        spinner?.stop();
        const apiFirstContext = await buildApiFirstContext(manager, modeInfo, currentTask);
        const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
        outputJSON(formatSuccessResponse({
          mode: modeInfo.mode,
          task: formatTaskJSON(currentTask),
          contextPriority: apiFirstContext?.contextPriority || null,
          currentContract: apiFirstContext?.currentContract || null,
          relatedContracts: apiFirstContext?.relatedContracts || [],
          openContractQuestions: apiFirstContext?.openContractQuestions || [],
          contractReminders: apiFirstContext?.contractReminders || [],
          contractReminderSummary: apiFirstContext?.contractReminderSummary || { total: 0, errors: 0, warnings: 0 },
          runtimeSummary: manager.getRuntimeSummary(currentTask),
          processSummary: manager.getProcessSummary(currentTask),
          hasActiveSession: true,
        }, workspaceJSON));
        return;
      }

      const nextTask = manager.getNextTask({
        priority: options.priority,
        tag: options.tag,
        assignee: options.assignee
      });

      spinner?.stop();

      if (!nextTask) {
        const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
        outputJSON(formatSuccessResponse({
          mode: modeInfo.mode,
          task: null,
          message: 'No tasks to work on',
        }, workspaceJSON));
        return;
      }

      const unmetDeps = manager.getUnmetDependencies(nextTask);
      const apiFirstContext = await buildApiFirstContext(manager, modeInfo, nextTask);
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        mode: modeInfo.mode,
        task: formatTaskJSON(nextTask),
        contextPriority: apiFirstContext?.contextPriority || null,
        currentContract: apiFirstContext?.currentContract || null,
        relatedContracts: apiFirstContext?.relatedContracts || [],
        openContractQuestions: apiFirstContext?.openContractQuestions || [],
        contractReminders: apiFirstContext?.contractReminders || [],
        contractReminderSummary: apiFirstContext?.contractReminderSummary || { total: 0, errors: 0, warnings: 0 },
        unmetDependencies: unmetDeps.map(d => ({
          id: d.id,
          title: d.title,
          status: d.status,
        })),
        runtimeSummary: manager.getRuntimeSummary(nextTask),
        processSummary: manager.getProcessSummary(nextTask),
        hasActiveSession: false,
      }, workspaceJSON));
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
        displayTask(currentTask, chalk, true);
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
      const blockedInfo = findTopBlockedTask(manager, {
        priority: options.priority,
        tag: options.tag,
        assignee: options.assignee,
      });
      if (compactMode) {
        if (blockedInfo) {
          console.log(`BLOCKED | ${toCompactLine(blockedInfo.task)} | blocked_by=${blockedInfo.unmetDeps.map(formatTaskRef).join(',')}`);
        } else {
          console.log('NO_TASK');
        }
      } else {
        if (blockedInfo) {
          console.log(chalk.yellow('\nNo ready task. Top candidate is blocked by:'));
          blockedInfo.unmetDeps.forEach(dep => {
            console.log(chalk.gray(`  - ${dep.id} | ${dep.status} | ${dep.title}`));
          });
        } else {
          console.log(chalk.green('\nNo tasks to work on.'));
          console.log(chalk.gray('  Add a new task with: seshflow add "Task name"'));
        }
      }
      return;
    }

    const unmetDeps = manager.getUnmetDependencies(nextTask);
    if (unmetDeps.length > 0) {
      if (compactMode) {
        console.log(`BLOCKED | ${toCompactLine(nextTask)} | blocked_by=${unmetDeps.map(formatTaskRef).join(',')}`);
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
    await transitions.startTask(nextTask.id, {
      source: 'cli.next',
    });
    await manager.saveData();
    sessionSpinner?.succeed('Session started');

    if (compactMode) {
      const subtaskInfo = nextTask.subtasks?.length
        ? ` | subtasks=${nextTask.subtasks.filter(st => st.completed).length}/${nextTask.subtasks.length}`
        : '';
      console.log(`NEXT | ${toCompactLine(nextTask)}${subtaskInfo}`);
      compactTaskContext(nextTask, manager);
    } else {
      displayTask(nextTask, chalk, true);
    }

    if (nextTask.gitBranch && options.git) {
      try {
        const { default: simpleGit } = await import('simple-git');
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

    if (await shouldShowWorkspaceHint(manager.storage, 'next:pretty-hint')) {
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
    }
  } catch (error) {
    spinner?.fail('Failed to get next task');
    if (jsonMode) {
      outputJSON(formatErrorResponse(error, 'NEXT_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
