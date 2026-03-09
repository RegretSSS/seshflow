import { TRANSITION_SCHEMA_VERSION, TRANSITION_TYPES } from '../../../shared/constants/transitions.js';

export class TaskTransitionService {
  constructor(manager) {
    this.manager = manager;
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

    return {
      action: 'start',
      changed: true,
      task,
      currentTask: task,
      previousTask: currentTask && currentTask.id !== task.id ? currentTask : null,
      switched: Boolean(options.switch),
      unmetDependencies,
      transitionEvent,
    };
  }

  async completeTask(taskId, options = {}) {
    const task = this.manager.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const statusFrom = task.status;
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

    return {
      action: 'done',
      changed: true,
      task: this.manager.getTask(taskId),
      transitionEvent,
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
    };
  }
}
