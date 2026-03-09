import { RPC_SHELL_CAPABILITIES_SCHEMA_VERSION, RPC_SHELL_SCHEMA_VERSION, RPC_SHELL_SURFACES } from '../../../shared/constants/integration.js';
import { CONTEXT_PRIORITY_STRATEGIES, CONTEXT_PRIORITY_TIERS } from '../../../shared/constants/context-priority.js';
import { resolveWorkspaceMode } from './workspace-mode.js';
import { buildApiFirstContext } from './apifirst-context.js';
import { ContractRegistry } from './contract-registry.js';

function formatTask(task) {
  if (!task) {
    return null;
  }

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

export async function buildRpcShellPayload(manager, surface, targetId = null) {
  const modeInfo = await resolveWorkspaceMode(manager.storage);
  const workspace = await manager.storage.getWorkspaceInfo(manager.getTasks().length);
  const capabilities = {
    schemaVersion: RPC_SHELL_CAPABILITIES_SCHEMA_VERSION,
    mode: modeInfo.mode,
    requestedMode: modeInfo.requestedMode,
    compatibility: modeInfo.compatibility,
    capabilities: modeInfo.capabilities,
    supportedSurfaces: Object.values(RPC_SHELL_SURFACES),
  };
  const base = {
    schemaVersion: RPC_SHELL_SCHEMA_VERSION,
    surface,
    capabilities,
    workspace: {
      path: workspace.path,
      name: workspace.name,
      gitBranch: workspace.gitBranch,
      mode: modeInfo.mode,
      requestedMode: modeInfo.requestedMode,
    },
  };

  if (surface === RPC_SHELL_SURFACES.WORKSPACE) {
    const currentTask = manager.getCurrentTask();
    const nextTask = manager.getNextTask();
    const apiFirstContext = await buildApiFirstContext(manager, modeInfo, currentTask || nextTask);
    return {
      ...base,
      contextPriority: apiFirstContext?.contextPriority || null,
      currentTask: formatTask(currentTask),
      nextTask: formatTask(nextTask),
      currentContract: apiFirstContext?.currentContract || null,
      relatedContracts: apiFirstContext?.relatedContracts || [],
    };
  }

  if (surface === RPC_SHELL_SURFACES.TASK) {
    const task = manager.getTask(targetId);
    if (!task) {
      throw new Error(`Task not found: ${targetId}`);
    }
    const apiFirstContext = await buildApiFirstContext(manager, modeInfo, task);
    return {
      ...base,
      task: formatTask(task),
      contextPriority: apiFirstContext?.contextPriority || null,
      currentContract: apiFirstContext?.currentContract || null,
      relatedContracts: apiFirstContext?.relatedContracts || [],
      contractReminders: apiFirstContext?.contractReminders || [],
    };
  }

  if (surface === RPC_SHELL_SURFACES.CONTRACT) {
    const registry = new ContractRegistry(manager.storage);
    const contract = await registry.getContract(targetId);
    const relatedTasks = manager.getTasks()
      .filter(task => (task.contractIds || []).includes(targetId))
      .map(formatTask);

    return {
      ...base,
      contextPriority: {
        strategy: CONTEXT_PRIORITY_STRATEGIES.CONTRACT_FIRST,
        primarySection: 'contract',
        activeSections: [
          {
            section: 'contract',
            rank: 1,
            tier: CONTEXT_PRIORITY_TIERS.PRIMARY,
            state: 'present',
            reason: 'explicit-contract-shell',
          },
          {
            section: 'relatedTasks',
            rank: 2,
            tier: CONTEXT_PRIORITY_TIERS.SECONDARY,
            state: relatedTasks.length > 0 ? 'present' : 'empty',
            reason: relatedTasks.length > 0 ? 'contract-linked-task-group' : 'empty',
          },
        ],
        suppressedSections: relatedTasks.length > 0 ? [] : [
          {
            section: 'relatedTasks',
            tier: CONTEXT_PRIORITY_TIERS.SECONDARY,
            reason: 'empty',
          },
        ],
      },
      contract,
      relatedTasks,
    };
  }

  throw new Error(`Unsupported RPC shell surface: ${surface}`);
}
