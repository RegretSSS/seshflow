function getTaskMap(tasks = []) {
  return new Map(tasks.map(task => [task.id, task]));
}

function getUnmetDependencies(task, taskMap) {
  return (task.dependencies || []).filter(dependencyId => {
    const dependency = taskMap.get(dependencyId);
    return dependency && dependency.status !== 'done';
  });
}

function getRecentRuns(task, limit) {
  return [...(task.runtime?.runs || [])]
    .sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0))
    .slice(0, limit);
}

function getRecentProcesses(task, limit) {
  return [...(task.runtime?.processes || [])]
    .sort((a, b) => new Date(b.launchedAt || 0) - new Date(a.launchedAt || 0))
    .slice(0, limit);
}

function getTaskRuntimeEvents(runtimeEvents, taskId, limit) {
  return runtimeEvents
    .filter(event => event.taskId === taskId)
    .slice(-limit)
    .reverse();
}

export function buildWorkspaceSnapshot(data, options = {}) {
  const recentItemLimit = options.recentItemLimit ?? 5;
  const runtimeEventLimit = options.runtimeEventLimit ?? 8;
  const transitionLimit = options.transitionLimit ?? 8;
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const runtimeEvents = Array.isArray(data?.runtimeEvents) ? data.runtimeEvents : [];
  const transitions = Array.isArray(data?.transitions) ? data.transitions : [];
  const taskMap = getTaskMap(tasks);
  const currentTaskId = data?.currentSession?.taskId || null;

  const enrichedTasks = tasks.map(task => {
    const runs = task.runtime?.runs || [];
    const processes = task.runtime?.processes || [];
    const taskRuntimeEvents = getTaskRuntimeEvents(runtimeEvents, task.id, recentItemLimit);
    const lastRun = getRecentRuns(task, 1)[0] || null;
    const lastProcess = getRecentProcesses(task, 1)[0] || null;
    const lastRuntimeEvent = taskRuntimeEvents[0] || null;

    return {
      ...task,
      unmetDependencies: getUnmetDependencies(task, taskMap),
      runtimeSummary: {
        recordCount: runs.length,
        lastRecordedAt: task.runtime?.lastRecordedAt || null,
        lastCommand: lastRun?.command || null,
        lastOutputRoot: lastRun?.outputRoot || null,
        lastArtifacts: lastRun?.artifacts || [],
        lastLogFile: lastRun?.logFile || null,
      },
      processSummary: {
        recordCount: processes.length,
        runningCount: processes.filter(process => process.state === 'running').length,
        missingCount: processes.filter(process => process.state === 'missing').length,
        exitedCount: processes.filter(process => process.state === 'exited').length,
        lastPid: lastProcess?.pid || null,
        lastCommand: lastProcess?.command || null,
        lastOutputRoot: lastProcess?.outputRoot || null,
        lastCheckedAt: lastProcess?.lastCheckedAt || null,
      },
      runtimeEventSummary: {
        recordCount: runtimeEvents.filter(event => event.taskId === task.id).length,
        warningCount: runtimeEvents.filter(event => event.taskId === task.id && event.level === 'warn').length,
        errorCount: runtimeEvents.filter(event => event.taskId === task.id && event.level === 'error').length,
        lastEventType: lastRuntimeEvent?.type || null,
        lastOccurredAt: lastRuntimeEvent?.occurredAt || null,
      },
      recentRuns: getRecentRuns(task, recentItemLimit),
      recentProcesses: getRecentProcesses(task, recentItemLimit),
      recentRuntimeEvents: taskRuntimeEvents,
    };
  });

  return {
    workspace: data?.workspace || null,
    columns: data?.columns || [],
    tasks: enrichedTasks,
    currentTask: enrichedTasks.find(task => task.id === currentTaskId) || null,
    runtimeEvents: runtimeEvents.slice(-runtimeEventLimit),
    transitions: transitions.slice(-transitionLimit),
    focus: currentTaskId ? 'current-task' : 'next-ready-task',
  };
}
