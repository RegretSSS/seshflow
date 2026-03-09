import { TaskManager } from '../core/task-manager.js';
import { truncate } from '../utils/helpers.js';
import { isJSONMode, formatErrorResponse, formatSuccessResponse, formatWorkspaceJSON, outputJSON, formatTaskJSON } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';
import { shouldShowWorkspaceHint } from '../utils/hint-throttle.js';
import { loadTextUI } from '../utils/text-ui.js';
import { resolveWorkspaceMode } from '../core/workspace-mode.js';
import { buildApiFirstContext } from '../core/apifirst-context.js';

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
  if (task.runtime?.runs?.length) {
    console.log(`runtime_records=${task.runtime.runs.length}`);
  }
  if (task.runtime?.processes?.length) {
    console.log(`process_records=${task.runtime.processes.length}`);
  }
}

function displayPretty(task, chalk, blockers = [], runtimeEntries = [], processEntries = []) {
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

  if (runtimeEntries.length > 0) {
    console.log(chalk.cyan(`\n  Recent Runtime (${runtimeEntries.length}):`));
    runtimeEntries.forEach(entry => {
      const parts = [];
      if (entry.command) parts.push(`cmd=${truncate(entry.command, 48)}`);
      if (entry.outputRoot) parts.push(`out=${truncate(entry.outputRoot, 32)}`);
      if (entry.logFile) parts.push(`log=${truncate(entry.logFile, 32)}`);
      if (entry.artifacts?.length) parts.push(`artifacts=${entry.artifacts.length}`);
      console.log(chalk.cyan(`    - ${parts.join(' | ') || 'recorded context'}`));
    });
  }

  if (processEntries.length > 0) {
    console.log(chalk.cyan(`\n  Processes (${processEntries.length}):`));
    processEntries.forEach(entry => {
      const parts = [`pid=${entry.pid}`, `state=${entry.state}`];
      if (entry.command) parts.push(`cmd=${truncate(entry.command, 48)}`);
      if (entry.outputRoot) parts.push(`out=${truncate(entry.outputRoot, 32)}`);
      console.log(chalk.cyan(`    - ${parts.join(' | ')}`));
    });
  }
}

export async function show(taskId, options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const jsonMode = isJSONMode(options);
  const { chalk, ora } = jsonMode ? { chalk: null, ora: null } : await loadTextUI();
  const spinner = (!jsonMode && !compactMode && process.stdout.isTTY) ? ora('Loading task').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();
    const modeInfo = await resolveWorkspaceMode(manager.storage);

    const task = manager.getTask(taskId);
    if (!task) {
      spinner?.stop();
      if (jsonMode) {
        outputJSON(formatErrorResponse(new Error(`Task not found: ${taskId}`), 'TASK_NOT_FOUND'));
      } else {
        console.error(chalk.red(`\nTask not found: ${taskId}`));
        console.error(chalk.gray(`  Use 'seshflow list' to see all tasks`));
      }
      process.exit(1);
    }

    const apiFirstContext = await buildApiFirstContext(manager, modeInfo, task);

    const blockers = manager.getBlockedBy(task)
      .map(id => manager.getTask(id))
      .filter(Boolean);
    const runtimeEntries = manager.getRecentRuntimeEntries(task);
    const runtimeSummary = manager.getRuntimeSummary(task);
    const processEntries = manager.getRecentProcessEntries(task);
    const processSummary = manager.getProcessSummary(task);
    const runtimeEventSummary = manager.getRuntimeEventSummary(task);
    const includeFullJSON = options.full === true;
    const runtimeEvents = includeFullJSON ? manager.getTaskRuntimeEvents(task.id, 5) : [];

    spinner?.stop();

    if (jsonMode) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        mode: modeInfo.mode,
        detailLevel: includeFullJSON ? 'full' : 'summary',
        task: formatTaskJSON(task),
        currentContract: apiFirstContext?.currentContract || null,
        relatedContracts: apiFirstContext?.relatedContracts || [],
        openContractQuestions: apiFirstContext?.openContractQuestions || [],
        relatedContractTasks: apiFirstContext?.relatedTasks || [],
        contractReminders: apiFirstContext?.contractReminders || [],
        contractReminderSummary: apiFirstContext?.contractReminderSummary || { total: 0, errors: 0, warnings: 0 },
        subtasks: task.subtasks || [],
        dependencies: task.dependencies || [],
        blockedBy: blockers.map(t => ({ id: t.id, title: t.title, status: t.status })),
        runtimeSummary,
        recentRuntime: runtimeEntries,
        processSummary,
        recentProcesses: processEntries,
        runtimeEventSummary,
        ...(includeFullJSON ? { recentRuntimeEvents: runtimeEvents } : {}),
      }, workspaceJSON));
      return;
    }

    if (compactMode) {
      displayCompact(task, blockers);
      return;
    }

    displayPretty(task, chalk, blockers, runtimeEntries, processEntries);

    if (await shouldShowWorkspaceHint(manager.storage, 'show:pretty-hint')) {
      console.log(chalk.blue('\nCommands:'));
      if (task.status === 'backlog' || task.status === 'todo') {
        console.log(chalk.gray('  seshflow next - Start this task'));
      }
      if (task.status === 'in-progress') {
        console.log(chalk.gray('  seshflow done [options] - Complete this task'));
      }
      console.log(chalk.gray(`  seshflow deps ${taskId} - Show dependencies`));
      console.log(chalk.gray(`  seshflow delete ${taskId} - Delete this task`));
    }
  } catch (error) {
    spinner?.fail('Failed to show task');
    if (jsonMode) {
      outputJSON(formatErrorResponse(error, 'SHOW_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
