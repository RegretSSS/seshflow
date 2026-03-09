import { RPC_SHELL_SCHEMA_VERSION, RPC_SHELL_SURFACES } from '../../../shared/constants/integration.js';
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
  const base = {
    schemaVersion: RPC_SHELL_SCHEMA_VERSION,
    surface,
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
      contract,
      relatedTasks,
    };
  }

  throw new Error(`Unsupported RPC shell surface: ${surface}`);
}
