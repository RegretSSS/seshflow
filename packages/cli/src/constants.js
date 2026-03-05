/**
 * Constants for Seshflow CLI
 */

/**
 * Default columns for the kanban board
 */
export const DEFAULT_COLUMNS = [
  { id: 'backlog', name: '待办池', color: '#94a3b8' },
  { id: 'todo', name: '准备做', color: '#3b82f6' },
  { id: 'in-progress', name: '进行中', color: '#eab308' },
  { id: 'review', name: '审核', color: '#8b5cf6' },
  { id: 'done', name: '完成', color: '#22c55e' },
  { id: 'blocked', name: '阻塞', color: '#ef4444' }
];

/**
 * Task priority levels with colors
 */
export const PRIORITIES = {
  P0: { value: 'P0', label: '最高', color: '#ef4444', weight: 0 },
  P1: { value: 'P1', label: '高', color: '#f97316', weight: 1 },
  P2: { value: 'P2', label: '中', color: '#eab308', weight: 2 },
  P3: { value: 'P3', label: '低', color: '#3b82f6', weight: 3 }
};

/**
 * Task statuses with display names
 */
export const STATUSES = {
  backlog: '待办池',
  todo: '准备做',
  'in-progress': '进行中',
  review: '审核',
  done: '完成',
  blocked: '阻塞'
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
