import { ANNOUNCEMENT_ACTIONS, ANNOUNCEMENT_SCHEMA_VERSION } from '../../../shared/constants/announcements.js';

function renderTemplate(template = '', context = {}) {
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = context[key.trim()];
    return value === undefined || value === null ? '' : String(value);
  }).replace(/\s+/g, ' ').trim();
}

export class AnnouncementExecutor {
  async run(announcement, context = {}) {
    const message = renderTemplate(announcement.template, context) || `${announcement.kind} ${context.taskId || ''}`.trim();

    switch (announcement.action) {
      case ANNOUNCEMENT_ACTIONS.NOOP:
        return this.result(announcement, message, true);
      case ANNOUNCEMENT_ACTIONS.LOG:
        return this.result(announcement, message, true);
      case ANNOUNCEMENT_ACTIONS.FAIL:
        return this.result(announcement, announcement.template || `Announcement failed: ${announcement.id}`, false);
      default:
        return this.result(announcement, `Unsupported announcement action: ${announcement.action}`, false);
    }
  }

  result(announcement, message, ok) {
    return {
      schemaVersion: ANNOUNCEMENT_SCHEMA_VERSION,
      announcementId: announcement.id,
      kind: announcement.kind,
      action: announcement.action,
      channel: announcement.channel,
      ok,
      message,
    };
  }
}
