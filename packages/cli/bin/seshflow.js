#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from '../src/commands/init.js';
import { add } from '../src/commands/add.js';
import { next } from '../src/commands/next.js';
import { done, completeTask } from '../src/commands/done.js';
import { newchatfirstround } from '../src/commands/newchatfirstround.js';
import { deps } from '../src/commands/deps.js';
import { importTasks } from '../src/commands/import.js';
import { query } from '../src/commands/query.js';
import { stats } from '../src/commands/stats.js';
import { list } from '../src/commands/list.js';
import { show } from '../src/commands/show.js';
import { deleteTask } from '../src/commands/delete.js';
import { edit } from '../src/commands/edit.js';
import { magic, magicList } from '../src/commands/magic.js';
import { exportTasks } from '../src/commands/export.js';
import { validateMarkdown } from '../src/commands/validate.js';
import { start } from '../src/commands/start.js';
import { skip } from '../src/commands/skip.js';

const program = new Command();

// CLI info
const VERSION = '1.1.0';

program
  .name('seshflow')
  .description('Seshflow - 跨对话任务序列器')
  .version(VERSION);

// Init command
program
  .command('init')
  .description('Initialize seshflow workspace')
  .option('-f, --force', 'Reinitialize even if already initialized')
  .action(init);

// Add command
program
  .command('add <title>')
  .description('Add a new task')
  .option('-d, --description <description>', 'Task description (Markdown supported)')
  .option('--desc <description>', 'Alias for --description')
  .option('-p, --priority <P0|P1|P2|P3>', 'Task priority')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--tag <tags>', 'Alias for --tags')
  .option('--depends <tasks>', 'Comma-separated task IDs this task depends on')
  .option('--hours <hours>', 'Advanced: alias for --estimate')
  .option('-e, --estimate <hours>', 'Advanced: estimated hours')
  .option('-a, --assignee <name>', 'Assignee name')
  .option('-b, --branch <branch>', 'Git branch name')
  .action(add);

// Next command
program
  .command('next')
  .description('Get next task to work on')
  .option('-p, --priority <P0|P1|P2|P3>', 'Filter by priority')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-a, --assignee <name>', 'Filter by assignee')
  .option('--git', 'Switch git branch automatically')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(next);

// Done command
program
  .command('done')
  .description('Complete current task')
  .option('-h, --hours <number>', 'Advanced: hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .action(done);

// Complete specific task
program
  .command('complete <taskId>')
  .description('Complete a specific task')
  .option('-h, --hours <number>', 'Advanced: hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .action(completeTask);

// Start specific task
program
  .command('start <taskId>')
  .description('Start a specific task (set in-progress)')
  .option('-f, --force', 'Force start even with active session or unmet dependencies')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .action(start);

// Skip current task
program
  .command('skip')
  .description('Skip current task and return it to todo')
  .option('-r, --reason <text>', 'Reason for skipping')
  .option('-n, --note <text>', 'Alias for --reason')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .action(skip);

// Import command
program
  .command('import <file>')
  .description('Import tasks from markdown file')
  .option('--dry-run', 'Preview tasks without importing')
  .option('-f, --force', 'Force create duplicate tasks')
  .option('-u, --update', 'Update existing tasks instead of skipping')
  .option('--verbose', 'Show full imported task details')
  .action(importTasks);

// New chat first round command
program
  .command('newchatfirstround')
  .alias('ncfr')
  .description('Show project context for new AI chat session')
  .option('--show-paths', 'Show full file paths')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(newchatfirstround);

// Dependencies command
program
  .command('deps')
  .description('Show task dependencies')
  .argument('[taskId]', 'Task ID (optional)')
  .option('--graph', 'Show dependency graph as Mermaid')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(deps);

// Query command
program
  .command('query')
  .description('Query tasks by filters')
  .option('-p, --priority <P0|P1|P2|P3>', 'Filter by priority')
  .option('-s, --status <statuses>', 'Filter by status (comma-separated)')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('--tag <tags>', 'Alias for --tags')
  .option('-a, --assignee <name>', 'Filter by assignee')
  .option('-l, --limit <number>', 'Limit number of tasks displayed')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(query);

// Stats command
program
  .command('stats')
  .description('Show task statistics')
  .option('--by-priority', 'Show statistics by priority')
  .option('--by-tags', 'Show statistics by tags')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(stats);

// List command
program
  .command('list')
  .description('List all tasks')
  .option('-s, --status <statuses>', 'Filter by status (comma-separated)')
  .option('-p, --priority <priorities>', 'Filter by priority (comma-separated)')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-a, --assignee <name>', 'Filter by assignee')
  .option('--all', 'Show all tasks (disable default actionable filter)')
  .option('-l, --limit <number>', 'Limit number of tasks displayed')
  .option('-o, --offset <number>', 'Skip the first N tasks')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(list);

// Show command
program
  .command('show <taskId>')
  .description('Show task details')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(show);

// Delete command
program
  .command('delete <taskId>')
  .description('Delete a task')
  .option('-f, --force', 'Force delete without confirmation')
  .action(deleteTask);

// Edit command
program
  .command('edit <taskId>')
  .description('Edit a task (interactive or with options)')
  .option('-t, --title <title>', 'New title')
  .option('-p, --priority <P0|P1|P2|P3>', 'New priority')
  .option('-s, --status <status>', 'New status')
  .option('-d, --description <description>', 'New description')
  .option('--desc <description>', 'Alias for --description')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--tag <tags>', 'Alias for --tags')
  .option('--hours <hours>', 'Advanced: alias for --estimate')
  .option('-e, --estimate <hours>', 'Advanced: new estimated hours')
  .option('-a, --assignee <name>', 'New assignee')
  .option('-b, --branch <branch>', 'New git branch')
  .option('--json', 'Output as JSON')
  .action(edit);

// Magic command (Skills)
program
  .command('magic [skillName] [args...]')
  .description('Execute magic commands (Skills) - use --list to see all')
  .option('-l, --list', 'List all available skills')
  .action(async (skillName, args, options) => {
    if (options.list || !skillName) {
      await magicList();
    } else {
      await magic(skillName, ...(args || []));
    }
  });

// Export command
program
  .command('export [output]')
  .description('Export tasks to markdown or json')
  .option('-s, --status <statuses>', 'Filter by status (comma-separated)')
  .option('-p, --priority <priorities>', 'Filter by priority (comma-separated)')
  .option('-f, --format <markdown|json>', 'Export format', 'markdown')
  .action(exportTasks);

// Validate command
program
  .command('validate <file>')
  .description('Validate markdown task file before import')
  .action(validateMarkdown);

// Parse arguments
program.parse();
