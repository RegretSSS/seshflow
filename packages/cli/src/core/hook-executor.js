import { HOOK_ACTIONS, HOOK_MODES } from '../../../shared/constants/hooks.js';

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Hook timed out after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

export class HookExecutor {
  constructor(manager) {
    this.manager = manager;
  }

  async runHooks(hooks, context = {}) {
    const results = [];

    for (const hook of hooks) {
      const result = await this.runHook(hook, context);
      results.push(result);

      if (!result.ok && hook.mode === HOOK_MODES.BLOCKING && hook.hookName.startsWith('before_')) {
        throw Object.assign(new Error(result.message || `Blocking hook failed: ${hook.id}`), {
          hookResult: result,
        });
      }
    }

    return results;
  }

  async runHook(hook, context = {}) {
    let attempts = 0;
    let lastError = null;

    while (attempts <= hook.retries) {
      attempts += 1;
      try {
        await withTimeout(this.invokeHook(hook, context), hook.timeoutMs);
        return {
          hookId: hook.id,
          hookName: hook.hookName,
          mode: hook.mode,
          ok: true,
          attempts,
          message: hook.message || 'Hook completed',
        };
      } catch (error) {
        lastError = error;
      }
    }

    return {
      hookId: hook.id,
      hookName: hook.hookName,
      mode: hook.mode,
      ok: false,
      attempts,
      message: lastError?.message || `Hook failed: ${hook.id}`,
    };
  }

  async invokeHook(hook, context = {}) {
    switch (hook.action) {
      case HOOK_ACTIONS.NOOP:
        return {
          message: hook.message || 'noop',
          context,
        };
      case HOOK_ACTIONS.FAIL:
        throw new Error(hook.message || `Hook requested failure: ${hook.id}`);
      default:
        throw new Error(`Unsupported hook action: ${hook.action}`);
    }
  }
}
