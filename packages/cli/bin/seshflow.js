#!/usr/bin/env node

import { Command } from 'commander';
import { spawnSync } from 'node:child_process';

const VERSION = '1.2.0';
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

function lazyAction(importer, exportName) {
  return async (...args) => {
    const mod = await importer();
    return mod[exportName](...args);
  };
}

configureWindowsUtf8();

program
  .name('seshflow')
  .description('Seshflow - AI development runtime control plane')
  .version(VERSION);

program
  .command('init [mode]')
  .description('Initialize seshflow workspace')
  .option('-f, --force', 'Reinitialize even if already initialized')
  .action(async (mode, options) => {
    const mod = await import('../src/commands/init.js');
    const resolvedMode = typeof mode === 'string' ? mode : 'default';
    const resolvedOptions = typeof mode === 'string' ? options : mode;
    return mod.init(resolvedMode, resolvedOptions);
  });

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
  .option('--contracts <contractIds>', 'Comma-separated contract IDs')
  .option('--contract-role <producer|consumer|reviewer>', 'Contract role for this task')
  .option('--bind-file <paths>', 'Comma-separated implementation file paths')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/add.js'), 'add'));

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
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/next.js'), 'next'));

program
  .command('done [taskId]')
  .description('Complete current task or a specific task by ID')
  .option('-h, --hours <number>', 'Advanced: hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(async (taskId, options) => {
    const mod = await import('../src/commands/done.js');
    if (typeof taskId === 'string') {
      return mod.done(taskId, options);
    }
    return mod.done(options || taskId);
  });

program
  .command('complete <taskId>')
  .description('Alias of done <taskId>')
  .option('-h, --hours <number>', 'Advanced: hours spent')
  .option('-n, --note <text>', 'Completion notes')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/done.js'), 'completeTask'));

program
  .command('start <taskId>')
  .description('Start a specific task (set in-progress)')
  .option('-f, --force', 'Force start even with active session or unmet dependencies')
  .option('-s, --switch', 'Suspend the current task first if another session is active')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/start.js'), 'start'));

program
  .command('skip')
  .description('Skip current task and return it to todo')
  .option('-r, --reason <text>', 'Reason for skipping')
  .option('-n, --note <text>', 'Alias for --reason')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/skip.js'), 'skip'));

program
  .command('suspend')
  .description('Suspend current task and return it to todo')
  .option('-r, --reason <text>', 'Reason for suspending')
  .option('-n, --note <text>', 'Alias for --reason')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/suspend.js'), 'suspend'));

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
  .option('--no-json', 'Disable JSON output')
  .action(async (taskId, options) => {
    const mod = await import('../src/commands/record.js');
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return mod.record(resolvedTaskId, resolvedOptions);
  });

const processCommand = program
  .command('process')
  .description('Register and inspect task-scoped background processes');

const announceCommand = program
  .command('announce')
  .description('Emit task-scoped announcement events');

const contractsCommand = program
  .command('contracts')
  .description('Manage API/RPC contracts for api-first workspaces');

const modeCommand = program
  .command('mode')
  .description('Inspect or update workspace mode');

