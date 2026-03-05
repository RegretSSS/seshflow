/**
 * Task status types
 */
export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in-progress'
  | 'review'
  | 'done'
  | 'blocked';

/**
 * Task priority levels
 */
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Main task interface
 */
export interface Task {
  /** Unique task ID (timestamp_random) */
  id: string;
  /** Task title */
  title: string;
  /** Detailed description (supports Markdown) */
  description: string;
  /** Current status */
  status: TaskStatus;
  /** Priority level */
  priority: TaskPriority;

  // Dependencies
  /** List of task IDs this task depends on */
  dependencies: string[];
  /** List of task IDs blocking this task */
  blockedBy: string[];
  /** Subtasks */
  subtasks: Subtask[];

  // Time tracking
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** When work started (ISO 8601 or null) */
  startedAt: string | null;
  /** When completed (ISO 8601 or null) */
  completedAt: string | null;
  /** Estimated hours */
  estimatedHours: number;
  /** Actual hours spent */
  actualHours: number;

  // Classification
  /** Assigned person */
  assignee: string | null;
  /** Tags */
  tags: string[];

  // Git integration
  /** Associated git branch */
  gitBranch: string;
  /** Git commits */
  gitCommits: GitCommit[];

  // Session history
  /** Work sessions */
  sessions: Session[];

  // Metadata
  /** Additional context */
  context: TaskContext;
}

/**
 * Subtask interface
 */
export interface Subtask {
  /** Unique subtask ID */
  id: string;
  /** Subtask title */
  title: string;
  /** Completion status */
  completed: boolean;
  /** Completion timestamp (ISO 8601 or null) */
  completedAt: string | null;
}

/**
 * Git commit record
 */
export interface GitCommit {
  /** Commit hash */
  hash: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Commit timestamp (ISO 8601) */
  timestamp: string;
  /** Associated task ID */
  taskId: string;
}

/**
 * Work session record
 */
export interface Session {
  /** Session ID */
  id: string;
  /** Session start (ISO 8601) */
  startedAt: string;
  /** Session end (ISO 8601 or null) */
  endedAt: string | null;
  /** Session notes */
  note: string;
}

/**
 * Task context metadata
 */
export interface TaskContext {
  /** Related files */
  relatedFiles: string[];
  /** Relevant commands */
  commands: string[];
  /** Related links */
  links: string[];
}

/**
 * Task file structure (saved in .seshflow/tasks.json)
 */
export interface TaskFile {
  /** File format version */
  version: string;
  /** Workspace information */
  workspace: WorkspaceInfo;
  /** Metadata */
  metadata: FileMetadata;
  /** Column definitions */
  columns: Column[];
  /** All tasks */
  tasks: Task[];
  /** Current active session */
  currentSession: CurrentSession | null;
  /** Statistics */
  statistics: Statistics;
}

/**
 * Workspace information
 */
export interface WorkspaceInfo {
  /** Workspace name */
  name: string;
  /** Workspace path */
  path: string;
  /** Current git branch */
  gitBranch: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** Last session timestamp (ISO 8601) */
  lastSession: string;
}

/**
 * Column definition
 */
export interface Column {
  /** Column ID */
  id: string;
  /** Column display name */
  name: string;
  /** Column color (hex) */
  color: string;
}

/**
 * Current active session
 */
export interface CurrentSession {
  /** Active task ID */
  taskId: string;
  /** Session start timestamp (ISO 8601) */
  startedAt: string;
}

/**
 * Statistics
 */
export interface Statistics {
  /** Total number of tasks */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Total estimated hours */
  totalEstimatedHours: number;
  /** Actual hours spent */
  actualSpentHours: number;
}

/**
 * Configuration file structure (saved in .seshflow/config.yaml)
 */
export interface Config {
  workspace: WorkspaceConfig;
  network: NetworkConfig;
  sync: SyncConfig;
  git: GitConfig;
  ui: UIConfig;
}

/**
 * Workspace configuration
 */
export interface WorkspaceConfig {
  name: string;
  type: 'windows' | 'wsl' | 'linux' | 'mac';
  path: string;
  winPath?: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  port: number;
  webPort: number;
  discovery: DiscoveryConfig;
  peers: string[];
}

/**
 * Discovery configuration
 */
export interface DiscoveryConfig {
  enabled: boolean;
  methods: string[];
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  autoSync: boolean;
  interval: number;
  strategy: 'last-write-wins' | 'manual';
}

/**
 * Git configuration
 */
export interface GitConfig {
  autoHook: boolean;
  commitTemplate: string;
}

/**
 * UI configuration
 */
export interface UIConfig {
  defaultView: 'board' | 'graph' | 'timeline';
  columns: string[];
}
