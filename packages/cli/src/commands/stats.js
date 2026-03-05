import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatSuccessResponse, outputJSON, isJSONMode } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';

const PRIORITY_KEYS = ['P0', 'P1', 'P2', 'P3'];

function isNoiseTag(tag) {
  if (!tag) return true;
  if (/^P[0-3]$/i.test(tag)) return true;
  if (/(backlog|todo|in progress|in-progress|review|done|blocked)/i.test(tag)) return true;
  return false;
}

function collectStats(tasks) {
  const overall = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    backlog: tasks.filter(t => t.status === 'backlog').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
    totalActualHours: tasks.reduce((sum, t) => sum + (Number.parseFloat(t.actualHours) || 0), 0),
  };
  overall.progress = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0;

  const byPriority = {
    P0: { total: 0, completed: 0, inProgress: 0 },
    P1: { total: 0, completed: 0, inProgress: 0 },
    P2: { total: 0, completed: 0, inProgress: 0 },
    P3: { total: 0, completed: 0, inProgress: 0 },
  };

  for (const task of tasks) {
    const key = task.priority;
    if (!byPriority[key]) continue;
    byPriority[key].total += 1;
    if (task.status === 'done') byPriority[key].completed += 1;
    if (task.status === 'in-progress') byPriority[key].inProgress += 1;
  }

  const byTags = {};
  for (const task of tasks) {
    for (const tag of (task.tags || []).filter(t => !isNoiseTag(t))) {
      if (!byTags[tag]) byTags[tag] = { total: 0, completed: 0 };
      byTags[tag].total += 1;
      if (task.status === 'done') byTags[tag].completed += 1;
    }
  }

  return { overall, byPriority, byTags };
}

function printCompact(stats) {
  const o = stats.overall;
  console.log(`total=${o.total} done=${o.completed} in_progress=${o.inProgress} todo=${o.todo} backlog=${o.backlog} blocked=${o.blocked} progress=${o.progress}%`);
}

function printPretty(stats, options = {}) {
  const o = stats.overall;
  console.log(chalk.bold.cyan('\nSeshflow Stats\n'));
  console.log(chalk.gray(`  Total: ${o.total}`));
  console.log(chalk.gray(`  Done: ${o.completed} | In Progress: ${o.inProgress} | Todo: ${o.todo} | Backlog: ${o.backlog} | Blocked: ${o.blocked}`));
  console.log(chalk.gray(`  Progress: ${o.progress}%`));

  if (o.totalActualHours > 0) {
    console.log(chalk.gray(`  Logged Hours: ${o.totalActualHours}h`));
  }

  if (options.byPriority) {
    console.log(chalk.bold('\nBy Priority:'));
    for (const key of PRIORITY_KEYS) {
      const row = stats.byPriority[key];
      if (!row || row.total === 0) continue;
      const rowProgress = Math.round((row.completed / row.total) * 100);
      console.log(chalk.gray(`  ${key}: total=${row.total} done=${row.completed} in_progress=${row.inProgress} progress=${rowProgress}%`));
    }
  }

  if (options.byTags) {
    const rows = Object.entries(stats.byTags)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    if (rows.length === 0) {
      console.log(chalk.gray('\nBy Tags: none'));
    } else {
      console.log(chalk.bold('\nBy Tags (Top 10):'));
      rows.forEach(([tag, row]) => {
        const rowProgress = Math.round((row.completed / row.total) * 100);
        console.log(chalk.gray(`  ${tag}: total=${row.total} done=${row.completed} progress=${rowProgress}%`));
      });
    }
  }

  console.log('');
}

export async function stats(options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = (!compactMode && process.stdout.isTTY) ? ora('Loading statistics').start() : null;

  try {
    const manager = new TaskManager();
    await manager.init();

    const allTasks = manager.getTasks();
    const data = collectStats(allTasks);

    spinner?.stop();

    if (isJSONMode(options)) {
      outputJSON(formatSuccessResponse(data));
      return;
    }

    if (compactMode) {
      printCompact(data);
      return;
    }

    printPretty(data, options);
  } catch (error) {
    spinner?.fail('Failed to load statistics');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
