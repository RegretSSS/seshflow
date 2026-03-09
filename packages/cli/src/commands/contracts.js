import chalk from 'chalk';
import ora from 'ora';
import { Storage } from '../core/storage.js';
import { ContractRegistry } from '../core/contract-registry.js';
import { TaskManager } from '../core/task-manager.js';
import { collectWorkspaceContractReminders } from '../core/contract-reminders.js';
import {
  formatErrorResponse,
  formatSuccessResponse,
  formatWorkspaceJSON,
  isJSONMode,
  outputJSON,
} from '../utils/json-output.js';

function printContractSummary(summary) {
  console.log(`CONTRACT | ${summary.id} | ${summary.kind} | ${summary.version} | ${summary.name}`);
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

  return {
    boundTasks,
    dependencyChains: boundTasks.flatMap(task =>
      (task.dependencies || []).map(depId => ({
        fromTaskId: depId,
        toTaskId: task.id,
      }))
    ),
  };
}

export async function addContract(file, options = {}) {
  const spinner = (!isJSONMode(options) && process.stdout.isTTY) ? ora('Registering contract').start() : null;

  try {
    const storage = new Storage();
    await storage.init();
    const registry = new ContractRegistry(storage);
    const result = await registry.addContractFromFile(file);
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
      outputJSON(formatErrorResponse(error, error.code || 'CONTRACT_ADD_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
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
        contract,
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
