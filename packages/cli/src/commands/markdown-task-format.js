import fs from 'fs-extra';
import chalk from 'chalk';
import { CONTRACT_ROLES } from '../../../shared/constants/contracts.js';
import { isValidContractId, isValidTaskId } from '../utils/helpers.js';

const DEPENDENCY_PREFIX_RE = /^(dependency|depends|dep|依赖)\s*:/i;
const CONTRACT_PREFIX_RE = /^contracts?\s*:/i;
const CONTRACT_HEADING_PREFIX_RE = /^contract\s*:/i;
const CONTRACT_ROLE_PREFIX_RE = /^contract-role\s*:/i;
const FILE_PREFIX_RE = /^(files?|bound-files?)\s*:/i;
const ID_PREFIX_RE = /^id\s*:/i;
const TAG_PREFIX_RE = /^(标签|tags?)\s*[:：]\s*/i;
const PRIORITY_PREFIX_RE = /^(优先级|priority)\s*[:：]\s*/i;
const ESTIMATE_PREFIX_RE = /^(预估|estimate)\s*[:：]\s*/i;
const COLUMN_PREFIX_RE = /^(column|status|列|状态)\s*[:：]\s*/i;
const TASK_LINE_RE = /^-\s*\[([ x])\]\s+(.+)$/i;

function createIssue(message, line = null, suggestion = null) {
  return { message, line, suggestion };
}

function parseDependencyToken(content) {
  if (!DEPENDENCY_PREFIX_RE.test(content)) {
    return [];
  }

  return content
    .replace(DEPENDENCY_PREFIX_RE, '')
    .split(',')
    .map(dep => dep.trim())
    .filter(Boolean);
}

function parseIdToken(content) {
  if (!ID_PREFIX_RE.test(content)) {
    return null;
  }

  const value = content.replace(ID_PREFIX_RE, '').trim();
  return value || null;
}

function parseContractToken(content) {
  if (!CONTRACT_PREFIX_RE.test(content)) {
    return [];
  }

  return content
    .replace(CONTRACT_PREFIX_RE, '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function parseContractRoleToken(content) {
  if (!CONTRACT_ROLE_PREFIX_RE.test(content)) {
    return null;
  }

  const value = content.replace(CONTRACT_ROLE_PREFIX_RE, '').trim().toLowerCase();
  return Object.values(CONTRACT_ROLES).includes(value) ? value : value || null;
}

function parseFileToken(content) {
  if (!FILE_PREFIX_RE.test(content)) {
    return [];
  }

  return content
    .replace(FILE_PREFIX_RE, '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function parseStatusValue(value = '') {
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes('in progress') || raw.includes('in-progress') || raw.includes('进行中')) {
    return 'in-progress';
  }
  if (raw.includes('todo') || raw.includes('to do') || raw.includes('待办') || raw.includes('待做')) {
    return 'todo';
  }
  if (raw.includes('backlog') || raw.includes('待办池')) {
    return 'backlog';
  }
  if (raw.includes('review') || raw.includes('审查') || raw.includes('评审')) {
    return 'review';
  }
  if (raw.includes('blocked') || raw.includes('阻塞') || raw.includes('受阻')) {
    return 'blocked';
  }
  if (raw.includes('done') || raw.includes('已完成') || raw.includes('完成')) {
    return 'done';
  }

  return null;
}

function parsePriorityValue(value = '') {
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  if (/^P[0-3]$/i.test(raw)) {
    return raw.toUpperCase();
  }

  const mappings = {
    urgent: 'P0',
    critical: 'P0',
    high: 'P0',
    medium: 'P1',
    normal: 'P2',
    low: 'P3',
  };

  return mappings[raw] || null;
}

function parseEstimateValue(value = '') {
  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/^-?(\d+(?:\.\d+)?)\s*h?$/i);
  if (!match) return null;
  return Number.parseFloat(match[1]) * (raw.startsWith('-') ? -1 : 1);
}

function mapHeadingToStatus(heading = '') {
  const normalized = String(heading).trim().toLowerCase();
  if (CONTRACT_HEADING_PREFIX_RE.test(normalized)) {
    return null;
  }
  const explicit = normalized.match(/\[(backlog|todo|in-progress|review|done|blocked)\]/i);
  if (explicit) {
    return explicit[1].toLowerCase();
  }
  return parseStatusValue(normalized);
}

function getTaskLineInfo(rawLine) {
  const indent = rawLine.match(/^\s*/)?.[0].length || 0;
  const trimmedStart = rawLine.trimStart();
  const match = trimmedStart.match(TASK_LINE_RE);
  if (!match) return null;

  return {
    indent,
    isCompleted: match[1].toLowerCase() === 'x',
    content: match[2].trim(),
  };
}

