import { TRANSITION_SCHEMA_VERSION, TRANSITION_TYPES } from '../../../shared/constants/transitions.js';
import { HOOK_MODES, HOOK_NAMES } from '../../../shared/constants/hooks.js';
import { HookRegistry } from './hook-registry.js';
import { HookExecutor } from './hook-executor.js';

export class TaskTransitionService {
  constructor(manager) {
    this.manager = manager;
    this.registry = new HookRegistry(manager.storage);
    this.executor = new HookExecutor(manager);
  }

  async startTask(taskId, options = {}) {
    const task = this.manager.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const currentTask = this.manager.getCurrentTask();
    if (currentTask && currentTask.id === task.id) {
      return {
        action: 'start',
        changed: false,
        task,
        currentTask,
        previousTask: null,
        switched: false,
        unmetDependencies: [],
        transitionEvent: null,
      };
    }

    if (task.status === 'done' && !options.force) {
      throw new Error('Task is already done. Use --force to reopen and start.');
    }

    if (currentTask && currentTask.id !== task.id) {
      if (!options.force && !options.switch) {
        throw new Error(`Session conflict: active task exists (${currentTask.id} | ${currentTask.title})`);
      }

      if (options.switch) {
        await this.manager.suspendCurrentTask(`Switched to ${task.id}`);
      } else {
        await this.manager.endSession('Switched by start --force');
        if (currentTask.status === 'in-progress') {
          this.manager.updateTask(currentTask.id, { status: 'backlog' });
        }
      }
    }

    const unmetDependencies = this.manager.getUnmetDependencies(task);
    if (unmetDependencies.length > 0 && !options.force) {
      throw new Error(`Cannot start task due to unmet dependencies: ${unmetDependencies.map(dep => dep.id).join(', ')}`);
    }

    const statusFrom = task.status;
    if (task.status === 'done' && options.force) {
      this.manager.updateTask(task.id, { status: 'backlog', completedAt: null });
    }

    const beforeResults = await this.runHookPhase(HOOK_NAMES.BEFORE_START, task, null, {
      source: options.source || 'cli',
    });
    this.manager.startSession(task.id);
    const transitionEvent = this.manager.appendTransitionEvent({
      schemaVersion: TRANSITION_SCHEMA_VERSION,
      type: TRANSITION_TYPES.START,
      taskId: task.id,
      statusFrom,
      statusTo: 'in-progress',
      changed: true,
      context: {
        source: options.source || 'cli',
        force: Boolean(options.force),
        switch: Boolean(options.switch),
        previousTaskId: currentTask && currentTask.id !== task.id ? currentTask.id : null,
      },
    });
    this.appendTransitionRuntimeEvent(task.id, transitionEvent);
    const afterResults = await this.runHookPhase(HOOK_NAMES.AFTER_START, task, transitionEvent, {
      source: options.source || 'cli',
    });

    return {
      action: 'start',
      changed: true,
      task,
      currentTask: task,
      previousTask: currentTask && currentTask.id !== task.id ? currentTask : null,
      switched: Boolean(options.switch),
      unmetDependencies,
      transitionEvent,
      hookResults: [...beforeResults, ...afterResults],
    };
  }

  async completeTask(taskId, options = {}) {
    const task = this.manager.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const statusFrom = task.status;
    const beforeResults = await this.runHookPhase(HOOK_NAMES.BEFORE_DONE, task, null, {
      source: options.source || 'cli',
      hours: options.hours ? Number.parseFloat(options.hours) : null,
      note: options.note || '',
    });
    await this.manager.completeTask(taskId, options);
    const transitionEvent = this.manager.appendTransitionEvent({
      schemaVersion: TRANSITION_SCHEMA_VERSION,
      type: TRANSITION_TYPES.DONE,
      taskId,
      statusFrom,
      statusTo: 'done',
      changed: true,
      context: {
        source: options.source || 'cli',
        hours: options.hours ? Number.parseFloat(options.hours) : null,
        note: options.note || '',
      },
    });
    this.appendTransitionRuntimeEvent(taskId, transitionEvent);
    const afterResults = await this.runHookPhase(HOOK_NAMES.AFTER_DONE, this.manager.getTask(taskId), transitionEvent, {
      source: options.source || 'cli',
      hours: options.hours ? Number.parseFloat(options.hours) : null,
      note: options.note || '',
    });

    return {
      action: 'done',
      changed: true,
      task: this.manager.getTask(taskId),
      transitionEvent,
      hookResults: [...beforeResults, ...afterResults],
    };
  }

