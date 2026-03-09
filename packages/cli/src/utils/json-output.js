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
  };
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
  const baseFields = ['path', 'name', 'gitBranch', 'totalTasks', 'source', 'sourcePath'];
  const fullFields = ['requestedPath', 'seshflowDir', 'tasksFile', 'configPath'];

  if (options.full) {
    return pickWorkspaceFields(info, [...baseFields, ...fullFields]);
  }

  return pickWorkspaceFields(info, baseFields);
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
export function isJSONMode(options) {
  return options && (options.json === true || options.JSON === true);
}