function parseTaskLine(lineContent, lineNumber, isCompleted = false, issues = null) {
  if (!lineContent) return null;

  const task = {
    id: null,
    lineNumber,
    title: '',
    description: '',
    status: isCompleted ? 'done' : 'backlog',
    priority: 'P2',
    tags: [],
    estimatedHours: 0,
    assignee: null,
    dependencies: [],
    contractIds: [],
    contractRole: null,
    contractRoleSpecified: false,
    boundFiles: [],
  };

  const titleMatch = lineContent.match(/^(.+?)(?:\s+\[|$)/);
  task.title = titleMatch ? titleMatch[1].trim() : lineContent.trim();

  const allMatches = lineContent.matchAll(/\[([^\]]+)\]/g);
  for (const match of allMatches) {
    const content = match[1].trim();

    if (/^P[0-3]$/i.test(content)) {
      task.priority = content.toUpperCase();
      continue;
    }

    if (PRIORITY_PREFIX_RE.test(content)) {
      const value = content.replace(PRIORITY_PREFIX_RE, '').trim();
      const parsed = parsePriorityValue(value);
      if (parsed) {
        task.priority = parsed;
      } else if (issues) {
        issues.warnings.push(createIssue(`unrecognized priority value "${value}"`, lineNumber, 'use P0, P1, P2, or P3'));
      }
      continue;
    }

    if (/^-?\d+(\.\d+)?h$/i.test(content)) {
      task.estimatedHours = Number.parseFloat(content);
      continue;
    }

    if (ESTIMATE_PREFIX_RE.test(content)) {
      const value = content.replace(ESTIMATE_PREFIX_RE, '').trim();
      const parsed = parseEstimateValue(value);
      if (parsed === null || Number.isNaN(parsed)) {
        if (issues) {
          issues.errors.push(createIssue(`invalid estimate value "${value}"`, lineNumber, 'use number or number+h, for example 2 or 2h'));
        }
      } else if (parsed < 0) {
        if (issues) {
          issues.errors.push(createIssue('estimate cannot be negative', lineNumber));
        }
      } else {
        task.estimatedHours = parsed;
      }
      continue;
    }

    if (content.startsWith('@')) {
      task.assignee = content.substring(1);
      continue;
    }

    if (COLUMN_PREFIX_RE.test(content)) {
      const inlineStatus = parseStatusValue(content.replace(COLUMN_PREFIX_RE, ''));
      if (inlineStatus) {
        task.status = inlineStatus;
      }
      continue;
    }

    const stableId = parseIdToken(content);
    if (stableId) {
      task.id = stableId;
      continue;
    }

    const dependencies = parseDependencyToken(content);
    if (dependencies.length > 0) {
      task.dependencies.push(...dependencies);
      continue;
    }

    const contractIds = parseContractToken(content);
    if (contractIds.length > 0) {
      task.contractIds.push(...contractIds);
      continue;
    }

    const contractRole = parseContractRoleToken(content);
    if (CONTRACT_ROLE_PREFIX_RE.test(content)) {
      task.contractRoleSpecified = true;
    }
    if (contractRole) {
      task.contractRole = contractRole;
      continue;
    }

    const boundFiles = parseFileToken(content);
    if (boundFiles.length > 0) {
      task.boundFiles.push(...boundFiles);
      continue;
    }

    if (TAG_PREFIX_RE.test(content)) {
      const tags = content
        .replace(TAG_PREFIX_RE, '')
        .split(/[，,]/)
        .map(tag => tag.trim())
        .filter(Boolean);
      task.tags.push(...tags);
      continue;
    }

    const tags = content.split(',').map(tag => tag.trim()).filter(Boolean);
    task.tags.push(...tags);
  }

  task.tags = [...new Set(task.tags)];
  task.dependencies = [...new Set(task.dependencies)];
  task.contractIds = [...new Set(task.contractIds)];
  task.boundFiles = [...new Set(task.boundFiles)];

  return task.title ? task : null;
}

