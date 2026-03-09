import chalk from 'chalk';
import { TaskManager } from '../core/task-manager.js';
import { AnnouncementService } from '../core/announcement-service.js';
import { formatErrorResponse, formatSuccessResponse, formatTaskJSON, formatWorkspaceJSON, isJSONMode, outputJSON } from '../utils/json-output.js';

export async function announceProgress(taskIdOrOptions = {}, maybeOptions = {}) {
  const taskId = typeof taskIdOrOptions === 'string' ? taskIdOrOptions : null;
  const options = typeof taskIdOrOptions === 'string' ? maybeOptions : (taskIdOrOptions || {});
  let manager;

  try {
    manager = new TaskManager();
    await manager.init();
    const task = taskId ? manager.getTask(taskId) : manager.getCurrentTask();

    if (!task) {
      const error = new Error(taskId ? `Task not found: ${taskId}` : 'No active task to announce progress for');
      if (isJSONMode(options)) {
        outputJSON(formatErrorResponse(error, taskId ? 'TASK_NOT_FOUND' : 'NO_ACTIVE_TASK'));
      }
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }

    const service = new AnnouncementService(manager);
    const percent = options.percent !== undefined ? Number.parseFloat(options.percent) : null;
    if (options.percent !== undefined && Number.isNaN(percent)) {
      throw new Error(`Invalid percent: ${options.percent}`);
    }

    const announcementResults = await service.announceProgress(task, {
      source: 'cli.announce.progress',
      percent,
      note: options.note || '',
    });
    await manager.saveData();

    if (isJSONMode(options)) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        action: 'announce.progress',
        task: formatTaskJSON(task),
        percent,
        note: options.note || '',
        announcementResults,
      }, workspaceJSON));
      return;
    }

    console.log(chalk.green(`\nProgress announced for ${task.id}`));
    if (percent !== null) {
      console.log(chalk.gray(`  percent=${percent}`));
    }
    if (options.note) {
      console.log(chalk.gray(`  note=${options.note}`));
    }
  } catch (error) {
    if (manager) {
      try {
        await manager.saveData();
      } catch {
        // Best-effort persistence.
      }
    }
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'ANNOUNCE_FAILED'));
    }
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
