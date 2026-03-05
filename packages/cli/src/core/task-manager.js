import { Storage } from './storage.js';
import {
  generateTaskId,
  generateSubtaskId,
  generateSessionId,
  toISOString,
  isValidPriority,
  isValidStatus,
  sanitizeBranchName
} from '../utils/helpers.js';

/**
 * TaskManager - Core task management logic
 */
export class TaskManager {
  constructor(workspacePath = process.cwd()) {
    this.storage = new Storage(workspacePath);
    this.data = null;
  }

  /**
   * Initialize task manager
   */
  async init() {
    await this.storage.init();
    await this.loadData();
    return this;
  }

  /**
   * Load task data from storage
   */
  async loadData() {
    this.data = await this.storage.readTasksFile();
    return this.data;
  }

  /**
   * Save task data to storage
   */
  async saveData() {
    await this.storage.writeTasksFile(this.data);
    return this;
  }

  /**
   * Get all tasks
   */
  getTasks() {
    return this.data?.tasks || [];
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
    const task = {
      id: generateTaskId(),
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
      estimatedHours: options.estimatedHours || 0,
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
      }
    };

    // Update blockedBy based on dependencies
    task.blockedBy = this.calculateBlockedBy(task.dependencies);

    this.data.tasks.push(task);
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

    // Update blockedBy if dependencies changed
    if (updates.dependencies !== undefined) {
      task.blockedBy = this.calculateBlockedBy(updates.dependencies);
    }

    // Auto-set timestamps based on status
    if (updates.status === 'in-progress' && !task.startedAt) {
      task.startedAt = toISOString();
    }
    if (updates.status === 'done' && !task.completedAt) {
      task.completedAt = toISOString();
    }

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
      task.blockedBy = task.blockedBy.filter(id => id !== taskId);
    });

    this.data.tasks.splice(index, 1);
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
      note: ''
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
    task.actualHours = options.hours || task.actualHours;
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

    this.updateWorkspaceInfo();
    return task;
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
   * Calculate which tasks are blocking this task
   */
  calculateBlockedBy(dependencies) {
    return dependencies.filter(depId => {
      const dep = this.getTask(depId);
      return dep && dep.status !== 'done';
    });
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
      this.data.workspace.path = process.cwd();
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.data?.statistics || {};
  }
}
