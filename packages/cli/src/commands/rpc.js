import chalk from 'chalk';
import { TaskManager } from '../core/task-manager.js';
import { buildRpcShellPayload } from '../core/rpc-shell.js';
import { RPC_SHELL_SURFACES } from '../../../shared/constants/integration.js';
import { formatErrorResponse, outputJSON } from '../utils/json-output.js';
import { handlePreInitGuard } from '../utils/workspace-guard.js';

const VALID_SURFACES = new Set(Object.values(RPC_SHELL_SURFACES));

export async function rpcShell(surface = RPC_SHELL_SURFACES.WORKSPACE, targetId = null) {
  try {
    if (!VALID_SURFACES.has(surface)) {
      throw new Error(`Unsupported RPC shell surface: ${surface}`);
    }
    if (handlePreInitGuard('rpc shell', { json: true })) {
      process.exit(1);
    }

    const manager = new TaskManager();
    await manager.init();
    const payload = await buildRpcShellPayload(manager, surface, targetId);
    outputJSON(payload);
  } catch (error) {
    outputJSON(formatErrorResponse(error, 'RPC_SHELL_FAILED'));
    process.exit(1);
  }
}

export function printRpcShellUsage() {
  console.log(chalk.gray('  seshflow rpc shell workspace'));
  console.log(chalk.gray('  seshflow rpc shell task <taskId>'));
  console.log(chalk.gray('  seshflow rpc shell contract <contractId>'));
}
