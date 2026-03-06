import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique task ID
 * @returns {string} Task ID in format task_<6-char>
 */
export function generateTaskId() {
  const random = uuidv4().replace(/-/g, '').slice(0, 6).toLowerCase();
  return `task_${random}`;
}

/**
 * Generate a unique subtask ID
 * @returns {string} Subtask ID
 */
export function generateSubtaskId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `sub_${timestamp}_${random}`;
}

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
export function generateSessionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `sess_${timestamp}_${random}`;
}

/**
 * Format date to ISO string
 * @param {Date} date - Date object
 * @returns {string} ISO 8601 timestamp
 */
export function toISOString(date = new Date()) {
  return date.toISOString();
}

/**
 * Parse task ID from string
 * @param {string} id - Task ID string
 * @returns {object} Parsed components
 */
export function parseTaskId(id) {
  const parts = String(id || '').split('_');
  const prefix = parts[0] || '';

  // Legacy: task_<timestamp>_<random>
  if (parts.length >= 3) {
    const timestamp = parts[1];
    const random = parts.slice(2).join('_');
    return { prefix, timestamp, random, short: random };
  }

  // Current: task_<short>
  const short = parts[1] || '';
  return { prefix, timestamp: null, random: short, short };
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, length = 50) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Calculate completion percentage for subtasks
 * @param {Array} subtasks - Array of subtasks
 * @returns {number} Completion percentage (0-100)
 */
export function calculateCompletion(subtasks) {
  if (!subtasks || subtasks.length === 0) return 0;
  const completed = subtasks.filter(s => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

/**
 * Validate task priority
 * @param {string} priority - Priority value
 * @returns {boolean} True if valid
 */
export function isValidPriority(priority) {
  return ['P0', 'P1', 'P2', 'P3'].includes(priority);
}

/**
 * Validate task status
 * @param {string} status - Status value
 * @returns {boolean} True if valid
 */
export function isValidStatus(status) {
  return ['backlog', 'todo', 'in-progress', 'review', 'done', 'blocked'].includes(
    status
  );
}

/**
 * Sanitize branch name for git
 * @param {string} name - Branch name
 * @returns {string} Sanitized branch name
 */
export function sanitizeBranchName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9/-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format hours for display
 * @param {number} hours - Hours value
 * @returns {string} Formatted string
 */
export function formatHours(hours) {
  if (!hours || hours === 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours}h`;
}
