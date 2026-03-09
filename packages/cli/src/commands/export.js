import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';

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
      const done = task.status === 'done' ? 'x' : ' ';
      const stableId = task.id ? ` [id:${task.id}]` : '';
      const tags = (task.tags || []).length ? ` [${task.tags.join(',')}]` : '';
      const hours = task.estimatedHours > 0 ? ` [${task.estimatedHours}h]` : '';
      const assignee = task.assignee ? ` [@${task.assignee}]` : '';
      const deps = (task.dependencies || []).length
        ? ` [dependency:${task.dependencies.join(',')}]`
        : '';

      sections.push(`- [${done}] ${task.title}${stableId} [${task.priority}]${tags}${hours}${assignee}${deps}`);

      if (task.description) {
        task.description.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed) {
            sections.push(`> ${trimmed}`);
          }
        });
      }

      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          sections.push(`  - [${subtask.completed ? 'x' : ' '}] ${subtask.title}`);
        });
      }

      sections.push('');
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
    const format = options.md
      ? 'markdown'
      : (options.json ? 'json' : (options.format || 'json')).toLowerCase();
    const content = format === 'json'
      ? JSON.stringify(tasks, null, 2)
      : toMarkdown(tasks);

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