function applyMetadataLine(task, content, issues, lineNumber) {
  if (!content) return false;

  const stableId = parseIdToken(content);
  if (stableId) {
    task.id = stableId;
    return true;
  }

  const dependencies = parseDependencyToken(content);
  if (dependencies.length > 0) {
    task.dependencies = [...new Set([...(task.dependencies || []), ...dependencies])];
    return true;
  }

  const contractIds = parseContractToken(content);
  if (contractIds.length > 0) {
    task.contractIds = [...new Set([...(task.contractIds || []), ...contractIds])];
    return true;
  }

  const contractRole = parseContractRoleToken(content);
  if (CONTRACT_ROLE_PREFIX_RE.test(content)) {
    task.contractRoleSpecified = true;
  }
  if (contractRole) {
    task.contractRole = contractRole;
    return true;
  }

  const boundFiles = parseFileToken(content);
  if (boundFiles.length > 0) {
    task.boundFiles = [...new Set([...(task.boundFiles || []), ...boundFiles])];
    return true;
  }

  if (TAG_PREFIX_RE.test(content)) {
    const tags = content
      .replace(TAG_PREFIX_RE, '')
      .split(/[，,]/)
      .map(tag => tag.trim())
      .filter(Boolean);
    task.tags = [...new Set([...(task.tags || []), ...tags])];
    return true;
  }

  if (PRIORITY_PREFIX_RE.test(content)) {
    const value = content.replace(PRIORITY_PREFIX_RE, '').trim();
    const parsed = parsePriorityValue(value);
    if (parsed) {
      task.priority = parsed;
    } else {
      issues.warnings.push(createIssue(`unrecognized priority value "${value}"`, lineNumber, 'use P0, P1, P2, or P3'));
    }
    return true;
  }

  if (ESTIMATE_PREFIX_RE.test(content)) {
    const value = content.replace(ESTIMATE_PREFIX_RE, '').trim();
    const parsed = parseEstimateValue(value);
    if (parsed === null || Number.isNaN(parsed)) {
      issues.errors.push(createIssue(`invalid estimate value "${value}"`, lineNumber, 'use number or number+h, for example 2 or 2h'));
    } else if (parsed < 0) {
      issues.errors.push(createIssue('estimate cannot be negative', lineNumber));
    } else {
      task.estimatedHours = parsed;
    }
    return true;
  }

  if (COLUMN_PREFIX_RE.test(content)) {
    const value = content.replace(COLUMN_PREFIX_RE, '').trim();
    const parsed = parseStatusValue(value);
    if (parsed) {
      task.status = parsed;
    }
    return true;
  }

  return false;
}

export async function parseMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const tasks = [];
  const issues = { errors: [], warnings: [] };

  let currentStatus = null;
  let currentContractIds = [];
  let currentTask = null;
  let inCodeFence = false;
  let lastNonEmptyKind = 'start';
  let previousLineBlank = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    if (!line) {
      previousLineBlank = true;
      continue;
    }

    if (line.startsWith('##')) {
      const heading = line.replace(/^#+\s*/, '').trim();
      if (CONTRACT_HEADING_PREFIX_RE.test(heading)) {
        currentContractIds = heading
          .replace(CONTRACT_HEADING_PREFIX_RE, '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean);
      } else {
        currentStatus = mapHeadingToStatus(heading);
      }
      currentTask = null;
      previousLineBlank = false;
      lastNonEmptyKind = 'heading';
      continue;
    }

    const taskLine = getTaskLineInfo(rawLine);
    if (taskLine) {
      const isSubtask = taskLine.indent > 0
        && currentTask
        && !previousLineBlank
        && ['task', 'subtask', 'description', 'metadata'].includes(lastNonEmptyKind);

      if (isSubtask) {
        const subtask = {
          title: taskLine.content.replace(/\[.*?\]/g, '').trim(),
          completed: taskLine.isCompleted,
          priority: taskLine.content.match(/\[P[0-3]\]/)?.[0] || '',
          estimatedHours: Number.parseFloat(taskLine.content.match(/\[(\d+(\.\d+)?)h\]/i)?.[1] || '0'),
        };
        currentTask.subtasks.push(subtask);
        previousLineBlank = false;
        lastNonEmptyKind = 'subtask';
        continue;
      }

      const task = parseTaskLine(taskLine.content, i + 1, taskLine.isCompleted, issues);
      if (task) {
        task.subtasks = [];
        if (!taskLine.isCompleted && currentStatus) {
          task.status = currentStatus;
        }
        if (currentContractIds.length > 0) {
          task.contractIds = [...new Set([...(task.contractIds || []), ...currentContractIds])];
        }
        if (taskLine.indent > 0) {
          issues.warnings.push(
            createIssue(
              'top-level task is indented; parsed as a root task for compatibility',
              i + 1,
              'remove leading spaces from top-level task lines to avoid ambiguity with subtasks'
            )
          );
        }
        tasks.push(task);
        currentTask = task;
        previousLineBlank = false;
        lastNonEmptyKind = 'task';
      }
      continue;
    }

    if (line.startsWith('>')) {
      const descLine = line.replace(/^>\s*/, '').trim();
      if (currentTask) {
        currentTask.description = (currentTask.description || '') + descLine + '\n';
      }
      previousLineBlank = false;
      lastNonEmptyKind = 'description';
      continue;
    }

    const isIndented = /^\s+/.test(rawLine);
    if (isIndented && currentTask) {
      const normalized = line.replace(/^[-*]\s*/, '');
      const isMetadata = applyMetadataLine(currentTask, normalized, issues, i + 1);
      if (!isMetadata) {
        currentTask.description = (currentTask.description || '') + normalized + '\n';
      }
      previousLineBlank = false;
      lastNonEmptyKind = isMetadata ? 'metadata' : 'description';
    }
  }

  tasks.forEach(task => {
    if (task.description) {
      task.description = task.description.trim();
    }
  });

  return { tasks, errors: issues.errors, warnings: issues.warnings };
}

