import path from 'node:path';
import fs from 'fs-extra';
import { PATHS } from '../constants.js';
import { sanitizeBranchName, toISOString } from '../utils/helpers.js';
import { ACTIVE_HANDOFF_STATUSES, HANDOFF_EXECUTOR_KINDS, HANDOFF_STATUSES } from '../../../shared/constants/handoffs.js';
import { ContractRegistry } from './contract-registry.js';
import { resolveWorkspaceMode } from './workspace-mode.js';
import { buildApiFirstContext } from './apifirst-context.js';

function buildOwner(ownerId = null, ownerLabel = null) {
  if (!ownerId && !ownerLabel) {
    return null;
  }

  return {
    id: ownerId || null,
    label: ownerLabel || ownerId || null,
  };
}

function summarizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    contractIds: task.contractIds || [],
    boundFiles: task.boundFiles || [],
  };
}

export class HandoffService {
  constructor(manager) {
    this.manager = manager;
  }

  async createAndMaterialize(options = {}) {
    const task = this.manager.getTask(options.sourceTaskId);
    if (!task) {
      throw new Error(`Task not found: ${options.sourceTaskId}`);
    }

    const { default: simpleGit } = await import('simple-git');
    const workspacePath = this.manager.storage.getWorkspacePath();
    const git = simpleGit({ baseDir: workspacePath });
    const repoRoot = (await git.raw(['rev-parse', '--show-toplevel'])).trim();

    if (!repoRoot) {
      throw new Error('Current workspace is not inside a git repository.');
    }

    const branchName = this.resolveBranchName(task, options.branchName);
    const targetWorktreePath = this.resolveTargetWorktreePath(workspacePath, task, options.targetWorktreePath);
    this.assertTaskCanBeDelegated(task.id);
    await this.validateMaterializationTarget(git, workspacePath, targetWorktreePath, branchName);

    const handoff = this.manager.createHandoff({
      sourceTaskId: task.id,
      sourceContractIds: options.sourceContractIds,
      targetWorktreePath,
      targetBranchName: branchName,
      status: HANDOFF_STATUSES.CREATED,
      executorKind: options.executorKind || HANDOFF_EXECUTOR_KINDS.UNKNOWN,
      owner: buildOwner(options.ownerId, options.ownerLabel),
      notes: Array.isArray(options.notes) ? options.notes : [],
      bundle: this.buildBundleStub(task),
    });

    const manifestPath = path.join(targetWorktreePath, '.seshflow', 'handoffs', `${handoff.handoffId}.json`);
    const bundlePath = path.join(targetWorktreePath, '.seshflow', 'handoffs', `${handoff.handoffId}.bundle.json`);

    try {
      await fs.ensureDir(path.dirname(targetWorktreePath));
      await git.raw(['worktree', 'add', '-b', branchName, targetWorktreePath]);

      const activatedAt = toISOString();
      const bundle = await this.buildHandoffBundle(handoff, task, {
        targetWorktreePath,
        branchName,
        bundlePath,
        activatedAt,
      });
      const manifest = this.buildManifest({
        handoff,
        task,
        repoRoot,
        targetWorktreePath,
        manifestPath,
        bundlePath,
        activatedAt,
        bundle,
      });

      await fs.ensureDir(path.dirname(manifestPath));
      await fs.writeJson(bundlePath, bundle, { spaces: 2 });
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      const updatedHandoff = this.manager.updateHandoff(handoff.handoffId, {
        status: HANDOFF_STATUSES.ACTIVE,
        activatedAt,
        manifestPath,
        bundle: manifest.bundleSummary,
      });

      await this.manager.saveData();
      return {
        handoff: updatedHandoff,
        manifestPath,
        bundlePath,
        targetWorktreePath,
        branchName,
        manifest,
        bundle,
      };
    } catch (error) {
      await this.cleanupFailedMaterialization(git, targetWorktreePath);
      throw new Error(`Failed to materialize handoff worktree: ${error.message}`);
    }
  }

  resolveBranchName(task, explicitBranchName = '') {
    if (explicitBranchName) {
      return explicitBranchName.trim();
    }

    const titlePart = sanitizeBranchName(task.title || task.id).slice(0, 32);
    return `handoff/${task.id}-${titlePart || task.id}`;
  }

  resolveTargetWorktreePath(workspacePath, task, explicitPath = '') {
    if (explicitPath) {
      return path.resolve(workspacePath, explicitPath);
    }

    const workspaceName = path.basename(workspacePath);
    return path.resolve(path.dirname(workspacePath), `${workspaceName}-handoffs`, task.id);
  }

  async validateMaterializationTarget(git, workspacePath, targetWorktreePath, branchName) {
    if (targetWorktreePath === workspacePath || targetWorktreePath.startsWith(`${workspacePath}${path.sep}`)) {
      throw new Error('Target worktree path must live outside the parent workspace.');
    }

    if (await fs.pathExists(targetWorktreePath)) {
      throw new Error(`Target worktree path already exists: ${targetWorktreePath}`);
    }

    const localBranches = await git.branchLocal();
    if (localBranches.all.includes(branchName)) {
      throw new Error(`Target branch already exists: ${branchName}`);
    }
  }

