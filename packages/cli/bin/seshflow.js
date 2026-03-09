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
import { suspend } from '../src/commands/suspend.js';
import { record } from '../src/commands/record.js';
import { addProcess, listProcesses } from '../src/commands/process.js';
import { addDependency, removeDependency } from '../src/commands/dependency-mutation.js';
import { announceProgress } from '../src/commands/announce.js';
import { spawnSync } from 'node:child_process';

const program = new Command();

function configureWindowsUtf8() {
  if (process.platform !== 'win32') {
    return;
  }

  try {
    spawnSync(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', 'chcp 65001 >NUL'], {
      stdio: 'ignore',
      windowsHide: true
    });
  } catch {
    // Best-effort only. Seshflow still runs if the terminal cannot be adjusted.
  }
}

configureWindowsUtf8();

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
  .command('done [taskId]')
  .description('Complete current task or a specific task by ID')
  .option('-h, --hours <number>', 'Advanced: hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action((taskId, options) => {
    if (typeof taskId === 'string') {
      return done(taskId, options);
    }

    return done(options || taskId);
  });

// Complete specific task (compatibility alias)
program
  .command('complete <taskId>')
  .description('Alias of done <taskId>')
  .option('-h, --hours <number>', 'Advanced: hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(completeTask);

// Start specific task
program
  .command('start <taskId>')
  .description('Start a specific task (set in-progress)')
  .option('-f, --force', 'Force start even with active session or unmet dependencies')
  .option('-s, --switch', 'Suspend the current task first if another session is active')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(start);

// Skip current task
program
  .command('skip')
  .description('Skip current task and return it to todo')
  .option('-r, --reason <text>', 'Reason for skipping')
  .option('-n, --note <text>', 'Alias for --reason')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(skip);

// Suspend current task
program
  .command('suspend')
  .description('Suspend current task and return it to todo')
  .option('-r, --reason <text>', 'Reason for suspending')
  .option('-n, --note <text>', 'Alias for --reason')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action(suspend);

program
  .command('record [taskId]')
  .description('Record runtime context for a task')
  .option('-c, --command <command>', 'Executed command')
  .option('--cwd <path>', 'Working directory used')
  .option('--log <path>', 'Log file path')
  .option('--output-root <path>', 'Output root directory')
  .option('--artifact <paths>', 'Comma-separated artifact paths')
  .option('-n, --note <text>', 'Note for this runtime step')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .action((taskId, options) => {
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return record(resolvedTaskId, resolvedOptions);
  });

const processCommand = program
  .command('process')
  .description('Register and inspect task-scoped background processes');

const announceCommand = program
  .command('announce')
  .description('Emit task-scoped announcement events');

announceCommand
  .command('progress [taskId]')
  .description('Emit a progress announcement for a task or the current active task')
  .option('-p, --percent <number>', 'Progress percentage')
  .option('-n, --note <text>', 'Progress note')
  .option('--json', 'Output as JSON')
  .action((taskId, options) => {
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return announceProgress(resolvedTaskId, resolvedOptions);
  });

processCommand
  .command('add [taskId]')
  .description('Register a background process for a task')
  .requiredOption('--pid <pid>', 'Process ID')
  .option('-c, --command <command>', 'Launch command')
  .option('--cwd <path>', 'Working directory used')
  .option('--output-root <path>', 'Output root directory')
  .option('-n, --note <text>', 'Note for this process')
  .option('--state <running|missing|exited|unknown>', 'Explicit initial state')
  .option('--json', 'Output as JSON')
  .action((taskId, options) => {
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return addProcess(resolvedTaskId, resolvedOptions);
  });

processCommand
  .command('list [taskId]')
  .description('List background processes for a task')
  .option('--refresh', 'Refresh liveness state before output')
  .option('-l, --limit <number>', 'Limit number of entries displayed')
  .option('--json', 'Output as JSON')
  .action((taskId, options) => {
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return listProcesses(resolvedTaskId, resolvedOptions);
  });

program
  .command('add-dep <taskId> <dependsOnTaskId>')
  .alias('add-dependency')
  .description('Add a task dependency')
  .option('--json', 'Output as JSON')
  .action(addDependency);

program
  .command('remove-dep <taskId> <dependsOnTaskId>')
  .alias('remove-dependency')
  .description('Remove a task dependency')
  .option('--json', 'Output as JSON')
  .action(removeDependency);

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
  .alias('context')
  .alias('resume')
  .description('Show project context for new AI chat session')
  .option('--full', 'Include extended context (dependents, blocked snapshot, recent completions, paths)')
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
  .option('--full', 'Include full task payloads in JSON output')
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
  .option('--full', 'Include full task payloads in JSON output')
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
  .option('--add-dep <taskIds>', 'Comma-separated dependency task IDs to add')
  .option('--remove-dep <taskIds>', 'Comma-separated dependency task IDs to remove')
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
  .option('--json', 'Alias for --format json')
  .action(exportTasks);

// Validate command
program
  .command('validate <file>')
  .description('Validate markdown task file before import')
  .action(validateMarkdown);

// Parse arguments
program.parse();
