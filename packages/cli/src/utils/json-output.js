import { omitEmptyFields } from './helpers.js';
import { resolveWorkspaceMode } from '../core/workspace-mode.js';

/**
 * JSON output utility for Seshflow commands
 * Provides structured output for AI consumption
 */

/**
 * Format task as JSON
 */
export function formatTaskJSON(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    tags: task.tags || [],
    estimatedHours: task.estimatedHours || 0,
    actualHours: task.actualHours || 0,
    assignee: task.assignee || null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    startedAt: task.startedAt || null,
    completedAt: task.completedAt || null,
    contractIds: task.contractIds || [],
    contractRole: task.contractRole || null,
    boundFiles: task.boundFiles || [],
  };
}

export function formatTaskSummaryJSON(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    tags: task.tags || [],
    estimatedHours: task.estimatedHours || 0,
    actualHours: task.actualHours || 0,
    assignee: task.assignee || null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    blockedBy: task.blockedBy || [],
    contractIds: task.contractIds || [],
    subtaskCount: task.subtasks?.length || 0,
    completedSubtasks: task.subtasks?.filter(st => st.completed).length || 0,
  };
}

export function formatTaskActionJSON(task) {
  return omitEmptyFields({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    contractIds: task.contractIds || [],
    contractRole: task.contractRole || null,
    boundFiles: task.boundFiles || [],
  });
}

export function formatRuntimeSummaryJSON(summary) {
  if (!summary || summary.recordCount <= 0) {
    return undefined;
  }

  return omitEmptyFields({
    recordCount: summary.recordCount,
    lastRecordedAt: summary.lastRecordedAt || null,
    lastCommand: summary.lastCommand || null,
    lastOutputRoot: summary.lastOutputRoot || null,
    lastArtifacts: summary.lastArtifacts || [],
    lastLogFile: summary.lastLogFile || null,
  });
}

export function formatProcessSummaryJSON(summary) {
  if (!summary || summary.recordCount <= 0) {
    return undefined;
  }

  return omitEmptyFields({
    recordCount: summary.recordCount,
    runningCount: summary.runningCount || 0,
    missingCount: summary.missingCount || 0,
    exitedCount: summary.exitedCount || 0,
    lastPid: summary.lastPid || null,
    lastCommand: summary.lastCommand || null,
    lastOutputRoot: summary.lastOutputRoot || null,
    lastCheckedAt: summary.lastCheckedAt || null,
  });
}

export function formatContextPriorityJSON(contextPriority) {
  if (!contextPriority || !Array.isArray(contextPriority.activeSections) || contextPriority.activeSections.length === 0) {
    return undefined;
  }

  return omitEmptyFields({
    strategy: contextPriority.strategy,
    primarySection: contextPriority.primarySection,
    activeSections: contextPriority.activeSections,
  });
}

export function formatContractReminderSummaryJSON(summary) {
  if (!summary || summary.total <= 0) {
    return undefined;
  }

  return omitEmptyFields({
    total: summary.total,
    errors: summary.errors,
    warnings: summary.warnings,
    aggregatedWarnings: summary.aggregatedWarnings || [],
  });
}

export function formatApiFirstContextJSON(context) {
  if (!context) {
    return {};
  }

  return omitEmptyFields({
    contextPriority: formatContextPriorityJSON(context.contextPriority),
    currentContract: context.currentContract || undefined,
    relatedContracts: context.relatedContracts || [],
    openContractQuestions: context.openContractQuestions || [],
    relatedTasks: context.relatedTasks || [],
    contractReminders: context.contractReminders || [],
    contractReminderSummary: formatContractReminderSummaryJSON(context.contractReminderSummary),
  });
}

function pickWorkspaceFields(info, fields) {
  return fields.reduce((result, field) => {
    if (info[field] !== undefined) {
      result[field] = info[field];
    }
    return result;
  }, {});
}

/**
 * Format workspace info as JSON
 */
export async function formatWorkspaceJSON(storage, taskCount = 0, options = {}) {
  const info = await storage.getWorkspaceInfo(taskCount);
  const modeInfo = await resolveWorkspaceMode(storage);
  const baseFields = ['path', 'name', 'gitBranch', 'totalTasks', 'source', 'sourcePath'];
  const fullFields = ['requestedPath', 'seshflowDir', 'tasksFile', 'configPath'];
  const modeFields = {
    mode: modeInfo.mode,
    requestedMode: modeInfo.requestedMode,
  };

  if (modeInfo.fallbackMode) {
    modeFields.fallbackMode = modeInfo.fallbackMode;
    modeFields.fallbackReason = modeInfo.fallbackReason;
  }

  if (options.full) {
    return {
      ...pickWorkspaceFields(info, [...baseFields, ...fullFields]),
      ...modeFields,
    };
  }

  if (options.compact) {
    return omitEmptyFields({
      path: info.path,
      name: info.name,
      gitBranch: info.gitBranch || undefined,
      totalTasks: info.totalTasks,
      source: info.source,
      sourcePath: info.source !== 'workspace-file' ? info.sourcePath : undefined,
      mode: modeInfo.mode,
      requestedMode: modeInfo.requestedMode !== modeInfo.mode ? modeInfo.requestedMode : undefined,
      fallbackMode: modeInfo.fallbackMode,
      fallbackReason: modeInfo.fallbackReason,
    });
  }

  return {
    ...pickWorkspaceFields(info, baseFields),
    ...modeFields,
  };
}

/**
 * Format success response as JSON
 */
export function formatSuccessResponse(data, workspace = null) {
  const response = {
    success: true,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (workspace) {
    response.workspace = workspace;
  }

  return response;
}

/**
 * Format error response as JSON
 */
export function formatErrorResponse(error, code = 'ERROR') {
  return {
    success: false,
    error: {
      code,
      message: error.message || String(error),
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Output JSON to stdout
 */
export function outputJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Check if JSON output is requested
 */
export function isJSONMode(options = {}, defaultMode = true) {
  if (options.pretty || options.compact) {
    return false;
  }

  if (options.json === false) {
    return false;
  }

  if (options.json === true || options.JSON === true) {
    return true;
  }

  const envMode = process.env.SESHFLOW_OUTPUT?.toLowerCase();
  if (envMode === 'pretty' || envMode === 'compact') {
    return false;
  }
  if (envMode === 'json') {
    return true;
  }

  return defaultMode;
}
