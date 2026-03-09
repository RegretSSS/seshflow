import { ContractRegistry } from './contract-registry.js';
import { WORKSPACE_MODES } from '../../../shared/constants/modes.js';
import { collectContractScopedReminders, collectTaskContractReminders, summarizeContractReminders } from './contract-reminders.js';

function summarizeContract(contract) {
  return {
    id: contract.id,
    version: contract.version,
    kind: contract.kind,
    protocol: contract.protocol,
    name: contract.name,
    endpoint: contract.endpoint || null,
    rpc: contract.rpc || null,
    owner: contract.owner || null,
    lifecycle: contract.lifecycle || null,
  };
}

function taskSummary(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    contractIds: task.contractIds || [],
    contractRole: task.contractRole || null,
    boundFiles: task.boundFiles || [],
  };
}

export async function buildApiFirstContext(manager, modeInfo, focusTask = null) {
  if (modeInfo.mode !== WORKSPACE_MODES.APIFIRST) {
    return null;
  }

  const primaryTask = focusTask || manager.getCurrentTask() || manager.getNextTask();
  if (!primaryTask || !Array.isArray(primaryTask.contractIds) || primaryTask.contractIds.length === 0) {
    return {
      currentContract: null,
      relatedContracts: [],
      openContractQuestions: [],
      relatedTasks: [],
      primaryContractId: null,
      contractReminders: [],
    };
  }

  const registry = new ContractRegistry(manager.storage);
  const contractIds = [...new Set(primaryTask.contractIds.filter(Boolean))];
  const contracts = [];

  for (const contractId of contractIds) {
    try {
      contracts.push(await registry.getContract(contractId));
    } catch {
      // Drift detection belongs to the next milestone; keep context generation tolerant.
    }
  }

  const primaryContract = contracts[0] || null;
  const relatedTasks = primaryContract
    ? manager.getTasks()
      .filter(task => (task.contractIds || []).includes(primaryContract.id))
      .map(taskSummary)
    : [];
  const contractReminders = primaryContract
    ? await collectContractScopedReminders(manager, [primaryContract.id], { registry })
    : await collectTaskContractReminders(manager, primaryTask, { registry });
  const reminderSummary = summarizeContractReminders(contractReminders);

  return {
    currentContract: primaryContract ? summarizeContract(primaryContract) : null,
    relatedContracts: contracts.map(summarizeContract),
    openContractQuestions: primaryContract?.openQuestions || [],
    relatedTasks,
    primaryContractId: primaryContract?.id || null,
    contractReminders,
    contractReminderSummary: reminderSummary,
  };
}
