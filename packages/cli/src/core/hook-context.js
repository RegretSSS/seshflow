import {
  HOOK_CONTEXT_SCHEMA_VERSION,
  HOOK_FAMILIES,
  HOOK_PHASES,
  HOOK_SURFACES,
  HOOK_TAXONOMY,
} from '../../../shared/constants/hooks.js';
import { resolveWorkspaceMode } from './workspace-mode.js';

function summarizeTask(task) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    contractIds: task.contractIds || [],
    contractRole: task.contractRole || null,
    boundFiles: task.boundFiles || [],
  };
}

function summarizeTransition(transitionEvent) {
  if (!transitionEvent) {
    return null;
  }

  return {
    id: transitionEvent.id,
    type: transitionEvent.type,
    statusFrom: transitionEvent.statusFrom || null,
    statusTo: transitionEvent.statusTo || null,
    occurredAt: transitionEvent.occurredAt || null,
  };
}

function summarizeWorkspace(workspaceInfo) {
  return {
    path: workspaceInfo.path,
    name: workspaceInfo.name,
    gitBranch: workspaceInfo.gitBranch || null,
    source: workspaceInfo.source,
  };
}

function summarizeContracts(task, baseContext = {}) {
  const ids = Array.isArray(baseContext.contractIds) && baseContext.contractIds.length > 0
    ? [...new Set(baseContext.contractIds.filter(Boolean))]
    : [...new Set((task?.contractIds || []).filter(Boolean))];

  return {
    ids,
    primaryId: baseContext.primaryContractId || ids[0] || null,
  };
}

function fallbackTaxonomy(hookName) {
  return {
    family: HOOK_FAMILIES.TASK_TRANSITION,
    surface: HOOK_SURFACES.WORKSPACE,
    phase: HOOK_PHASES.EVENT,
    trigger: hookName,
  };
}

export async function buildHookExecutionContext(manager, hookName, baseContext = {}) {
  const taxonomy = HOOK_TAXONOMY[hookName] || fallbackTaxonomy(hookName);
  const modeInfo = await resolveWorkspaceMode(manager.storage);
  const workspaceInfo = await manager.storage.getWorkspaceInfo(manager.getTasks().length);
  const task = baseContext.task || (baseContext.taskId ? manager.getTask(baseContext.taskId) : null);

  return {
    schemaVersion: HOOK_CONTEXT_SCHEMA_VERSION,
    hook: {
      name: hookName,
      family: taxonomy.family,
      surface: taxonomy.surface,
      phase: taxonomy.phase,
      trigger: taxonomy.trigger,
    },
    workspace: summarizeWorkspace(workspaceInfo),
    mode: {
      current: modeInfo.mode,
      requested: modeInfo.requestedMode,
    },
    task: summarizeTask(task),
    contracts: summarizeContracts(task, baseContext),
    transition: summarizeTransition(baseContext.transitionEvent || null),
    event: {
      type: baseContext.eventType || taxonomy.trigger,
      source: baseContext.source || null,
      message: baseContext.message || null,
      level: baseContext.level || null,
    },
    data: baseContext.data || {},
  };
}
