import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import {
  formatErrorResponse,
  formatSuccessResponse,
  formatTaskJSON,
  formatWorkspaceJSON,
  isJSONMode,
  outputJSON
} from '../utils/json-output.js';

function dependencyPayload(result) {
  return {
    id: result.dependencyTask?.id || null,
    title: result.dependencyTask?.title || null,
  };
}

async function runDependencyMutation(action, taskId, dependencyId, options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY)
    ? ora(`${action === 'add' ? 'Adding' : 'Removing'} dependency`).start()
    : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const result = action === 'add'
      ? manager.addDependency(taskId, dependencyId)
      : manager.removeDependency(taskId, dependencyId);

    await manager.saveData();
    spinner?.stop();

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        action: action === 'add' ? 'add-dependency' : 'remove-dependency',
        changed: action === 'add' ? result.added : result.removed,
        task: formatTaskJSON(result.task),
        dependency: dependencyPayload(result),
        blockedBy: manager.getBlockedBy(result.task),
      }, workspaceJSON));
      return;
    }

    const verb = action === 'add' ? (result.added ? 'ADDED' : 'UNCHANGED') : (result.removed ? 'REMOVED' : 'UNCHANGED');
    console.log(`${verb} | ${result.task.id} | dep=${dependencyId}`);
    return;
  } catch (error) {
    spinner?.stop();
    if (isJSONMode(options)) {
      const code = error.message.includes('cycle')
        ? 'DEPENDENCY_CYCLE'
        : error.message.includes('itself')
          ? 'SELF_DEPENDENCY'
          : error.message.includes('Dependency task not found')
            ? 'DEPENDENCY_NOT_FOUND'
            : 'DEPENDENCY_MUTATION_FAILED';
      outputJSON(formatErrorResponse(error, code));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

export async function addDependency(taskId, dependencyId, options = {}) {
  return runDependencyMutation('add', taskId, dependencyId, options);
}

export async function removeDependency(taskId, dependencyId, options = {}) {
  return runDependencyMutation('remove', taskId, dependencyId, options);
}
