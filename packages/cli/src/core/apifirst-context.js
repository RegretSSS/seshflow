import { ContractRegistry } from './contract-registry.js';
import { WORKSPACE_MODES } from '../../../shared/constants/modes.js';
import { collectContractScopedReminders, collectTaskContractReminders, summarizeContractReminders } from './contract-reminders.js';
import { CONTEXT_PRIORITY_STRATEGIES, CONTEXT_PRIORITY_TIERS } from '../../../shared/constants/context-priority.js';
import { omitEmptyFields } from '../utils/helpers.js';

function summarizeContract(contract) {
  return omitEmptyFields({
    id: contract.id,
    version: contract.version,
    kind: contract.kind,
    protocol: contract.protocol,
    name: contract.name,
    endpoint: contract.endpoint,
    rpc: contract.rpc,
    owner: contract.owner,
    lifecycle: contract.lifecycle,
    metadata: contract.metadata,
    extensions: contract.extensions,
    payload: contract.payload,
  });
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

function buildContextPriority({
  hasCurrentContract,
  hasContractReminders,
  hasOpenContractQuestions,
  hasRelatedTasks,
  hasRelatedContracts,
}) {
  const activeSections = [];
  const suppressedSections = [];

  const sectionSpecs = [
    {
      section: 'currentContract',
      rank: 1,
      tier: CONTEXT_PRIORITY_TIERS.PRIMARY,
      present: hasCurrentContract,
      reason: 'focus-task-bound-contract',
    },
    {
      section: 'contractReminders',
      rank: 2,
      tier: CONTEXT_PRIORITY_TIERS.PRIMARY,
      present: hasContractReminders,
      reason: 'active-contract-reminders',
    },
    {
      section: 'openContractQuestions',
      rank: 3,
      tier: CONTEXT_PRIORITY_TIERS.SECONDARY,
      present: hasOpenContractQuestions,
      reason: 'unresolved-contract-questions',
    },
    {
      section: 'relatedTasks',
      rank: 4,
      tier: CONTEXT_PRIORITY_TIERS.SECONDARY,
      present: hasRelatedTasks,
      reason: 'contract-linked-task-group',
    },
    {
      section: 'relatedContracts',
      rank: 5,
      tier: CONTEXT_PRIORITY_TIERS.SUPPLEMENTAL,
      present: hasRelatedContracts,
      reason: 'additional-bound-contracts',
    },
  ];

  for (const spec of sectionSpecs) {
    if (spec.present) {
      activeSections.push({
        section: spec.section,
        rank: spec.rank,
        tier: spec.tier,
        state: 'present',
        reason: spec.reason,
      });
    } else {
      suppressedSections.push({
        section: spec.section,
        tier: spec.tier,
        reason: 'empty',
      });
    }
  }

  return {
    strategy: CONTEXT_PRIORITY_STRATEGIES.CONTRACT_FIRST,
    primarySection: 'currentContract',
    activeSections,
    suppressedSections,
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
      contractReminderSummary: summarizeContractReminders([]),
      contextPriority: buildContextPriority({
        hasCurrentContract: false,
        hasContractReminders: false,
        hasOpenContractQuestions: false,
        hasRelatedTasks: false,
        hasRelatedContracts: false,
      }),
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
  const contextPriority = buildContextPriority({
    hasCurrentContract: Boolean(primaryContract),
    hasContractReminders: contractReminders.length > 0,
    hasOpenContractQuestions: (primaryContract?.openQuestions || []).length > 0,
    hasRelatedTasks: relatedTasks.length > 0,
    hasRelatedContracts: contracts.length > 1,
  });

  return {
    currentContract: primaryContract ? summarizeContract(primaryContract) : null,
    relatedContracts: contracts.map(summarizeContract),
    openContractQuestions: primaryContract?.openQuestions || [],
    relatedTasks,
    primaryContractId: primaryContract?.id || null,
    contractReminders,
    contractReminderSummary: reminderSummary,
    contextPriority,
  };
}
