import { HOOK_ACTIONS, HOOK_CONTEXT_SCHEMA_VERSION, HOOK_MODES, HOOK_PHASES, HOOK_RESULT_KINDS } from '../../../shared/constants/hooks.js';

function classifyHookResultKind(hook, ok) {
  if (hook.mode === HOOK_MODES.BLOCKING && hook.phase === HOOK_PHASES.BEFORE) {
    return HOOK_RESULT_KINDS.GUARD;
  }

  if (!ok || hook.mode === HOOK_MODES.NON_BLOCKING) {
    return HOOK_RESULT_KINDS.ADVISORY;
  }

  return HOOK_RESULT_KINDS.ENRICHMENT;
}

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
          schemaVersion: HOOK_CONTEXT_SCHEMA_VERSION,
          hookId: hook.id,
          hookName: hook.hookName,
          hookFamily: hook.family,
          hookSurface: hook.surface,
          hookPhase: hook.phase,
          trigger: hook.trigger,
          resultKind: classifyHookResultKind(hook, true),
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
      schemaVersion: HOOK_CONTEXT_SCHEMA_VERSION,
      hookId: hook.id,
      hookName: hook.hookName,
      hookFamily: hook.family,
      hookSurface: hook.surface,
      hookPhase: hook.phase,
      trigger: hook.trigger,
      resultKind: classifyHookResultKind(hook, false),
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