  assertTaskCanBeDelegated(taskId) {
    const existingActiveHandoff = this.manager.getTaskHandoffs(taskId).find(handoff =>
      ACTIVE_HANDOFF_STATUSES.includes(handoff.status)
    );

    if (existingActiveHandoff) {
      throw new Error(`Task already has an active handoff: ${existingActiveHandoff.handoffId}`);
    }
  }

  buildBundleStub(task) {
    return {
      scope: 'delegated-local-closure',
      task: summarizeTask(task),
      executionBoundary: {
        sourceOfTruth: 'parent-workspace',
        allowTaskMutationInWorktree: false,
      },
    };
  }

  async buildHandoffBundle(handoff, task, options = {}) {
    const modeInfo = await resolveWorkspaceMode(this.manager.storage);
    const apiFirstContext = await buildApiFirstContext(this.manager, modeInfo, task);
    const registry = new ContractRegistry(this.manager.storage);
    const contracts = [];

    for (const contractId of handoff.sourceContractIds) {
      try {
        const contract = await registry.getContract(contractId);
        contracts.push(registry.summarizeContract(contract));
      } catch {
        // Keep bundle generation tolerant. Missing contract drift will surface elsewhere.
      }
    }

    const upstream = (task.dependencies || [])
      .map(depId => this.manager.getTask(depId))
      .filter(Boolean)
      .map(summarizeTask);
    const downstream = this.manager.getTasks()
      .filter(candidate => (candidate.dependencies || []).includes(task.id))
      .map(summarizeTask);

    return {
      schemaVersion: 1,
      handoffId: handoff.handoffId,
      generatedAt: options.activatedAt || toISOString(),
      mode: modeInfo.mode,
      task: {
        ...summarizeTask(task),
        description: task.description || undefined,
        contractRole: task.contractRole || undefined,
        tags: task.tags || [],
      },
      contractClosure: {
        primaryContractId: apiFirstContext?.primaryContractId || null,
        currentContract: apiFirstContext?.currentContract || null,
        relatedContracts: (apiFirstContext?.relatedContracts || []).filter(contract => contract.id !== apiFirstContext?.primaryContractId),
        sourceContracts: contracts,
        openQuestions: apiFirstContext?.openContractQuestions || [],
        reminderSummary: apiFirstContext?.contractReminderSummary || null,
      },
      dependencySummary: {
        upstream,
        downstream,
        unmetDependencies: this.manager.getUnmetDependencies(task).map(summarizeTask),
      },
      runtimeSummary: {
        runtime: this.manager.getRuntimeSummary(task),
        process: this.manager.getProcessSummary(task),
        runtimeEvents: this.manager.getRuntimeEventSummary(task),
      },
      executionBoundary: {
        kind: 'delegated-worktree-handoff',
        sourceOfTruth: 'parent-workspace',
        allowTaskMutationInWorktree: false,
        shouldNotDo: [
          'rewrite parent workspace task truth',
          'treat worktree as an independent task database',
          'assume handoff completion means task completion',
        ],
        expectedReturn: [
          'code changes or artifacts in the delegated worktree',
          'a result reference or summary for parent inspection',
        ],
      },
      target: {
        worktreePath: options.targetWorktreePath,
        branchName: options.branchName,
        bundlePath: options.bundlePath,
      },
    };
  }

  buildBundleSummary(bundle, bundlePath) {
    return {
      scope: bundle?.executionBoundary?.kind || 'delegated-local-closure',
      generatedAt: bundle?.generatedAt || null,
      bundlePath,
      taskId: bundle?.task?.id || null,
      primaryContractId: bundle?.contractClosure?.primaryContractId || null,
      contractCount: (bundle?.contractClosure?.sourceContracts || []).length,
      upstreamCount: (bundle?.dependencySummary?.upstream || []).length,
      downstreamCount: (bundle?.dependencySummary?.downstream || []).length,
    };
  }

  buildManifest({ handoff, task, repoRoot, targetWorktreePath, manifestPath, bundlePath, activatedAt, bundle }) {
    return {
      schemaVersion: 1,
      handoffId: handoff.handoffId,
      createdAt: handoff.createdAt,
      activatedAt,
      sourceOfTruth: {
        workspacePath: this.manager.storage.getWorkspacePath(),
        tasksFile: path.join(this.manager.storage.getWorkspacePath(), PATHS.TASKS_FILE),
        repoRoot,
      },
      target: {
        worktreePath: targetWorktreePath,
        branchName: handoff.targetBranchName,
        manifestPath,
        bundlePath,
      },
      task: summarizeTask(task),
      contractIds: handoff.sourceContractIds,
      executionBoundary: {
        kind: 'delegated-worktree-handoff',
        sourceOfTruth: 'parent-workspace',
        warning: 'This worktree is an execution surface, not a new source of task truth.',
      },
      bundleSummary: this.buildBundleSummary(bundle, bundlePath),
    };
  }

  async cleanupFailedMaterialization(git, targetWorktreePath) {
    try {
      if (await fs.pathExists(targetWorktreePath)) {
        await git.raw(['worktree', 'remove', '--force', targetWorktreePath]);
      }
    } catch {
      await fs.remove(targetWorktreePath);
    }
  }
}
