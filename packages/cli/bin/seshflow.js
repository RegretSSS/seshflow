#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from '../src/commands/init.js';
import { add } from '../src/commands/add.js';
import { next } from '../src/commands/next.js';
import { done, completeTask } from '../src/commands/done.js';

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

// Parse arguments
program.parse();