export function validateParsedTasks(tasks) {
  const errors = [];
  const warnings = [];
  const seenTaskIds = new Map();
  const taskTitles = new Set(tasks.map(task => task.title));
  const taskLineCount = tasks.length;

  tasks.forEach((task, index) => {
    const taskNum = index + 1;
    const taskLabel = task.title ? `"${task.title}"` : `Task ${taskNum}`;

    if (!task.title) {
      errors.push(createIssue(`Task ${taskNum}: title is required`, task.lineNumber, 'add text after "- [ ]"'));
    }

    if (task.id) {
      if (!isValidTaskId(task.id)) {
        errors.push(createIssue(`${taskLabel}: invalid stable id ${task.id}`, task.lineNumber, 'use ids like [id:task_example]'));
      } else if (seenTaskIds.has(task.id)) {
        errors.push(createIssue(`${taskLabel}: duplicate stable id ${task.id}`, task.lineNumber, 'keep each [id:task_xxx] unique within the file'));
      } else {
        seenTaskIds.set(task.id, taskLabel);
      }
    }

    if (task.contractIds?.length > 0) {
      task.contractIds.forEach(contractId => {
        if (!isValidContractId(contractId)) {
          errors.push(createIssue(`${taskLabel}: invalid contract id ${contractId}`, task.lineNumber, 'use ids like [contracts:contract.domain.action]'));
        }
      });
    }

    if (task.contractRole && !Object.values(CONTRACT_ROLES).includes(task.contractRole)) {
      warnings.push(createIssue(`${taskLabel}: invalid contract role ${task.contractRole}`, task.lineNumber, `use one of: ${Object.values(CONTRACT_ROLES).join(', ')}`));
    }

    if (!['P0', 'P1', 'P2', 'P3'].includes(task.priority)) {
      warnings.push(createIssue(`${taskLabel}: invalid priority ${task.priority}`, task.lineNumber, 'use P0, P1, P2, or P3'));
    }

    if (task.estimatedHours < 0) {
      errors.push(createIssue(`${taskLabel}: estimated hours cannot be negative`, task.lineNumber));
    }

    if (!task.description && task.estimatedHours > 4) {
      warnings.push(createIssue(`${taskLabel}: large task (${task.estimatedHours}h) has no description`, task.lineNumber, 'add an indented description line or metadata block below the task'));
    }

    (task.dependencies || []).forEach(dep => {
      const numericIndex = Number.parseInt(dep, 10);
      const byIndex = Number.isInteger(numericIndex) && numericIndex > 0 && numericIndex <= taskLineCount;
      const byTitle = taskTitles.has(dep);
      const byTaskId = isValidTaskId(dep);
      if (!byIndex && !byTitle && !byTaskId) {
        warnings.push(createIssue(`${taskLabel}: unresolved dependency "${dep}"`, task.lineNumber, 'reference a task number, title, or stable id like task_example'));
      }
    });
  });

  return { errors, warnings };
}

export function formatValidationIssue(issue) {
  const linePrefix = issue.line ? `Line ${issue.line}: ` : '';
  const suggestion = issue.suggestion ? ` | fix: ${issue.suggestion}` : '';
  return `${linePrefix}${issue.message}${suggestion}`;
}

export function printMarkdownTaskFormatHints(logger = console.error) {
  logger(chalk.blue('\nAccepted task patterns:'));
  logger(chalk.gray('  - [ ] Task title [id:task_example] [P1] [dependency:task_other] [2h]'));
  logger(chalk.gray('  - [ ] Task title [id:task_example] [priority:P1] [estimate:2h]'));
  logger(chalk.gray('  - [ ] Task title [contracts:contract.user.create] [contract-role:producer] [files:src/api.ts]'));
  logger(chalk.gray('    priority: P1'));
  logger(chalk.gray('    estimate: 2h'));
  logger(chalk.gray('    depends: task_other'));
  logger(chalk.gray('  ## Contract: contract.user.create'));
  logger(chalk.gray('  Top-level tasks should not be indented; indent child subtasks by 2 spaces.'));
}
