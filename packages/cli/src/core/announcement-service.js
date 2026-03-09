import { AnnouncementRegistry } from './announcement-registry.js';
import { AnnouncementExecutor } from './announcement-executor.js';
import { ANNOUNCEMENT_KINDS } from '../../../shared/constants/announcements.js';

export class AnnouncementService {
  constructor(manager) {
    this.manager = manager;
    this.registry = new AnnouncementRegistry(manager.storage);
    this.executor = new AnnouncementExecutor();
  }

  async announce(kind, task, context = {}) {
    const announcements = await this.registry.getAnnouncements(kind);
    const renderedContext = this.buildContext(task, kind, context);
    const results = [];

    for (const announcement of announcements) {
      const result = await this.executor.run(announcement, renderedContext);
      results.push(result);
      this.manager.appendRuntimeEvent({
        type: 'announcement.execution',
        taskId: task?.id || null,
        transitionEventId: context.transitionEventId || null,
        level: result.ok ? 'info' : 'warn',
        status: result.ok ? 'announced' : 'failed',
        message: result.message,
        attempts: 1,
        data: {
          kind,
          action: result.action,
          channel: result.channel,
          announcementId: result.announcementId,
          percent: renderedContext.percent ?? null,
        },
      });
    }

    return results;
  }

  async announceProgress(task, context = {}) {
    return this.announce(ANNOUNCEMENT_KINDS.PROGRESS, task, context);
  }

  buildContext(task, kind, context = {}) {
    return {
      kind,
      taskId: task?.id || '',
      title: task?.title || '',
      priority: task?.priority || '',
      status: task?.status || '',
      note: context.note || '',
      hours: context.hours ?? '',
      percent: context.percent ?? '',
      source: context.source || 'cli',
    };
  }
}
