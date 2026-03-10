export const HANDOFF_SCHEMA_VERSION = 1;

export const HANDOFF_STATUSES = {
  CREATED: 'created',
  ACTIVE: 'active',
  PAUSED: 'paused',
  SUBMITTED: 'submitted',
  ABANDONED: 'abandoned',
  RECLAIMED: 'reclaimed',
  CLOSED: 'closed',
};

export const HANDOFF_EXECUTOR_KINDS = {
  HUMAN: 'human',
  AGENT: 'agent',
  EXTERNAL: 'external',
  UNKNOWN: 'unknown',
};

export const ACTIVE_HANDOFF_STATUSES = [
  HANDOFF_STATUSES.CREATED,
  HANDOFF_STATUSES.ACTIVE,
  HANDOFF_STATUSES.PAUSED,
  HANDOFF_STATUSES.SUBMITTED,
];
