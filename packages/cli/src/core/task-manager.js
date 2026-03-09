import { Storage } from './storage.js';
import {
  generateTaskId,
  generateSubtaskId,
  generateSessionId,
  generateRuntimeRecordId,
  generateProcessRecordId,
  generateTransitionEventId,
  toISOString,
  isValidPriority,
  isValidTaskId,
  sanitizeBranchName
} from '../utils/helpers.js';

/**
 * TaskManager - Core task management logic
 */
export class TaskManager {
  constructor(workspacePath = process.cwd(), options = {}) {
    this.storage = new Storage(workspacePath, options);
    this.data = null;
  }

  /**
   * Initialize task manager
   */
  async init() {
    await this.storage.init();
    await this.loadData();
    await this.syncWorkspaceInfo();
    return this;
  }

  /**
   * Load task data from storage
   */
  async loadData() {
    this.data = await this.storage.readTasksFile();
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return this.data;
  }

  /**
   * Save task data to storage
   */
  async saveData() {
    await this.syncWorkspaceInfo();
    await this.storage.writeTasksFile(this.data);
    return this;
  }

  /**
   * Get all tasks
   */
  getTasks() {
    return this.data?.tasks || [];
  }

  getTransitionEvents(limit = null) {
    const events = this.data?.transitions || [];
    if (!limit) {
      return events;
    }
    return events.slice(-limit);
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.data?.tasks.find(t => t.id === taskId);
  }

  /**
   * Create a new task
   */
  createTask(options) {
    const requestedId = options.id ? String(options.id).trim() : '';
    const taskId = requestedId || generateTaskId();

    if (requestedId && !isValidTaskId(requestedId)) {
      throw new Error(`Invalid task id: ${requestedId}`);
    }

    if (this.getTask(taskId)) {
      throw new Error(`Task id already exists: ${taskId}`);
    }

    const task = {
      id: taskId,
      title: options.title || 'Untitled Task',
      description: options.description || '',
      status: options.status || 'backlog',
      priority: isValidPriority(options.priority) ? options.priority : 'P2',
      dependencies: options.dependencies || [],
      blockedBy: [],
      subtasks: [],
      createdAt: toISOString(),
      updatedAt: toISOString(),
      startedAt: null,
      completedAt: null,
      estimatedHours: parseFloat(options.estimatedHours) || 0,
      actualHours: 0,
      assignee: options.assignee || null,
      tags: options.tags || [],
      gitBranch: options.branch || sanitizeBranchName(options.title),
      gitCommits: [],
      sessions: [],
      context: {
        relatedFiles: options.relatedFiles || [],
        commands: options.commands || [],
        links: options.links || []
      },
      runtime: {
        runs: [],
        processes: [],
        lastRecordedAt: null
      }
    };

    this.data.tasks.push(task);
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return task;
  }

  /**
   * Update an existing task
   */
  updateTask(taskId, updates) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Apply updates
    Object.assign(task, updates);
    task.updatedAt = toISOString();