announceCommand
  .command('progress [taskId]')
  .description('Emit a progress announcement for a task or the current active task')
  .option('-p, --percent <number>', 'Progress percentage')
  .option('-n, --note <text>', 'Progress note')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(async (taskId, options) => {
    const mod = await import('../src/commands/announce.js');
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return mod.announceProgress(resolvedTaskId, resolvedOptions);
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
  .option('--no-json', 'Disable JSON output')
  .action(async (taskId, options) => {
    const mod = await import('../src/commands/process.js');
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return mod.addProcess(resolvedTaskId, resolvedOptions);
  });

processCommand
  .command('list [taskId]')
  .description('List background processes for a task')
  .option('--refresh', 'Refresh liveness state before output')
  .option('-l, --limit <number>', 'Limit number of entries displayed')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(async (taskId, options) => {
    const mod = await import('../src/commands/process.js');
    const resolvedTaskId = typeof taskId === 'string' ? taskId : options;
    const resolvedOptions = typeof taskId === 'string' ? options : taskId;
    return mod.listProcesses(resolvedTaskId, resolvedOptions);
  });

contractsCommand
  .command('add <file>')
  .description('Register a contract from a JSON file')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/contracts.js'), 'addContract'));

contractsCommand
  .command('list')
  .description('List registered contracts')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/contracts.js'), 'listContracts'));

contractsCommand
  .command('show <contractId>')
  .description('Show a registered contract')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/contracts.js'), 'showContract'));

contractsCommand
  .command('check')
  .description('Validate registered contract files')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/contracts.js'), 'checkContracts'));

modeCommand
  .command('set <mode>')
  .description('Set workspace mode')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/mode.js'), 'setMode'));

modeCommand
  .command('show')
  .description('Show current workspace mode')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/mode.js'), 'showMode'));

program
  .command('add-dep <taskId> <dependsOnTaskId>')
  .alias('add-dependency')
  .description('Add a task dependency')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/dependency-mutation.js'), 'addDependency'));

program
  .command('remove-dep <taskId> <dependsOnTaskId>')
  .alias('remove-dependency')
  .description('Remove a task dependency')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/dependency-mutation.js'), 'removeDependency'));

program
  .command('import <file>')
  .description('Import tasks from markdown file')
  .option('--dry-run', 'Preview tasks without importing')
  .option('-f, --force', 'Force create duplicate tasks')
  .option('-u, --update', 'Update existing tasks instead of skipping')
  .option('--verbose', 'Show full imported task details')
  .action(lazyAction(() => import('../src/commands/import.js'), 'importTasks'));

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
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/newchatfirstround.js'), 'newchatfirstround'));

program
  .command('deps')
  .description('Show task dependencies')
  .argument('[taskId]', 'Task ID (optional)')
  .option('--graph', 'Show dependency graph as Mermaid')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/deps.js'), 'deps'));

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
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/query.js'), 'query'));

program
  .command('stats')
  .description('Show task statistics')
  .option('--by-priority', 'Show statistics by priority')
  .option('--by-tags', 'Show statistics by tags')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/stats.js'), 'stats'));

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
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/list.js'), 'list'));

program
  .command('show <taskId>')
  .description('Show task details')
  .option('--full', 'Include recent runtime/process/event history in JSON output')
  .option('--compact', 'Compact output (AI-friendly)')
  .option('--pretty', 'Pretty output (human-friendly)')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/show.js'), 'show'));

program
  .command('delete <taskId>')
  .description('Delete a task')
  .option('-f, --force', 'Force delete without confirmation')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/delete.js'), 'deleteTask'));

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
  .option('--contracts <contractIds>', 'Replace contract bindings with a comma-separated list')
  .option('--bind-contract <contractIds>', 'Comma-separated contract IDs to add')
  .option('--unbind-contract <contractIds>', 'Comma-separated contract IDs to remove')
  .option('--contract-role <producer|consumer|reviewer>', 'Set contract role')
  .option('--bind-file <paths>', 'Comma-separated implementation file paths to add')
  .option('--unbind-file <paths>', 'Comma-separated implementation file paths to remove')
  .option('--hours <hours>', 'Advanced: alias for --estimate')
  .option('-e, --estimate <hours>', 'Advanced: new estimated hours')
  .option('-a, --assignee <name>', 'New assignee')
  .option('-b, --branch <branch>', 'New git branch')
  .option('--json', 'Output as JSON')
  .option('--no-json', 'Disable JSON output')
  .action(lazyAction(() => import('../src/commands/edit.js'), 'edit'));

program
  .command('magic [skillName] [args...]')
  .description('Execute magic commands (Skills) - use --list to see all')
  .option('-l, --list', 'List all available skills')
  .action(async (skillName, args, options) => {
    const mod = await import('../src/commands/magic.js');
    if (options.list || !skillName) {
      await mod.magicList();
    } else {
      await mod.magic(skillName, ...(args || []));
    }
  });

program
  .command('export [output]')
  .description('Export tasks to markdown or json')
  .option('-s, --status <statuses>', 'Filter by status (comma-separated)')
  .option('-p, --priority <priorities>', 'Filter by priority (comma-separated)')
  .option('-f, --format <json|markdown>', 'Export format', 'json')
  .option('--md', 'Alias for --format markdown')
  .option('--json', 'Alias for --format json')
  .action(lazyAction(() => import('../src/commands/export.js'), 'exportTasks'));

program
  .command('validate <file>')
  .description('Validate markdown task file before import')
  .action(lazyAction(() => import('../src/commands/validate.js'), 'validateMarkdown'));

program.parse();
