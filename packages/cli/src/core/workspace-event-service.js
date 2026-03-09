import { HookRegistry } from './hook-registry.js';
import { HookExecutor } from './hook-executor.js';
import { buildHookExecutionContext } from './hook-context.js';

export class WorkspaceEventService {
  constructor(manager) {
    this.manager = manager;
    this.registry = new HookRegistry(manager.storage);
    this.executor = new HookExecutor(manager);
  }

  async emit(eventType, context = {}) {
    const hooks = await this.registry.getHooks(eventType);
    const executionContext = await buildHookExecutionContext(this.manager, eventType, {
      ...context,
      eventType,
    });
    const results = hooks.length > 0
      ? await this.executor.runHooks(hooks, executionContext)
      : [];

    const runtimeEvent = this.manager.appendRuntimeEvent({
      type: eventType,
      taskId: context.taskId || null,
      level: context.level || 'info',
      status: context.status || 'recorded',
      message: context.message || eventType,
      attempts: 0,
      data: {
        ...context,
        hookContext: executionContext,
        hookResults: results,
      },
    });

    return {
      runtimeEvent,
      hookResults: results,
    };
  }
}
