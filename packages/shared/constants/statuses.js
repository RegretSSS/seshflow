/**
 * Default columns for the kanban board
 */
export const DEFAULT_COLUMNS = [
  { id: 'backlog', name: 'Backlog', color: '#94a3b8' },
  { id: 'todo', name: 'Todo', color: '#3b82f6' },
  { id: 'in-progress', name: 'In Progress', color: '#eab308' },
  { id: 'review', name: 'Review', color: '#8b5cf6' },
  { id: 'done', name: 'Done', color: '#22c55e' },
  { id: 'blocked', name: 'Blocked', color: '#ef4444' }
];

/**
 * Task priority levels with colors
 */
export const PRIORITIES = {
  P0: { value: 'P0', label: 'Critical', color: '#ef4444', weight: 0 },
  P1: { value: 'P1', label: 'High', color: '#f97316', weight: 1 },
  P2: { value: 'P2', label: 'Medium', color: '#eab308', weight: 2 },
  P3: { value: 'P3', label: 'Low', color: '#3b82f6', weight: 3 }
};

/**
 * Task statuses with display names
 */
export const STATUSES = {
  backlog: 'Backlog',
  todo: 'Todo',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked'
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
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
 * File paths
 */
export const PATHS = {
  SEHSFLOW_DIR: '.seshflow',
  TASKS_FILE: '.seshflow/tasks.json',
  CONFIG_FILE: '.seshflow/config.yaml',
  SESSIONS_DIR: '.seshflow/sessions',
  GIT_HOOKS_DIR: '.git/hooks'
};

/**
 * Default task file structure
 */
export const DEFAULT_TASK_FILE = {
  version: '1.0.0',
  workspace: {
    name: '',
    path: '',
    gitBranch: ''
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSession: new Date().toISOString()
  },
  columns: DEFAULT_COLUMNS,
  tasks: [],
  currentSession: null,
  statistics: {
    totalTasks: 0,
    completedTasks: 0,
    totalEstimatedHours: 0,
    actualSpentHours: 0
  }
};
