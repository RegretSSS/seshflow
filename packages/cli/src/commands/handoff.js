import fs from 'fs-extra';
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

function summarizeTask(task) {
  if (!task) {
    return null;
  }

  return omitEmptyFields({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    contractIds: task.contractIds || [],
    contractRole: task.contractRole || undefined,
  });
}

function formatHandoffListItem(manager, handoff) {
  const task = manager.getTask(handoff.sourceTaskId);
  return omitEmptyFields({
    ...formatHandoffSummary(handoff),
    sourceTask: summarizeTask(task),
    bundleSummary: handoff.bundle || undefined,
    notesCount: Array.isArray(handoff.notes) ? handoff.notes.length : 0,
    lastNote: Array.isArray(handoff.notes) && handoff.notes.length > 0
      ? handoff.notes[handoff.notes.length - 1]
      : undefined,
  });
}

async function formatHandoffDetail(manager, handoff, options = {}) {
  const task = manager.getTask(handoff.sourceTaskId);
  const detail = omitEmptyFields({
    handoff: formatHandoffSummary(handoff),
    sourceTask: summarizeTask(task),
    parentWorkspace: {
      path: manager.storage.getWorkspacePath(),
      sourceTaskId: handoff.sourceTaskId,
      sourceContractIds: handoff.sourceContractIds || [],
    },
    target: omitEmptyFields({
      worktreePath: handoff.targetWorktreePath,
      branchName: handoff.targetBranchName,
      manifestPath: handoff.manifestPath || undefined,
      bundlePath: handoff.bundle?.bundlePath || undefined,
    }),
    bundleSummary: handoff.bundle || undefined,
    notes: Array.isArray(handoff.notes) && handoff.notes.length > 0 ? handoff.notes : undefined,
  });

  if (!options.full) {
    return detail;
  }

  if (handoff.manifestPath && await fs.pathExists(handoff.manifestPath)) {
    detail.manifest = await fs.readJson(handoff.manifestPath);
  }

  const bundlePath = handoff.bundle?.bundlePath;
  if (bundlePath && await fs.pathExists(bundlePath)) {
    detail.bundle = await fs.readJson(bundlePath);
  }

  return detail;
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

export async function listHandoffs(options = {}) {
  if (handlePreInitGuard('handoff list', options)) {
    process.exit(1);
  }

  try {
    const manager = new TaskManager();
    await manager.init();
    const limit = Number.isInteger(Number(options.limit)) ? Number(options.limit) : null;
    const items = manager.getHandoffs()
      .slice()
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, limit || undefined)
      .map(handoff => formatHandoffListItem(manager, handoff));

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(manager.storage, manager.getTasks().length, { compact: true });
      outputJSON(formatSuccessResponse({
        action: 'handoff.list',
        count: items.length,
        handoffs: items,
      }, workspace));
      return;
    }

    if (items.length === 0) {
      console.log('No handoffs found.');
      return;
    }

    for (const item of items) {
      console.log(`HANDOFF | ${item.handoffId} | task=${item.sourceTask?.id || item.sourceTaskId} | status=${item.status}`);
      console.log(`  branch=${item.targetBranchName} | path=${item.targetWorktreePath}`);
      if (item.bundleSummary?.primaryContractId) {
        console.log(`  contract=${item.bundleSummary.primaryContractId}`);
      }
      if (item.lastNote?.note) {
        console.log(`  note=${item.lastNote.note}`);
      }
    }
  } catch (error) {
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'HANDOFF_LIST_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

export async function showHandoff(handoffId, options = {}) {
  if (handlePreInitGuard('handoff show', options)) {
    process.exit(1);
  }

  try {
    const manager = new TaskManager();
    await manager.init();
    const handoff = manager.getHandoff(handoffId);
    if (!handoff) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    const detail = await formatHandoffDetail(manager, handoff, { full: Boolean(options.full) });

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(manager.storage, manager.getTasks().length, { compact: true });
      outputJSON(formatSuccessResponse({
        action: 'handoff.show',
        ...detail,
      }, workspace));
      return;
    }

    console.log(`HANDOFF | ${detail.handoff.handoffId} | status=${detail.handoff.status}`);
    console.log(`task=${detail.sourceTask?.id || handoff.sourceTaskId} | branch=${detail.target.branchName}`);
    console.log(`worktree=${detail.target.worktreePath}`);
    if (detail.handoff.resultRef) {
      console.log(`result=${typeof detail.handoff.resultRef === 'string' ? detail.handoff.resultRef : JSON.stringify(detail.handoff.resultRef)}`);
    }
    if (detail.notes?.length) {
      console.log(`notes=${detail.notes.length}`);
    }
    if (options.full) {
      console.log(`manifest=${detail.target.manifestPath}`);
      console.log(`bundle=${detail.target.bundlePath}`);
    }
  } catch (error) {
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'HANDOFF_SHOW_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
