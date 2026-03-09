import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';
import { resolveWorkspaceMode } from '../core/workspace-mode.js';

function filterTasks(tasks, options = {}) {
  let result = [...tasks];

  if (options.status) {
    const statuses = options.status.split(',').map(s => s.trim()).filter(Boolean);
    result = result.filter(task => statuses.includes(task.status));
  }

  if (options.priority) {
    const priorities = options.priority.split(',').map(p => p.trim()).filter(Boolean);
    result = result.filter(task => priorities.includes(task.priority));
  }

  return result;
}

function priorityWeight(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function topologicallySortTasks(tasks) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const inDegree = new Map(tasks.map(task => [task.id, 0]));
  const adjacency = new Map(tasks.map(task => [task.id, []]));

  tasks.forEach(task => {
    (task.dependencies || []).forEach(depId => {
      if (!byId.has(depId)) {
        return;
      }
      adjacency.get(depId).push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    });
  });

  const queue = tasks
    .filter(task => (inDegree.get(task.id) || 0) === 0)
    .sort((left, right) => {
      if (priorityWeight(left.priority) !== priorityWeight(right.priority)) {
        return priorityWeight(left.priority) - priorityWeight(right.priority);
      }
      return new Date(left.createdAt) - new Date(right.createdAt);
    });

  const ordered = [];
  while (queue.length > 0) {
    const task = queue.shift();
    ordered.push(task);

    for (const nextId of adjacency.get(task.id) || []) {
      const nextDegree = (inDegree.get(nextId) || 0) - 1;
      inDegree.set(nextId, nextDegree);
      if (nextDegree === 0) {
        queue.push(byId.get(nextId));
        queue.sort((left, right) => {
          if (priorityWeight(left.priority) !== priorityWeight(right.priority)) {
            return priorityWeight(left.priority) - priorityWeight(right.priority);
          }
          return new Date(left.createdAt) - new Date(right.createdAt);
        });
      }
    }
  }

  return ordered.length === tasks.length ? ordered : [...tasks];
}

function renderTask(task) {
  const done = task.status === 'done' ? 'x' : ' ';
  const stableId = task.id ? ` [id:${task.id}]` : '';
  const tags = (task.tags || []).length ? ` [${task.tags.join(',')}]` : '';
  const hours = task.estimatedHours > 0 ? ` [${task.estimatedHours}h]` : '';
  const assignee = task.assignee ? ` [@${task.assignee}]` : '';
  const deps = (task.dependencies || []).length
    ? ` [dependency:${task.dependencies.join(',')}]`
    : '';
  const contracts = (task.contractIds || []).length
    ? ` [contracts:${task.contractIds.join(',')}]`
    : '';
  const contractRole = task.contractRole ? ` [contract-role:${task.contractRole}]` : '';
  const boundFiles = (task.boundFiles || []).length
    ? ` [files:${task.boundFiles.join(',')}]`
    : '';

  const lines = [`- [${done}] ${task.title}${stableId} [${task.priority}]${tags}${hours}${assignee}${deps}${contracts}${contractRole}${boundFiles}`];

  if (task.description) {
    task.description.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        lines.push(`> ${trimmed}`);
      }
    });
  }

  if (task.subtasks && task.subtasks.length > 0) {
    task.subtasks.forEach(subtask => {
      lines.push(`  - [${subtask.completed ? 'x' : ' '}] ${subtask.title}`);
    });
  }

  lines.push('');
  return lines;
}

function toMarkdown(tasks) {
  const grouped = new Map();

  tasks.forEach(task => {
    const key = task.status || 'backlog';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(task);
  });

  const sections = ['# Exported Tasks', ''];

  for (const [status, items] of grouped.entries()) {
    sections.push(`## ${status}`);
    sections.push('');

    items.forEach(task => {
      sections.push(...renderTask(task));
    });
  }

  return sections.join('\n');
}

function toApiFirstMarkdown(tasks) {
  const sections = ['# API-first Exported Tasks', ''];
  const contractGroups = new Map();
  const unboundTasks = [];

  tasks.forEach(task => {
    const primaryContract = task.contractIds?.[0];
    if (!primaryContract) {
      unboundTasks.push(task);
      return;
    }

    if (!contractGroups.has(primaryContract)) {
      contractGroups.set(primaryContract, []);
    }
    contractGroups.get(primaryContract).push(task);
  });

  for (const [contractId, contractTasks] of contractGroups.entries()) {
    sections.push(`## Contract: ${contractId}`);
    sections.push('');

    const statusGroups = new Map();
    topologicallySortTasks(contractTasks).forEach(task => {
      const status = task.status || 'backlog';
      if (!statusGroups.has(status)) {
        statusGroups.set(status, []);
      }
      statusGroups.get(status).push(task);
    });

    for (const [status, items] of statusGroups.entries()) {
      sections.push(`### ${status}`);
      sections.push('');
      items.forEach(task => {
        sections.push(...renderTask(task));
      });
    }
  }

  if (unboundTasks.length > 0) {
    sections.push('## Unbound');
    sections.push('');
    topologicallySortTasks(unboundTasks).forEach(task => {
      sections.push(...renderTask(task));
    });
  }

  return sections.join('\n');
}

export async function exportTasks(outputFile, options = {}) {
  const spinner = ora('Loading tasks').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    const tasks = filterTasks(manager.getTasks(), options);
    const modeInfo = await resolveWorkspaceMode(manager.storage);
    const format = options.md
      ? 'markdown'
      : (options.json ? 'json' : (options.format || 'json')).toLowerCase();
    const content = format === 'json'
      ? JSON.stringify(tasks, null, 2)
      : (modeInfo.mode === 'apifirst' ? toApiFirstMarkdown(tasks) : toMarkdown(tasks));

    if (outputFile) {
      await fs.outputFile(outputFile, content, 'utf-8');
      spinner.succeed(`Exported ${tasks.length} tasks to ${outputFile}`);
    } else {
      spinner.succeed(`Exported ${tasks.length} tasks`);
      console.log(content);
    }
  } catch (error) {
    spinner.fail('Export failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