    // Auto-set timestamps based on status
    if (updates.status === 'in-progress' && !task.startedAt) {
      task.startedAt = toISOString();
    }
    if (updates.status === 'done' && !task.completedAt) {
      task.completedAt = toISOString();
    }

    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return task;
  }

  /**
   * Delete a task
   */
  deleteTask(taskId) {
    const index = this.data.tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Remove from other tasks' dependencies
    this.data.tasks.forEach(task => {
      task.dependencies = task.dependencies.filter(id => id !== taskId);
    });

    this.data.tasks.splice(index, 1);
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return true;
  }

  /**
   * Get the next task to work on
   */
  getNextTask(filters = {}) {
    const tasks = this.getTasks();

    // Filter by status (ready to work on)
    let candidates = tasks.filter(
      t => t.status === 'todo' || t.status === 'backlog'
    );

    // Filter by priority if specified
    if (filters.priority) {
      const priorityWeight = { P0: 0, P1: 1, P2: 2, P3: 3 };
      const minWeight = priorityWeight[filters.priority] ?? 3;
      candidates = candidates.filter(
        t => priorityWeight[t.priority] <= minWeight
      );
    }

    // Filter by tag if specified
    if (filters.tag) {
      candidates = candidates.filter(t => t.tags.includes(filters.tag));
    }

    // Filter by assignee if specified
    if (filters.assignee) {
      candidates = candidates.filter(t => t.assignee === filters.assignee);
    }

    // Filter out tasks with unmet dependencies
    candidates = candidates.filter(t => {
      const unmetDeps = this.getUnmetDependencies(t);
      return unmetDeps.length === 0;
    });

    // Sort by priority, then by creation date
    const priorityWeight = { P0: 0, P1: 1, P2: 2, P3: 3 };
    candidates.sort((a, b) => {
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return candidates[0] || null;
  }

  /**
   * Get current active session task
   */
  getCurrentTask() {
    if (!this.data?.currentSession) return null;
    return this.getTask(this.data.currentSession.taskId);
  }

  /**
   * Start a work session
   */
  startSession(taskId) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Create session
    const session = {
      id: generateSessionId(),
      startedAt: toISOString(),
      endedAt: null,
      note: '',
      runtimeEntries: []
    };

    task.sessions.push(session);
    task.status = 'in-progress';
    task.startedAt = task.startedAt || toISOString();
    task.updatedAt = toISOString();

    // Set as current session
    this.data.currentSession = {
      taskId,
      startedAt: toISOString()
    };

    this.data.metadata.lastSession = toISOString();
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return task;
  }

  /**
   * End current session
   */
  async endSession(note = '') {
    if (!this.data?.currentSession) {
      throw new Error('No active session');
    }

    const task = this.getTask(this.data.currentSession.taskId);
    if (!task) {
      throw new Error(`Task not found: ${this.data.currentSession.taskId}`);
    }

    // Update the last session
    const lastSession = task.sessions[task.sessions.length - 1];
    if (lastSession && !lastSession.endedAt) {
      lastSession.endedAt = toISOString();
      lastSession.note = note;
    }

    // Clear current session
    this.data.currentSession = null;
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return task;
  }

  async suspendCurrentTask(reason = 'Suspended') {
    if (!this.data?.currentSession) {
      throw new Error('No active session');
    }

    const task = this.getTask(this.data.currentSession.taskId);
    if (!task) {
      throw new Error(`Task not found: ${this.data.currentSession.taskId}`);
    }

    await this.endSession(reason);
    task.status = 'todo';
    task.updatedAt = toISOString();
    task.suspendedAt = toISOString();
    task.suspendedReason = reason;
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return task;
  }

  /**
   * Complete a task
   */
  async completeTask(taskId, options = {}) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Update task
    task.status = 'done';
    task.completedAt = toISOString();
    task.actualHours = options.hours ? parseFloat(options.hours) : (parseFloat(task.actualHours) || 0);
    task.updatedAt = toISOString();

    // End session if active
    if (this.data?.currentSession?.taskId === taskId) {
      await this.endSession(options.note || '');
    }

    // Add completion note to session if provided
    if (options.note) {
      const lastSession = task.sessions[task.sessions.length - 1];
      if (lastSession) {
        lastSession.note = options.note;
      }
    }

    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return task;
  }

  /**
   * Record runtime context for a task
   */
  recordRuntime(taskId, details = {}) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const entry = this.normalizeRuntimeEntry({
      id: generateRuntimeRecordId(),
      command: details.command || '',
      cwd: details.cwd || this.storage.getWorkspacePath(),
      logFile: details.logFile || null,
      outputRoot: details.outputRoot || null,
      artifacts: Array.isArray(details.artifacts) ? details.artifacts : [],
      note: details.note || '',
      recordedAt: toISOString(),
      sessionId: null,
    });

    task.runtime.runs.push(entry);
    task.runtime.lastRecordedAt = entry.recordedAt;
    task.updatedAt = entry.recordedAt;

    const activeSession = this.getActiveSessionForTask(taskId);
    if (activeSession) {
      entry.sessionId = activeSession.id;
      activeSession.runtimeEntries.push(entry);
    }

    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return entry;
  }

  registerProcess(taskId, details = {}) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const pid = Number.parseInt(details.pid, 10);
    if (!Number.isInteger(pid) || pid <= 0) {
      throw new Error(`Invalid pid: ${details.pid}`);
    }

    const now = toISOString();
    const state = this.detectProcessState(pid, details.state);
    const existing = task.runtime.processes.find(entry => entry.pid === pid && entry.state !== 'exited');

    if (existing) {
      existing.command = details.command || existing.command;
      existing.cwd = details.cwd || existing.cwd;
      existing.outputRoot = details.outputRoot || existing.outputRoot;
      existing.note = details.note || existing.note;
      existing.state = state;
      existing.lastCheckedAt = now;
      task.updatedAt = now;
      this.refreshDerivedState();
      this.updateWorkspaceInfo();
      return existing;
    }

    const entry = this.normalizeProcessEntry({
      id: generateProcessRecordId(),
      pid,
      command: details.command || '',
      cwd: details.cwd || this.storage.getWorkspacePath(),
      outputRoot: details.outputRoot || null,
      note: details.note || '',
      state,
      launchedAt: details.launchedAt || now,
      lastCheckedAt: now,
    });

    task.runtime.processes.push(entry);
    task.updatedAt = now;
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return entry;
  }

  refreshProcessStates(taskId) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const now = toISOString();
    task.runtime.processes = task.runtime.processes.map(entry => {
      if (entry.state === 'exited') {
        return {
          ...entry,
          lastCheckedAt: now,
        };
      }

      const alive = this.isProcessAlive(entry.pid);
      return {
        ...entry,
        state: alive ? 'running' : 'missing',
        lastCheckedAt: now,
      };
    });

    task.updatedAt = now;
    this.refreshDerivedState();
    this.updateWorkspaceInfo();
    return task.runtime.processes;
  }

  getRecentProcessEntries(task, limit = 5) {
    if (!task?.runtime?.processes?.length) {
      return [];
    }

    return [...task.runtime.processes]
      .sort((a, b) => new Date(b.launchedAt) - new Date(a.launchedAt))
      .slice(0, limit);
  }

  getProcessSummary(task) {
    const entries = task?.runtime?.processes || [];
    const [lastEntry] = this.getRecentProcessEntries(task, 1);

    return {
      recordCount: entries.length,
      runningCount: entries.filter(entry => entry.state === 'running').length,
      missingCount: entries.filter(entry => entry.state === 'missing').length,
      exitedCount: entries.filter(entry => entry.state === 'exited').length,
      lastPid: lastEntry?.pid || null,
      lastCommand: lastEntry?.command || null,
      lastOutputRoot: lastEntry?.outputRoot || null,
      lastCheckedAt: lastEntry?.lastCheckedAt || null,
    };
  }

  /**
   * Add a git commit to a task
   */
  addGitCommit(taskId, commit) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.gitCommits.push({
      hash: commit.hash,
      message: commit.message,
      author: commit.author,
      timestamp: commit.timestamp || toISOString(),
      taskId
    });

    task.updatedAt = toISOString();
    this.updateWorkspaceInfo();
    return task;
  }

  /**
   * Add a subtask
   */
  addSubtask(taskId, title) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const subtask = {
      id: generateSubtaskId(),
      title,
      completed: false,
      completedAt: null
    };

    task.subtasks.push(subtask);
    task.updatedAt = toISOString();
    this.updateWorkspaceInfo();
    return subtask;
  }

  /**
   * Toggle subtask completion
   */
  toggleSubtask(taskId, subtaskId) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) {
      throw new Error(`Subtask not found: ${subtaskId}`);
    }

    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? toISOString() : null;
    task.updatedAt = toISOString();
    this.updateWorkspaceInfo();
    return subtask;
  }

  /**
   * Get unmet dependencies for a task
   */
  getUnmetDependencies(task) {
    return task.dependencies
      .map(depId => this.getTask(depId))
      .filter(dep => dep && dep.status !== 'done');
  }

  /**
   * Get current blockers for a task
   */
  getBlockedBy(task) {
    return this.getUnmetDependencies(task).map(dep => dep.id);
  }

  hasDependencyPath(fromTaskId, targetTaskId, visited = new Set()) {
    if (fromTaskId === targetTaskId) {
      return true;
    }

    if (visited.has(fromTaskId)) {
      return false;
    }
    visited.add(fromTaskId);

    const fromTask = this.getTask(fromTaskId);
    if (!fromTask?.dependencies?.length) {
      return false;
    }

    return fromTask.dependencies.some(depId => this.hasDependencyPath(depId, targetTaskId, visited));
  }

  validateDependencyMutation(taskId, dependencyId) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const dependencyTask = this.getTask(dependencyId);
    if (!dependencyTask) {
      throw new Error(`Dependency task not found: ${dependencyId}`);
    }

    if (taskId === dependencyId) {
      throw new Error(`Task cannot depend on itself: ${taskId}`);
    }

    if (this.hasDependencyPath(dependencyId, taskId)) {
      throw new Error(`Dependency cycle detected: ${taskId} -> ${dependencyId}`);
    }

    return { task, dependencyTask };
  }

  addDependency(taskId, dependencyId) {
    const { task, dependencyTask } = this.validateDependencyMutation(taskId, dependencyId);

    if (task.dependencies.includes(dependencyId)) {
      return {
        task,
        dependencyTask,
        added: false,
      };
    }

    task.dependencies = [...task.dependencies, dependencyId];
    task.updatedAt = toISOString();
    this.refreshDerivedState();
    this.updateWorkspaceInfo();

    return {
      task,
      dependencyTask,
      added: true,
    };
  }

  removeDependency(taskId, dependencyId) {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const beforeCount = task.dependencies.length;
    task.dependencies = task.dependencies.filter(depId => depId !== dependencyId);
    const removed = task.dependencies.length !== beforeCount;

    if (removed) {
      task.updatedAt = toISOString();
      this.refreshDerivedState();
      this.updateWorkspaceInfo();
    }

    return {
      task,
      dependencyTask: this.getTask(dependencyId) || null,
      removed,
    };
  }

  getActiveSessionForTask(taskId) {
    if (this.data?.currentSession?.taskId !== taskId) {
      return null;
    }

    const task = this.getTask(taskId);
    if (!task?.sessions?.length) {
      return null;
    }

    const lastSession = task.sessions[task.sessions.length - 1];
    if (!lastSession || lastSession.endedAt) {
      return null;
    }

    return lastSession;
  }

  getRecentRuntimeEntries(task, limit = 3) {
    if (!task?.runtime?.runs?.length) {
      return [];
    }

    return [...task.runtime.runs]
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      .slice(0, limit);
  }

  getRuntimeSummary(task) {
    const [lastEntry] = this.getRecentRuntimeEntries(task, 1);

    return {
      recordCount: task?.runtime?.runs?.length || 0,
      lastRecordedAt: task?.runtime?.lastRecordedAt || null,
      lastCommand: lastEntry?.command || null,
      lastOutputRoot: lastEntry?.outputRoot || null,
      lastArtifacts: lastEntry?.artifacts || [],
      lastLogFile: lastEntry?.logFile || null,
    };
  }

  /**
   * Refresh derived fields that should never become stale on disk
   */
  refreshDerivedState() {
    if (!Array.isArray(this.data?.tasks)) {
      return;
    }

    this.data.transitions = Array.isArray(this.data.transitions)
      ? this.data.transitions.map(event => this.normalizeTransitionEvent(event))
      : [];

    this.data.tasks.forEach(task => {
      this.normalizeTask(task);
      task.blockedBy = this.getBlockedBy(task);
    });
  }

  normalizeTask(task) {
    task.dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
    task.subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    task.tags = Array.isArray(task.tags) ? task.tags : [];
    task.sessions = Array.isArray(task.sessions) ? task.sessions : [];
    task.context = {
      relatedFiles: Array.isArray(task.context?.relatedFiles) ? task.context.relatedFiles : [],
      commands: Array.isArray(task.context?.commands) ? task.context.commands : [],
      links: Array.isArray(task.context?.links) ? task.context.links : []
    };
    task.runtime = {
      runs: Array.isArray(task.runtime?.runs) ? task.runtime.runs.map(entry => this.normalizeRuntimeEntry(entry)) : [],
      processes: Array.isArray(task.runtime?.processes) ? task.runtime.processes.map(entry => this.normalizeProcessEntry(entry)) : [],
      lastRecordedAt: task.runtime?.lastRecordedAt || null
    };
    task.sessions = task.sessions.map(session => this.normalizeSession(session));

    if (!task.runtime.lastRecordedAt && task.runtime.runs.length > 0) {
      const lastEntry = task.runtime.runs[task.runtime.runs.length - 1];
      task.runtime.lastRecordedAt = lastEntry.recordedAt;
    }

    return task;
  }

  normalizeSession(session) {
    return {
      ...session,
      runtimeEntries: Array.isArray(session?.runtimeEntries)
        ? session.runtimeEntries.map(entry => this.normalizeRuntimeEntry(entry))
        : []
    };
  }

  normalizeRuntimeEntry(entry = {}) {
    return {
      id: entry.id || generateRuntimeRecordId(),
      command: entry.command || '',
      cwd: entry.cwd || this.storage.getWorkspacePath(),
      logFile: entry.logFile || null,
      outputRoot: entry.outputRoot || null,
      artifacts: Array.isArray(entry.artifacts) ? entry.artifacts : [],
      note: entry.note || '',
      recordedAt: entry.recordedAt || toISOString(),
      sessionId: entry.sessionId || null,
    };
  }

  appendTransitionEvent(event = {}) {
    const normalizedEvent = this.normalizeTransitionEvent(event);
    this.data.transitions = Array.isArray(this.data.transitions) ? this.data.transitions : [];
    this.data.transitions.push(normalizedEvent);
    this.data.metadata.updatedAt = toISOString();
    return normalizedEvent;
  }

  normalizeTransitionEvent(event = {}) {
    return {
      id: event.id || generateTransitionEventId(),
      schemaVersion: Number.isInteger(event.schemaVersion) ? event.schemaVersion : 1,
      type: event.type || 'task.transition',
      taskId: event.taskId || null,
      statusFrom: event.statusFrom || null,
      statusTo: event.statusTo || null,
      changed: typeof event.changed === 'boolean' ? event.changed : true,
      context: event.context && typeof event.context === 'object' ? event.context : {},
      occurredAt: event.occurredAt || toISOString(),
    };
  }

  normalizeProcessEntry(entry = {}) {
    return {
      id: entry.id || generateProcessRecordId(),
      pid: Number.parseInt(entry.pid, 10),
      command: entry.command || '',
      cwd: entry.cwd || this.storage.getWorkspacePath(),
      outputRoot: entry.outputRoot || null,
      note: entry.note || '',
      state: entry.state || this.detectProcessState(entry.pid),
      launchedAt: entry.launchedAt || toISOString(),
      lastCheckedAt: entry.lastCheckedAt || null,
    };
  }

  detectProcessState(pid, preferredState = null) {
    if (preferredState === 'exited') {
      return 'exited';
    }

    if (!Number.isInteger(Number.parseInt(pid, 10)) || Number.parseInt(pid, 10) <= 0) {
      return 'unknown';
    }

    return this.isProcessAlive(pid) ? 'running' : (preferredState || 'missing');
  }

  isProcessAlive(pid) {
    const parsedPid = Number.parseInt(pid, 10);
    if (!Number.isInteger(parsedPid) || parsedPid <= 0) {
      return false;
    }

    try {
      process.kill(parsedPid, 0);
      return true;
    } catch (error) {
      if (error.code === 'EPERM') {
        return true;
      }
      return false;
    }
  }

  /**
   * Get task tree (dependencies)
   */
  getTaskTree(taskId = null, depth = 0, visited = new Set()) {
    if (taskId && visited.has(taskId)) {
      return null; // Circular dependency
    }

    const task = taskId ? this.getTask(taskId) : null;
    if (taskId && !task) return null;

    visited.add(taskId);

    const result = task
      ? {
          ...task,
          children: []
        }
      : {
          id: 'root',
          title: 'All Tasks',
          children: []
        };

    // Get tasks that depend on this task
    const dependents = taskId
      ? this.data.tasks.filter(t => t.dependencies.includes(taskId))
      : this.data.tasks.filter(t => t.dependencies.length === 0);

    result.children = dependents
      .map(t => this.getTaskTree(t.id, depth + 1, new Set(visited)))
      .filter(t => t !== null);

    return result;
  }

  /**
   * Validate task dependencies
   */
  validateDependencies(dependencies) {
    return dependencies.filter(id => !this.getTask(id));
  }

  /**
   * Update workspace information
   */
  updateWorkspaceInfo() {
    if (this.data.workspace) {
      Object.assign(this.data.workspace, this.storage.getWorkspaceRecordSync(this.getTasks().length));
    }
  }

  async syncWorkspaceInfo() {
    this.updateWorkspaceInfo();
    if (this.data.workspace) {
      this.data.workspace.gitBranch = await this.storage.getGitBranch();
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.data?.statistics || {};
  }
}
