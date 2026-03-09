import { ANNOUNCEMENT_ACTIONS, ANNOUNCEMENT_KINDS } from '../../../shared/constants/announcements.js';

const ALLOWED_KINDS = new Set(Object.values(ANNOUNCEMENT_KINDS));
const ALLOWED_ACTIONS = new Set(Object.values(ANNOUNCEMENT_ACTIONS));

export class AnnouncementRegistry {
  constructor(storage) {
    this.storage = storage;
  }

  async getAnnouncements(kind) {
    if (!ALLOWED_KINDS.has(kind)) {
      throw new Error(`Unsupported announcement kind: ${kind}`);
    }

    const config = await this.storage.readConfigFile();
    const entries = Array.isArray(config.announcements?.[kind]) ? config.announcements[kind] : [];
    return entries.map((entry, index) => this.normalizeAnnouncement(kind, entry, index));
  }

  normalizeAnnouncement(kind, entry = {}, index = 0) {
    const action = ALLOWED_ACTIONS.has(entry.action) ? entry.action : ANNOUNCEMENT_ACTIONS.NOOP;
    return {
      id: entry.id || `${kind}_${index + 1}`,
      kind,
      action,
      template: entry.template || '',
      channel: entry.channel || 'default',
    };
  }
}
