import chalk from 'chalk';
import ora from 'ora';
import { Storage } from '../core/storage.js';
import { ContractRegistry } from '../core/contract-registry.js';
import { TaskManager } from '../core/task-manager.js';
import { collectWorkspaceContractReminders } from '../core/contract-reminders.js';
import { WorkspaceEventService } from '../core/workspace-event-service.js';
import {
  formatErrorResponse,
  formatSuccessResponse,
  formatWorkspaceJSON,
  isJSONMode,
  outputJSON,
} from '../utils/json-output.js';
import { INTEGRATION_EVENT_TYPES } from '../../../shared/constants/integration.js';
import { omitEmptyFields } from '../utils/helpers.js';

function printContractSummary(summary) {
  console.log(`CONTRACT | ${summary.id} | ${summary.kind} | ${summary.version} | ${summary.name}`);
}

function buildDependencyView(boundTasks) {
  const taskMap = new Map(boundTasks.map(task => [task.id, task]));
  const internalEdges = [];
  const externalDependencies = [];

  for (const task of boundTasks) {
    for (const depId of task.dependencies || []) {
      if (taskMap.has(depId)) {
        internalEdges.push({
          fromTaskId: depId,
          toTaskId: task.id,
          relation: 'intra-contract',
        });
      } else {
        externalDependencies.push({
          fromTaskId: depId,
          toTaskId: task.id,
          relation: 'cross-contract',
        });
      }
    }
  }

  const indegree = new Map(boundTasks.map(task => [task.id, 0]));
  const outgoing = new Map(boundTasks.map(task => [task.id, []]));

  for (const edge of internalEdges) {
    indegree.set(edge.toTaskId, (indegree.get(edge.toTaskId) || 0) + 1);
    outgoing.get(edge.fromTaskId).push(edge.toTaskId);
  }

  const ready = boundTasks
    .map(task => task.id)
    .filter(taskId => (indegree.get(taskId) || 0) === 0)
    .sort();
  const topologicalOrder = [];

  while (ready.length > 0) {
    const taskId = ready.shift();
    topologicalOrder.push(taskId);
    for (const dependentId of outgoing.get(taskId) || []) {
      indegree.set(dependentId, (indegree.get(dependentId) || 1) - 1);
      if ((indegree.get(dependentId) || 0) === 0) {
        ready.push(dependentId);
        ready.sort();
      }
    }
  }

  return {
    dependencyChains: internalEdges.sort((left, right) =>
      `${left.fromTaskId}:${left.toTaskId}`.localeCompare(`${right.fromTaskId}:${right.toTaskId}`)
    ),
    dependencySummary: {
      taskCount: boundTasks.length,
      internalEdgeCount: internalEdges.length,
      externalDependencyCount: externalDependencies.length,
      topologicalOrder,
      externalDependencies: externalDependencies.sort((left, right) =>
        `${left.fromTaskId}:${left.toTaskId}`.localeCompare(`${right.fromTaskId}:${right.toTaskId}`)
      ),
    },
  };
}

function buildContractTaskBindings(manager, contractId) {
  const boundTasks = manager.getTasks()
    .filter(task => (task.contractIds || []).includes(contractId))
    .map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      contractRole: task.contractRole || null,
      boundFiles: task.boundFiles || [],
      dependencies: (task.dependencies || []).filter(depId =>
        manager.getTask(depId)?.contractIds?.includes(contractId)
      ),
    }));

  const dependencyView = buildDependencyView(boundTasks);

  return {
    boundTasks,
    dependencyChains: dependencyView.dependencyChains,
    dependencySummary: dependencyView.dependencySummary,
  };
}

function formatContractValidationError(error, registry) {
  const base = formatErrorResponse(error, error.code || 'CONTRACT_ADD_FAILED');
  if (!error.issues) {
    return base;
  }

  base.error.issues = error.issues;
  base.error.issueCount = error.issues.length;
  base.error.examples = registry.getStarterExamplePaths();
  base.error.hints = error.issues.map(issue => issue.message);
  return base;
}

export async function addContract(file, options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Registering contract').start() : null;

  try {
    const storage = new Storage();
    await storage.init();
    const registry = new ContractRegistry(storage);
    const result = await registry.addContractFromFile(file);
    const manager = new TaskManager(storage.getWorkspacePath());
    await manager.init();
    const eventService = new WorkspaceEventService(manager);
    await eventService.emit(INTEGRATION_EVENT_TYPES.CONTRACT_CHANGED, {
      contractId: result.contract.id,
      message: result.existed
        ? `Contract updated: ${result.contract.id}`
        : `Contract registered: ${result.contract.id}`,
      existed: result.existed,
      changed: result.changed,
    });
    await manager.saveData();
    spinner?.succeed('Contract registered');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'contracts.add',
        changed: result.changed,
        existed: result.existed,
        contract: result.contract,
        storedPath: result.storedPath,
      }, workspace));
      return;
    }

    printContractSummary(registry.summarizeContract(result.contract));
  } catch (error) {
    spinner?.fail('Failed to register contract');
    if (isJSONMode(options)) {
      const storage = new Storage();
      await storage.init();
      const registry = new ContractRegistry(storage);
      outputJSON(formatContractValidationError(error, registry));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
      if (Array.isArray(error.issues) && error.issues.length > 0) {
        error.issues.forEach(issue => {
          console.error(chalk.gray(`  - ${issue.message}`));
        });
        const examples = new ContractRegistry(new Storage()).getStarterExamplePaths();
        console.error(chalk.gray(`  Examples: ${examples.api} | ${examples.rpc}`));
      }
    }
    process.exit(1);
  }
}

