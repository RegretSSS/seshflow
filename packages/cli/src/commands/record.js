import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { isJSONMode, formatSuccessResponse, formatWorkspaceJSON, outputJSON } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';

function parseArtifacts(rawArtifacts = '') {
  return String(rawArtifacts || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function toPlainOptions(rawOptions = {}) {
  if (rawOptions && typeof rawOptions.opts === 'function') {
    return {
      ...rawOptions.opts(),
    };
  }

  return rawOptions || {};
}

function normalizeInput(taskIdOrOptions, maybeOptions) {
  if (typeof taskIdOrOptions === 'string') {
    return {
      taskId: taskIdOrOptions,
      options: toPlainOptions(maybeOptions),
    };
  }

  if (taskIdOrOptions && typeof taskIdOrOptions.opts === 'function') {
    return {
      taskId: null,
      options: toPlainOptions(taskIdOrOptions),
    };
  }

  return {
    taskId: null,
    options: toPlainOptions(taskIdOrOptions),
  };
}

export async function record(taskIdOrOptions = {}, maybeOptions = {}) {
  const { taskId, options } = normalizeInput(taskIdOrOptions, maybeOptions);
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = (!compactMode && process.stdout.isTTY) ? ora('Recording runtime context').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const targetTask = taskId
      ? manager.getTask(taskId)
      : manager.getCurrentTask();

    if (!targetTask) {
      spinner?.stop();
      const message = taskId ? `Task not found: ${taskId}` : 'No active session. Provide <taskId> or start a task first.';
      if (isJSONMode(options)) {
        outputJSON({
          success: false,
          error: message
        });
      } else {
        console.error(chalk.red(`\n${message}`));
      }
      process.exit(1);
    }

    const artifacts = parseArtifacts(options.artifact ?? options.artifacts);
    const hasMeaningfulInput = Boolean(
      options.command ||
      options.log ||
      options.outputRoot ||
      options.note ||
      artifacts.length > 0
    );

    if (!hasMeaningfulInput) {
      spinner?.stop();
      const message = 'Provide at least one runtime detail: --command, --log, --output-root, --artifact, or --note.';
      if (isJSONMode(options)) {
        outputJSON({
          success: false,
          error: message
        });
      } else {
        console.error(chalk.red(`\n${message}`));
      }
      process.exit(1);
    }

    const entry = manager.recordRuntime(targetTask.id, {
      command: options.command || '',
      cwd: options.cwd || manager.storage.getWorkspacePath(),
      logFile: options.log || null,
      outputRoot: options.outputRoot || null,
      artifacts,
      note: options.note || '',
    });
    await manager.saveData();
    spinner?.succeed('Runtime context recorded');

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        taskId: targetTask.id,
        runtimeEntry: entry,
        runtimeSummary: manager.getRuntimeSummary(targetTask),
      }, workspaceJSON));
      return;
    }

    if (compactMode) {
      const parts = [`command=${entry.command || '<none>'}`];
      if (entry.logFile) parts.push(`log=${entry.logFile}`);
      if (entry.outputRoot) parts.push(`output=${entry.outputRoot}`);
      if (entry.artifacts.length > 0) parts.push(`artifacts=${entry.artifacts.length}`);
      console.log(`RECORDED | ${targetTask.id} | ${parts.join(' | ')}`);
      return;
    }

    console.log(chalk.green(`\nRecorded runtime context for: ${targetTask.title}`));
    console.log(chalk.gray(`  ID: ${targetTask.id}`));
    if (entry.command) console.log(chalk.gray(`  Command: ${entry.command}`));
    console.log(chalk.gray(`  Working Dir: ${entry.cwd}`));
    if (entry.logFile) console.log(chalk.gray(`  Log File: ${entry.logFile}`));
    if (entry.outputRoot) console.log(chalk.gray(`  Output Root: ${entry.outputRoot}`));
    if (entry.artifacts.length > 0) console.log(chalk.gray(`  Artifacts: ${entry.artifacts.join(', ')}`));
    if (entry.note) console.log(chalk.gray(`  Note: ${entry.note}`));
  } catch (error) {
    spinner?.fail('Failed to record runtime context');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
