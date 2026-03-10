import path from 'path';
import { existsSync } from 'fs';
import { PATHS } from '../constants.js';
import { Storage } from '../core/storage.js';
import { formatSuccessResponse, outputJSON, isJSONMode } from './json-output.js';
import { omitEmptyFields } from './helpers.js';

function buildWorkspaceSummary(probe) {
  return omitEmptyFields({
    path: probe.workspacePath,
    name: path.basename(probe.workspacePath) || undefined,
    source: probe.source,
    sourcePath: probe.source !== 'cwd' ? probe.sourcePath : undefined,
    state: probe.partial ? 'partial' : 'uninitialized',
  });
}

export function probeWorkspaceInitialization(startPath = process.cwd()) {
  const resolution = Storage.resolveWorkspace(startPath);
  const workspacePath = resolution.path;
  const seshflowDir = path.join(workspacePath, PATHS.SEHSFLOW_DIR);
  const tasksFile = path.join(workspacePath, PATHS.TASKS_FILE);
  const configFile = path.join(workspacePath, PATHS.CONFIG_FILE);

  const hasSeshflowDir = existsSync(seshflowDir);
  const hasTasksFile = existsSync(tasksFile);
  const hasConfigFile = existsSync(configFile);
  const initialized = hasTasksFile || hasConfigFile;
  const partial = hasSeshflowDir && !initialized;

  return {
    ...resolution,
    workspacePath,
    seshflowDir,
    tasksFile,
    configFile,
    hasSeshflowDir,
    hasTasksFile,
    hasConfigFile,
    initialized,
    partial,
  };
}

function printBootstrapHint(probe) {
  const label = probe.partial ? 'Workspace bootstrap is incomplete.' : 'Workspace is not initialized.';
  console.log(label);
  console.log('Run one of these first:');
  console.log('  seshflow init');
  console.log('  seshflow init contractfirst');
  if (probe.partial) {
    console.log('If partial files already exist, use --force to complete bootstrap.');
  }
}

export function handleBootstrapProbe(options = {}, startPath = process.cwd()) {
  const probe = probeWorkspaceInitialization(startPath);
  if (probe.initialized) {
    return null;
  }

  if (isJSONMode(options)) {
    outputJSON(formatSuccessResponse({
      workspaceState: probe.partial ? 'partial' : 'uninitialized',
      focus: 'bootstrap',
      hint: 'Run `seshflow init` or `seshflow init contractfirst` first.',
      bootstrapCommands: ['seshflow init', 'seshflow init contractfirst'],
    }, buildWorkspaceSummary(probe)));
  } else {
    printBootstrapHint(probe);
  }

  return probe;
}

export function handlePreInitGuard(commandName, options = {}, startPath = process.cwd()) {
  const probe = probeWorkspaceInitialization(startPath);
  if (probe.initialized) {
    return null;
  }

  const message = 'Workspace is not initialized. Run `seshflow init` or `seshflow init contractfirst` first.';

  if (isJSONMode(options)) {
    outputJSON({
      success: false,
      error: {
        code: 'WORKSPACE_NOT_INITIALIZED',
        message,
        command: commandName,
        timestamp: new Date().toISOString(),
      },
      workspaceState: probe.partial ? 'partial' : 'uninitialized',
      bootstrapCommands: ['seshflow init', 'seshflow init contractfirst'],
      workspace: buildWorkspaceSummary(probe),
    });
  } else {
    console.error(message);
    console.error('Run one of these first:');
    console.error('  seshflow init');
    console.error('  seshflow init contractfirst');
    if (probe.partial) {
      console.error('If partial files already exist, use --force to complete bootstrap.');
    }
  }

  return probe;
}