  async suspendCurrentTask(options = {}) {
    const currentTask = this.manager.getCurrentTask();
    if (!currentTask) {
      return {
        action: 'suspend',
        changed: false,
        task: null,
        transitionEvent: null,
      };
    }

    const statusFrom = currentTask.status;
    const task = await this.manager.suspendCurrentTask(options.reason || options.note || 'Suspended');
    const transitionEvent = this.manager.appendTransitionEvent({
      schemaVersion: TRANSITION_SCHEMA_VERSION,
      type: TRANSITION_TYPES.SUSPEND,
      taskId: currentTask.id,
      statusFrom,
      statusTo: 'todo',
      changed: true,
      context: {
        source: options.source || 'cli',
        reason: options.reason || options.note || 'Suspended',
      },
    });

    return {
      action: 'suspend',
      changed: true,
      task,
      transitionEvent,
      hookResults: [],
    };
  }

  async skipCurrentTask(options = {}) {
    const currentTask = this.manager.getCurrentTask();
    if (!currentTask) {
      return {
        action: 'skip',
        changed: false,
        task: null,
        transitionEvent: null,
      };
    }

    const reason = options.reason || options.note || 'Skipped';
    const statusFrom = currentTask.status;
    await this.manager.endSession(reason);
    this.manager.updateTask(currentTask.id, {
      status: 'todo',
      blockedReason: null,
      skippedReason: reason,
      skippedAt: new Date().toISOString(),
    });
    const transitionEvent = this.manager.appendTransitionEvent({
      schemaVersion: TRANSITION_SCHEMA_VERSION,
      type: TRANSITION_TYPES.SKIP,
      taskId: currentTask.id,
      statusFrom,
      statusTo: 'todo',
      changed: true,
      context: {
        source: options.source || 'cli',
        reason,
      },
    });

    return {
      action: 'skip',
      changed: true,
      task: currentTask,
      transitionEvent,
      hookResults: [],
    };
  }

  async runHookPhase(hookName, task, transitionEvent, context = {}) {
    const hooks = await this.registry.getHooks(hookName);
    if (hooks.length === 0) {
      return [];
    }

    const executionContext = {
      ...context,
      taskId: task.id,
      transitionEventId: transitionEvent?.id || null,
      hookName,
    };

    let results;
    try {
      results = await this.executor.runHooks(hooks, executionContext);
    } catch (error) {
      if (error.hookResult) {
        this.appendHookRuntimeEvent(task.id, transitionEvent?.id || null, error.hookResult);
      }
      throw error;
    }

    results.forEach(result => {
      this.appendHookRuntimeEvent(task.id, transitionEvent?.id || null, result);
    });

    return results;
  }

  appendTransitionRuntimeEvent(taskId, transitionEvent) {
    this.manager.appendRuntimeEvent({
      type: 'transition.execution',
      taskId,
      transitionEventId: transitionEvent.id,
      level: 'info',
      status: 'recorded',
      message: `${transitionEvent.type} ${transitionEvent.statusFrom || 'unknown'} -> ${transitionEvent.statusTo || 'unknown'}`,
      attempts: 0,
      data: {
        type: transitionEvent.type,
        statusFrom: transitionEvent.statusFrom,
        statusTo: transitionEvent.statusTo,
      },
    });
  }

  appendHookRuntimeEvent(taskId, transitionEventId, result) {
    this.manager.appendRuntimeEvent({
      type: 'hook.execution',
      taskId,
      transitionEventId,
      hookName: result.hookName,
      hookId: result.hookId,
      level: result.ok ? 'info' : (result.mode === HOOK_MODES.NON_BLOCKING ? 'warn' : 'error'),
      status: result.ok ? 'succeeded' : 'failed',
      message: result.message,
      attempts: result.attempts,
      data: {
        mode: result.mode,
      },
    });
  }
}
