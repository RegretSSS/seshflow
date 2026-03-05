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

const program = new Command();

// CLI info
const VERSION = '1.0.0';

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
  .option('-d, --desc <description>', 'Task description (Markdown supported)')
  .option('-p, --priority <P0|P1|P2|P3>', 'Task priority', 'P2')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--tag <tags>', 'Alias for --tags')
  .option('--depends <tasks>', 'Comma-separated task IDs this task depends on')
  .option('-e, --estimate <hours>', 'Estimated hours')
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
  .action(next);

// Done command
program
  .command('done')
  .description('Complete current task')
  .option('-h, --hours <number>', 'Hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .action(done);

// Complete specific task
program
  .command('complete <taskId>')
  .description('Complete a specific task')
  .option('-h, --hours <number>', 'Hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .action(completeTask);

// Import command
program
  .command('import <file>')
  .description('Import tasks from markdown file')
  .option('--dry-run', 'Preview tasks without importing')
  .option('-f, --force', 'Ignore validation warnings')
  .action(importTasks);

// New chat first round command
program
  .command('newchatfirstround')
  .alias('ncfr')
  .description('Show project context for new AI chat session')
  .option('--show-paths', 'Show full file paths')
  .action(newchatfirstround);


// Dependencies command
program  .command('deps')  .description('Show task dependencies')  .argument('[taskId]', 'Task ID (optional)')  .option('--graph', 'Show dependency graph as Mermaid')  .option('--json', 'Output as JSON')  .action(deps);

// Parse arguments
program.parse();
