import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { PATHS, DEFAULT_TASK_FILE } from '../constants.js';
import { existsSync } from 'fs';
import simpleGit from 'simple-git';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  workspace: {
    name: 'seshflow-workspace',
    type: 'linux',
    path: process.cwd()
  },
  network: {
    port: 5423,
    webPort: 5424,
    discovery: {
      enabled: true,
      methods: ['broadcast', 'file']
    },
    peers: []
  },
  sync: {
    autoSync: true,
    interval: 3000,
    strategy: 'last-write-wins'
  },
  git: {
    autoHook: true,
    commitTemplate: 'feat({taskId}): {message}'
  },
  ui: {
    defaultView: 'board',
    columns: ['backlog', 'todo', 'in-progress', 'review', 'done', 'blocked']
  }
};

/**
 * Storage class for managing seshflow data files
 */
export class Storage {
  constructor(workspacePath = process.cwd()) {
    this.workspacePath = workspacePath;
    this.seshflowDir = path.join(workspacePath, PATHS.SEHSFLOW_DIR);
    this.tasksFile = path.join(workspacePath, PATHS.TASKS_FILE);
    this.configFile = path.join(workspacePath, PATHS.CONFIG_FILE);
  }

  /**
   * Initialize seshflow directory structure
   */
  async init() {
    try {
      await fs.ensureDir(this.seshflowDir);
      await fs.ensureDir(path.join(this.seshflowDir, 'sessions'));

      // Create default tasks file if it doesn't exist
      if (!(await this.exists(this.tasksFile))) {
        await this.writeTasksFile(DEFAULT_TASK_FILE);
      }

      // Create default config if it doesn't exist
      if (!(await this.exists(this.configFile))) {
        await this.writeConfigFile(DEFAULT_CONFIG);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error.message}`);
    }
  }

  /**
   * Check if seshflow is initialized
   */
  isInitialized() {
    return existsSync(this.tasksFile);
  }

  /**
   * Check if file exists
   */
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read tasks file
   */
  async readTasksFile() {
    try {
      const content = await fs.readFile(this.tasksFile, 'utf-8');
      return this.normalizeTaskFile(JSON.parse(content));
    } catch (error) {
      throw new Error(`Failed to read tasks file: ${error.message}`);
    }
  }

  /**
   * Write tasks file
   */
  async writeTasksFile(data) {
    try {
      const normalized = this.normalizeTaskFile(data);

      // Update metadata timestamp
      if (normalized.metadata) {
        normalized.metadata.updatedAt = new Date().toISOString();
      }

      // Update statistics
      if (normalized.tasks) {
        normalized.statistics = this.calculateStatistics(normalized.tasks);
      }

      await fs.writeFile(this.tasksFile, JSON.stringify(normalized, null, 2), 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write tasks file: ${error.message}`);
    }
  }

  /**
   * Read config file
   */
  async readConfigFile() {
    try {
      const content = await fs.readFile(this.configFile, 'utf-8');
      return yaml.parse(content);
    } catch (error) {
      throw new Error(`Failed to read config file: ${error.message}`);
    }
  }

  /**
   * Write config file
   */
  async writeConfigFile(config) {
    try {
      const content = yaml.stringify(config);
      await fs.writeFile(this.configFile, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write config file: ${error.message}`);
    }
  }

  /**
   * Calculate task statistics
   */
  calculateStatistics(tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const actualSpentHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    return {
      totalTasks,
      completedTasks,
      totalEstimatedHours,
      actualSpentHours
    };
  }

  /**
   * Backup tasks file
   */
  async backup() {
    try {
      const backupFile = path.join(
        this.seshflowDir,
        'backups',
        `tasks_${Date.now()}.json`
      );
      await fs.ensureDir(path.dirname(backupFile));
      await fs.copy(this.tasksFile, backupFile);
      return backupFile;
    } catch (error) {
      throw new Error(`Failed to backup tasks file: ${error.message}`);
    }
  }

  /**
   * Clean old backups
   */
  async cleanBackups(keep = 10) {
    try {
      const backupDir = path.join(this.seshflowDir, 'backups');
      if (!(await this.exists(backupDir))) return;

      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(f => f.startsWith('tasks_') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          time: parseInt(f.match(/tasks_(\d+)\.json/)[1])
        }))
        .sort((a, b) => b.time - a.time);

      // Remove old backups
      for (let i = keep; i < backups.length; i++) {
        await fs.remove(backups[i].path);
      }

      return backups.slice(0, keep).length;
    } catch (error) {
      throw new Error(`Failed to clean backups: ${error.message}`);
    }
  }

  /**
   * Get workspace path
   */
  getWorkspacePath() {
    return this.workspacePath;
  }

  /**
   * Get seshflow directory path
   */
  getSeshflowDir() {
    return this.seshflowDir;
  }

  normalizeTaskFile(data = {}) {
    const normalized = {
      ...DEFAULT_TASK_FILE,
      ...data,
      workspace: {
        ...DEFAULT_TASK_FILE.workspace,
        ...(data.workspace || {})
      },
      metadata: {
        ...DEFAULT_TASK_FILE.metadata,
        ...(data.metadata || {})
      },
      statistics: {
        ...DEFAULT_TASK_FILE.statistics,
        ...(data.statistics || {})
      }
    };

    normalized.columns = this.normalizeColumns(data.columns);
    normalized.workspace.path = normalized.workspace.path || this.getWorkspacePath();
    normalized.workspace.name = normalized.workspace.name || path.basename(normalized.workspace.path) || '';
    normalized.workspace.gitBranch = normalized.workspace.gitBranch || '';
    normalized.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    normalized.currentSession = data.currentSession || null;

    return normalized;
  }

  normalizeColumns(columns) {
    const defaultsById = new Map(DEFAULT_TASK_FILE.columns.map(column => [column.id, column]));

    if (!Array.isArray(columns) || columns.length === 0) {
      return DEFAULT_TASK_FILE.columns.map(column => ({ ...column }));
    }

    const normalized = columns
      .map(column => {
        const fallback = defaultsById.get(column?.id);
        if (!fallback) {
          return null;
        }

        return {
          ...fallback,
          ...(column || {}),
          name: fallback.name
        };
      })
      .filter(Boolean);

    const presentIds = new Set(normalized.map(column => column.id));
    for (const column of DEFAULT_TASK_FILE.columns) {
      if (!presentIds.has(column.id)) {
        normalized.push({ ...column });
      }
    }

    return normalized;
  }

  /**
   * Get current git branch
   */
  async getGitBranch() {
    try {
      const git = simpleGit();
      const branch = await git.branch();
      return branch.current || '';
    } catch (error) {
      return '';
    }
  }
}
