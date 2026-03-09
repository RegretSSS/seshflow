import path from 'node:path';
import fs from 'fs-extra';
import { ContractRegistry } from './contract-registry.js';
import { CONTRACT_CHECK_CODES } from '../../../shared/constants/contracts.js';

function createReminder({ code, level = 'warn', taskId, contractId = null, message, details = null }) {
  return {
    code,
    level,
    taskId,
    contractId,
    message,
    details,
  };
}

export async function collectTaskContractReminders(manager, task, options = {}) {
  if (!task) {
    return [];
  }

  const registry = options.registry || new ContractRegistry(manager.storage);
  const reminders = [];
  const workspacePath = manager.storage.getWorkspacePath();
  const contractIds = [...new Set((task.contractIds || []).filter(Boolean))];

  for (const contractId of contractIds) {
    let contract = null;
    try {
      contract = await registry.getContract(contractId);
    } catch {
      reminders.push(createReminder({
        code: CONTRACT_CHECK_CODES.MISSING_BOUND_CONTRACT,
        level: 'error',
        taskId: task.id,
        contractId,
        message: `Task ${task.id} is bound to missing contract ${contractId}`,
      }));
      continue;
    }

    if (Array.isArray(contract.openQuestions) && contract.openQuestions.length > 0 && task.contractRole !== 'reviewer') {
      reminders.push(createReminder({
        code: CONTRACT_CHECK_CODES.OPEN_CONTRACT_QUESTIONS,
        level: 'warn',
        taskId: task.id,
        contractId,
        message: `Task ${task.id} has ${contract.openQuestions.length} unresolved contract question(s) on ${contractId}`,
        details: {
          questionIds: contract.openQuestions.map(question => question.id),
        },
      }));
    }
  }

  for (const filePath of [...new Set((task.boundFiles || []).filter(Boolean))]) {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(workspacePath, filePath);
    if (!(await fs.pathExists(resolvedPath))) {
      reminders.push(createReminder({
        code: CONTRACT_CHECK_CODES.BOUND_FILE_MISSING,
        level: 'warn',
        taskId: task.id,
        message: `Bound file does not exist for task ${task.id}: ${filePath}`,
        details: {
          filePath,
        },
      }));
    }
  }

  return reminders;
}

export async function collectWorkspaceContractReminders(manager) {
  const registry = new ContractRegistry(manager.storage);
  const reminders = [];

  for (const task of manager.getTasks()) {
    const taskReminders = await collectTaskContractReminders(manager, task, { registry });
    reminders.push(...taskReminders);
  }

  return reminders;
}

export async function collectContractScopedReminders(manager, contractIds = [], options = {}) {
  const uniqueContractIds = [...new Set((contractIds || []).filter(Boolean))];
  if (uniqueContractIds.length === 0) {
    return [];
  }

  const registry = options.registry || new ContractRegistry(manager.storage);
  const reminders = [];
  const seen = new Set();
  const relatedTasks = manager.getTasks().filter(task =>
    (task.contractIds || []).some(contractId => uniqueContractIds.includes(contractId))
  );

  for (const task of relatedTasks) {
    const taskReminders = await collectTaskContractReminders(manager, task, { registry });
    for (const reminder of taskReminders) {
      const key = JSON.stringify([
        reminder.code,
        reminder.taskId,
        reminder.contractId,
        reminder.message,
      ]);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      reminders.push(reminder);
    }
  }

  return reminders;
}
