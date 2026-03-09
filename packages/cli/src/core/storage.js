import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PATHS, DEFAULT_TASK_FILE } from '../constants.js';
import { existsSync } from 'fs';
import { ANNOUNCEMENT_KINDS, ANNOUNCEMENT_ACTIONS } from '../../../shared/constants/announcements.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  mode: 'default',
  workspace: {
    name: 'seshflow-workspace',
    type: 'linux',
    path: process.cwd()
  },
  contracts: {
    dir: PATHS.CONTRACTS_DIR
  },
  planning: {
    plansDir: PATHS.PLANS_DIR,
    defaultPlan: '.seshflow/plans/api-planning.md'
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
  hooks: {
    before_start: [],
    after_start: [],
    before_done: [],
    after_done: []
  },
  announcements: {
    [ANNOUNCEMENT_KINDS.START]: [
      {
        id: 'announce_start_log',
        action: ANNOUNCEMENT_ACTIONS.LOG,
        template: 'Started {taskId} {title}',
      }
    ],
    [ANNOUNCEMENT_KINDS.PROGRESS]: [
      {
        id: 'announce_progress_log',
        action: ANNOUNCEMENT_ACTIONS.LOG,
        template: 'Progress {percent}% on {taskId} {title}',
      }
    ],
    [ANNOUNCEMENT_KINDS.DONE]: [
      {
        id: 'announce_done_log',
        action: ANNOUNCEMENT_ACTIONS.LOG,
        template: 'Completed {taskId} {title}',
      }
    ]
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
  static findUpward(startPath, predicate) {
    let currentPath = path.resolve(startPath);
    let keepSearching = true;

    while (keepSearching) {
      if (predicate(currentPath)) {
        return currentPath;
      }

      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        keepSearching = false;
      } else {
        currentPath = parentPath;
      }
    }

    return null;
  }

  static resolveWorkspace(startPath = process.cwd(), options = {}) {
    const fromPath = path.resolve(startPath);

    if (options.ignoreExistingWorkspace) {
      if (options.preferGitRoot) {
        const gitRoot = Storage.findUpward(fromPath, candidate => existsSync(path.join(candidate, '.git')));
        if (gitRoot) {
          return {
            path: gitRoot,
            source: 'git-root',
            sourcePath: path.join(gitRoot, '.git'),
            requestedPath: fromPath
          };
        }
      }

      return {
        path: fromPath,
        source: 'cwd',
        sourcePath: fromPath,
        requestedPath: fromPath
      };
    }

    const existingWorkspaceRoot = Storage.findUpward(fromPath, candidate => {
      const tasksFile = path.join(candidate, PATHS.TASKS_FILE);
      const configFile = path.join(candidate, PATHS.CONFIG_FILE);
      return existsSync(tasksFile) || existsSync(configFile);
    });

    if (existingWorkspaceRoot) {
      return {
        path: existingWorkspaceRoot,
        source: 'workspace-file',
        sourcePath: existsSync(path.join(existingWorkspaceRoot, PATHS.TASKS_FILE))
          ? path.join(existingWorkspaceRoot, PATHS.TASKS_FILE)
          : path.join(existingWorkspaceRoot, PATHS.CONFIG_FILE),
        requestedPath: fromPath
      };
    }

    if (options.preferGitRoot) {
      const gitRoot = Storage.findUpward(fromPath, candidate => existsSync(path.join(candidate, '.git')));
      if (gitRoot) {
        return {
          path: gitRoot,
          source: 'git-root',
          sourcePath: path.join(gitRoot, '.git'),
          requestedPath: fromPath
        };
      }
    }

    return {
      path: fromPath,
      source: 'cwd',
      sourcePath: fromPath,
      requestedPath: fromPath
    };
  }

  constructor(workspacePath = process.cwd(), options = {}) {
    this.workspaceResolution = Storage.resolveWorkspace(workspacePath, options);
    this.workspacePath = this.workspaceResolution.path;
    this.requestedWorkspacePath = this.workspaceResolution.requestedPath;
    this.seshflowDir = path.join(this.workspacePath, PATHS.SEHSFLOW_DIR);
    this.tasksFile = path.join(this.workspacePath, PATHS.TASKS_FILE);
    this.configFile = path.join(this.workspacePath, PATHS.CONFIG_FILE);
    this.uiStateFile = path.join(this.workspacePath, PATHS.UI_STATE_FILE);
    this.contractsDir = path.join(this.workspacePath, PATHS.CONTRACTS_DIR);
    this.cachedGitBranch = null;
  }

  getGlobalHomeDir() {
    return process.env.SESHFLOW_HOME
      ? path.resolve(process.env.SESHFLOW_HOME)
      : path.join(os.homedir(), PATHS.GLOBAL_WORKSPACES_DIR);
  }

  getWorkspaceIndexFilePath() {
    return path.join(this.getGlobalHomeDir(), 'workspaces.json');
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
        await this.writeConfigFile(this.createDefaultConfig());
      }

      if (!(await this.exists(this.uiStateFile))) {
        await this.writeUIState({ hintsShown: {} });
      }

      await this.registerWorkspace();

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
      const { default: yaml } = await import('yaml');
      const parsed = yaml.parse(content) || {};
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
      workspace: {
        ...DEFAULT_CONFIG.workspace,
        ...(parsed.workspace || {}),
        name: parsed.workspace?.name || path.basename(this.workspacePath) || '',
        path: this.workspacePath
      },
      contracts: {
        ...DEFAULT_CONFIG.contracts,
        ...(parsed.contracts || {})
      },
      planning: {
        ...DEFAULT_CONFIG.planning,
        ...(parsed.planning || {})
      }
    };
    } catch (error) {
      throw new Error(`Failed to read config file: ${error.message}`);
    }
  }

  async readUIState() {
    try {
      if (!(await this.exists(this.uiStateFile))) {
        return { hintsShown: {} };
      }

      const content = await fs.readFile(this.uiStateFile, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        hintsShown: {
          ...(parsed?.hintsShown || {})
        }
      };
    } catch (error) {
      throw new Error(`Failed to read UI state file: ${error.message}`);
    }
  }

  async writeUIState(data = {}) {
    try {
      const normalized = {
        hintsShown: {
          ...(data?.hintsShown || {})
        }
      };
      await fs.writeFile(this.uiStateFile, JSON.stringify(normalized, null, 2), 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write UI state file: ${error.message}`);
    }
  }

  async shouldShowHint(key, cooldownMs = 15 * 60 * 1000) {
    const uiState = await this.readUIState();
    const lastShown = uiState.hintsShown[key];
    const now = Date.now();

    if (lastShown && (now - new Date(lastShown).getTime()) < cooldownMs) {
      return false;
    }

    uiState.hintsShown[key] = new Date(now).toISOString();
    await this.writeUIState(uiState);
    return true;
  }

  /**
   * Write config file
   */
  async writeConfigFile(config) {
    try {
      const { default: yaml } = await import('yaml');
      const normalizedConfig = {
        ...DEFAULT_CONFIG,
        ...config,
      workspace: {
        ...DEFAULT_CONFIG.workspace,
        ...(config.workspace || {}),
        name: config.workspace?.name || path.basename(this.workspacePath) || '',
        path: this.workspacePath
      },
      contracts: {
        ...DEFAULT_CONFIG.contracts,
        ...(config.contracts || {})
      },
      planning: {
        ...DEFAULT_CONFIG.planning,
        ...(config.planning || {})
      }
    };
      const content = yaml.stringify(normalizedConfig);
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

  getWorkspaceResolution() {
    return { ...this.workspaceResolution };
  }

  async readWorkspaceIndex() {
    const indexFile = this.getWorkspaceIndexFilePath();
    if (!(await this.exists(indexFile))) {
      return {
        schemaVersion: 1,
        updatedAt: null,
        workspaces: [],
      };
    }

    const content = await fs.readFile(indexFile, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      schemaVersion: 1,
      updatedAt: parsed?.updatedAt || null,
      workspaces: Array.isArray(parsed?.workspaces) ? parsed.workspaces : [],
    };
  }

  async writeWorkspaceIndex(data = {}) {
    const indexFile = this.getWorkspaceIndexFilePath();
    await fs.ensureDir(path.dirname(indexFile));
    const normalized = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      workspaces: Array.isArray(data?.workspaces) ? data.workspaces : [],
    };
    await fs.writeFile(indexFile, JSON.stringify(normalized, null, 2), 'utf-8');
    return normalized;
  }

  async registerWorkspace() {
    const index = await this.readWorkspaceIndex();
    const info = await this.getWorkspaceInfo();
    const record = {
      path: info.path,
      name: info.name,
      mode: (await this.readConfigFile()).mode || 'default',
      gitBranch: info.gitBranch,
      tasksFile: this.tasksFile,
      configPath: this.configFile,
      lastSeenAt: new Date().toISOString(),
    };

    const nextWorkspaces = index.workspaces.filter(workspace => workspace.path !== record.path);
    nextWorkspaces.push(record);
    nextWorkspaces.sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path));
    await this.writeWorkspaceIndex({ workspaces: nextWorkspaces });
  }

  getContractsDir() {
    return this.contractsDir;
  }

  getContractFilePath(contractId) {
    return path.join(this.contractsDir, `${contractId}.json`);
  }

  async ensureContractsDir() {
    await fs.ensureDir(this.contractsDir);
    return this.contractsDir;
  }

  async listContractFiles() {
    if (!(await this.exists(this.contractsDir))) {
      return [];
    }

    const entries = await fs.readdir(this.contractsDir);
    return entries
      .filter(entry => entry.endsWith('.json'))
      .sort()
      .map(entry => path.join(this.contractsDir, entry));
  }

  async readContractFile(contractId) {
    try {
      const content = await fs.readFile(this.getContractFilePath(contractId), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read contract file: ${error.message}`);
    }
  }

  async writeContractFile(contractId, data) {
    try {
      await this.ensureContractsDir();
      await fs.writeFile(this.getContractFilePath(contractId), JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write contract file: ${error.message}`);
    }
  }

  getWorkspaceRecordSync(taskCount = 0) {
    return {
      path: this.workspacePath,
      requestedPath: this.requestedWorkspacePath,
      name: path.basename(this.workspacePath) || '',
      gitBranch: '',
      totalTasks: taskCount,
      seshflowDir: this.seshflowDir,
      tasksFile: this.tasksFile,
      configPath: this.configFile,
      source: this.workspaceResolution.source,
      sourcePath: this.workspaceResolution.sourcePath
    };
  }

  async getWorkspaceInfo(taskCount = 0) {
    const info = this.getWorkspaceRecordSync(taskCount);
    info.gitBranch = await this.getGitBranch();
    return info;
  }

  createDefaultConfig() {
    return {
      ...DEFAULT_CONFIG,
      workspace: {
        ...DEFAULT_CONFIG.workspace,
        name: path.basename(this.workspacePath) || 'seshflow-workspace',
        type: process.platform,
        path: this.workspacePath
      },
      contracts: {
        ...DEFAULT_CONFIG.contracts
      },
      planning: {
        ...DEFAULT_CONFIG.planning
      }
    };
  }

  normalizeTaskFile(data = {}) {
    const workspaceInfo = this.getWorkspaceRecordSync(Array.isArray(data.tasks) ? data.tasks.length : 0);
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
    normalized.workspace.path = workspaceInfo.path;
    normalized.workspace.name = workspaceInfo.name;
    normalized.workspace.gitBranch = normalized.workspace.gitBranch || '';
    normalized.workspace.source = workspaceInfo.source;
    normalized.workspace.sourcePath = workspaceInfo.sourcePath;
    normalized.workspace.requestedPath = workspaceInfo.requestedPath;
    normalized.workspace.configPath = workspaceInfo.configPath;
    normalized.workspace.tasksFile = workspaceInfo.tasksFile;
    normalized.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    normalized.transitions = Array.isArray(data.transitions) ? data.transitions : [];
    normalized.runtimeEvents = Array.isArray(data.runtimeEvents) ? data.runtimeEvents : [];
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
    if (this.cachedGitBranch !== null) {
      return this.cachedGitBranch;
    }

    try {
      const { default: simpleGit } = await import('simple-git');
      const git = simpleGit({ baseDir: this.workspacePath });
      const branch = await git.branch();
      this.cachedGitBranch = branch.current || '';
      return this.cachedGitBranch;
    } catch {
      this.cachedGitBranch = '';
      return '';
    }
  }
}
