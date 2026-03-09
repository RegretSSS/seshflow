import { HOOK_ACTIONS, HOOK_MODES, HOOK_NAMES, HOOK_TAXONOMY } from '../../../shared/constants/hooks.js';

const ALLOWED_HOOKS = new Set(Object.values(HOOK_NAMES));
const ALLOWED_MODES = new Set(Object.values(HOOK_MODES));
const ALLOWED_ACTIONS = new Set(Object.values(HOOK_ACTIONS));

export class HookRegistry {
  constructor(storage) {
    this.storage = storage;
  }

  async getHooks(hookName) {
    if (!ALLOWED_HOOKS.has(hookName)) {
      throw new Error(`Unsupported hook: ${hookName}`);
    }

    const config = await this.storage.readConfigFile();
    const hooks = Array.isArray(config.hooks?.[hookName]) ? config.hooks[hookName] : [];
    return hooks.map((hook, index) => this.normalizeHook(hookName, hook, index));
  }

  normalizeHook(hookName, hook = {}, index = 0) {
    const id = hook.id || `${hookName}_${index + 1}`;
    const mode = ALLOWED_MODES.has(hook.mode) ? hook.mode : HOOK_MODES.BLOCKING;
    const action = ALLOWED_ACTIONS.has(hook.action) ? hook.action : HOOK_ACTIONS.NOOP;
    const taxonomy = HOOK_TAXONOMY[hookName] || null;
    return {
      id,
      hookName,
      mode,
      action,
      family: taxonomy?.family || null,
      surface: taxonomy?.surface || null,
      phase: taxonomy?.phase || null,
      trigger: taxonomy?.trigger || null,
      message: hook.message || '',
      timeoutMs: Number.isInteger(hook.timeoutMs) ? hook.timeoutMs : 1000,
      retries: Number.isInteger(hook.retries) ? hook.retries : 0,
    };
  }
}