export async function importContracts(file, options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Importing contracts').start() : null;

  try {
    const storage = new Storage();
    await storage.init();
    const registry = new ContractRegistry(storage);
    const result = await registry.importContractsFromFile(file);
    const manager = new TaskManager(storage.getWorkspacePath());
    await manager.init();
    const eventService = new WorkspaceEventService(manager);

    for (const entry of result.results) {
      if (!entry.changed && entry.existed) {
        continue;
      }

      await eventService.emit(INTEGRATION_EVENT_TYPES.CONTRACT_CHANGED, {
        contractId: entry.contract.id,
        message: entry.existed
          ? `Contract updated: ${entry.contract.id}`
          : `Contract registered: ${entry.contract.id}`,
        existed: entry.existed,
        changed: entry.changed,
      });
    }

    await manager.saveData();
    spinner?.succeed('Contracts imported');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'contracts.import',
        importedCount: result.importedCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        unchangedCount: result.unchangedCount,
        contracts: result.results.map(entry => registry.summarizeContract(entry.contract)),
      }, workspace));
      return;
    }

    console.log(`CONTRACT_IMPORT | imported=${result.importedCount} | created=${result.createdCount} | updated=${result.updatedCount} | unchanged=${result.unchangedCount}`);
  } catch (error) {
    spinner?.fail('Failed to import contracts');
    if (isJSONMode(options)) {
      const storage = new Storage();
      await storage.init();
      const registry = new ContractRegistry(storage);
      outputJSON(formatContractValidationError(error, registry));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
      if (Array.isArray(error.issues) && error.issues.length > 0) {
        error.issues.forEach(issue => {
          console.error(chalk.gray(`  - ${issue.message}`));
        });
      }
    }
    process.exit(1);
  }
}

export async function listContracts(options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Loading contracts').start() : null;

  try {
    const storage = new Storage();
    await storage.init();
    const registry = new ContractRegistry(storage);
    const contracts = await registry.listContracts();
    const summaries = contracts.map(contract => registry.summarizeContract(contract));
    spinner?.succeed('Contracts loaded');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'contracts.list',
        contracts: summaries,
        total: summaries.length,
      }, workspace));
      return;
    }

    if (summaries.length === 0) {
      console.log('NO_CONTRACTS');
      return;
    }

    summaries.forEach(printContractSummary);
  } catch (error) {
    spinner?.fail('Failed to load contracts');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, error.code || 'CONTRACT_LIST_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

export async function showContract(contractId, options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Loading contract').start() : null;

  try {
    const storage = new Storage();
    await storage.init();
    const registry = new ContractRegistry(storage);
    const contract = await registry.getContract(contractId);
    const manager = new TaskManager(storage.getWorkspacePath());
    await manager.init();
    const bindings = buildContractTaskBindings(manager, contractId);
    spinner?.succeed('Contract loaded');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'contracts.show',
        contract: omitEmptyFields(contract),
        ...bindings,
      }, workspace));
      return;
    }

    printContractSummary(registry.summarizeContract(contract));
    if (bindings.boundTasks.length > 0) {
      console.log(chalk.gray(`BOUND_TASKS | ${bindings.boundTasks.length}`));
    }
  } catch (error) {
    spinner?.fail('Failed to load contract');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'CONTRACT_NOT_FOUND'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}

export async function checkContracts(options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Checking contracts').start() : null;

  try {
    const storage = new Storage();
    await storage.init();
    const registry = new ContractRegistry(storage);
    const result = await registry.checkContracts();
    const manager = new TaskManager(storage.getWorkspacePath());
    await manager.init();
    const reminders = await collectWorkspaceContractReminders(manager);
    const eventService = new WorkspaceEventService(manager);
    for (const reminder of reminders) {
      await eventService.emit(INTEGRATION_EVENT_TYPES.CONTRACT_DRIFT_DETECTED, {
        taskId: reminder.taskId,
        contractId: reminder.contractId,
        level: reminder.level,
        status: 'detected',
        message: reminder.message,
        reminderCode: reminder.code,
      });
    }
    if (reminders.length > 0) {
      await manager.saveData();
    }
    spinner?.succeed('Contracts checked');

    if (isJSONMode(options)) {
      const workspace = await formatWorkspaceJSON(storage);
      outputJSON(formatSuccessResponse({
        action: 'contracts.check',
        ...result,
        reminders,
        reminderCount: reminders.length,
      }, workspace));
      return;
    }

    if (result.issues.length === 0 && reminders.length === 0) {
      console.log(`CONTRACT_CHECK | ok | checked=${result.contractsChecked}`);
      return;
    }

    result.issues.forEach(issue => {
      console.log(`CONTRACT_ISSUE | ${issue.code} | ${issue.message}`);
    });
    reminders.forEach(reminder => {
      console.log(`CONTRACT_REMINDER | ${reminder.code} | ${reminder.message}`);
    });
  } catch (error) {
    spinner?.fail('Failed to check contracts');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, error.code || 'CONTRACT_CHECK_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
