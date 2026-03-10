import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { HandoffService } from '../core/handoff-service.js';
import {
  formatErrorResponse,
  formatSuccessResponse,
  formatWorkspaceJSON,
  isJSONMode,
  outputJSON,
} from '../utils/json-output.js';
import { handlePreInitGuard } from '../utils/workspace-guard.js';
import { omitEmptyFields } from '../utils/helpers.js';

function formatHandoffSummary(handoff) {
  return omitEmptyFields({
    handoffId: handoff.handoffId,
    sourceTaskId: handoff.sourceTaskId,
    sourceContractIds: handoff.sourceContractIds || [],
    targetWorktreePath: handoff.targetWorktreePath,
    targetBranchName: handoff.targetBranchName,
    status: handoff.status,
    executorKind: handoff.executorKind,
    owner: handoff.owner || undefined,
    manifestPath: handoff.manifestPath || undefined,
    createdAt: handoff.createdAt,
    activatedAt: handoff.activatedAt || undefined,
    submittedAt: handoff.submittedAt || undefined,
    closedAt: handoff.closedAt || undefined,
    resultRef: handoff.resultRef || undefined,
  });
}

function printHandoffSummary(result) {
  const parts = [
    result.handoff.handoffId,
    `task=${result.handoff.sourceTaskId}`,
    `branch=${result.branchName}`,
    `path=${result.targetWorktreePath}`,
    `status=${result.handoff.status}`,
  ];
  console.log(`HANDOFF | ${parts.join(' | ')}`);
  if (result.manifestPath) {
    console.log(`manifest=${result.manifestPath}`);
  }
  if (result.bundlePath) {
    console.log(`bundle=${result.bundlePath}`);
  }
}

export async function createHandoff(taskId, options = {}) {
  if (handlePreInitGuard('handoff create', options)) {
    process.exit(1);
  }

  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Creating delegated handoff').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const service = new HandoffService(manager);
    const result = await service.createAndMaterialize({
      sourceTaskId: taskId,
      targetWorktreePath: options.path || '',
      branchName: options.branch || '',
      executorKind: options.executorKind || options.executor || '',
      ownerId: options.owner || null,
      ownerLabel: options.ownerLabel || null,
      notes: options.note ? [options.note] : [],
    });

    spinner?.succeed('Handoff created');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(manager.storage, manager.getTasks().length, { compact: true });
      outputJSON(formatSuccessResponse({
        action: 'handoff.create',
        created: true,
        handoff: formatHandoffSummary(result.handoff),
        manifestPath: result.manifestPath,
        bundlePath: result.bundlePath,
        targetWorktree: {
          path: result.targetWorktreePath,
          branch: result.branchName,
        },
      }, workspace));
      return;
    }

    printHandoffSummary(result);
  } catch (error) {
    spinner?.fail('Failed to create handoff');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'HANDOFF_CREATE_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

function printLifecycleSummary(action, handoff) {
  const parts = [
    action,
    handoff.handoffId,
    `task=${handoff.sourceTaskId}`,
    `status=${handoff.status}`,
  ];

  if (handoff.resultRef) {
    parts.push(`result=${handoff.resultRef}`);
  }

  console.log(`HANDOFF | ${parts.join(' | ')}`);
}

async function transitionHandoff(action, handoffId, options = {}) {
  if (handlePreInitGuard(`handoff ${action}`, options)) {
    process.exit(1);
  }

  const spinner = (!isJSONMode(options) && process.stdout.isTTY)
    ? ora(`Updating handoff lifecycle: ${action}`).start()
    : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const service = new HandoffService(manager);
    const handoff = await service.transitionLifecycle(handoffId, action, {
      note: options.note || '',
      resultRef: options.resultRef || '',
    });

    spinner?.succeed(`Handoff ${action} complete`);

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(manager.storage, manager.getTasks().length, { compact: true });
      outputJSON(formatSuccessResponse({
        action: `handoff.${action}`,
        updated: true,
        handoff: formatHandoffSummary(handoff),
      }, workspace));
      return;
    }

    printLifecycleSummary(action, handoff);
  } catch (error) {
    spinner?.fail(`Failed to ${action} handoff`);
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'HANDOFF_LIFECYCLE_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

export const activateHandoff = (handoffId, options) => transitionHandoff('activate', handoffId, options);
export const pauseHandoff = (handoffId, options) => transitionHandoff('pause', handoffId, options);
export const submitHandoff = (handoffId, options) => transitionHandoff('submit', handoffId, options);
export const abandonHandoff = (handoffId, options) => transitionHandoff('abandon', handoffId, options);
export const reclaimHandoff = (handoffId, options) => transitionHandoff('reclaim', handoffId, options);
export const closeHandoff = (handoffId, options) => transitionHandoff('close', handoffId, options);
