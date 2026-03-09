export const HOOK_CONTEXT_SCHEMA_VERSION = 1;

export const HOOK_NAMES = {
  BEFORE_START: 'before_start',
  AFTER_START: 'after_start',
  BEFORE_DONE: 'before_done',
  AFTER_DONE: 'after_done',
  CONTRACT_BOUND: 'contract.bound',
  CONTRACT_UNBOUND: 'contract.unbound',
  CONTRACT_CHANGED: 'contract.changed',
  CONTRACT_DRIFT_DETECTED: 'contract.drift_detected',
  MODE_CHANGED: 'mode.changed',
};

export const HOOK_MODES = {
  BLOCKING: 'blocking',
  NON_BLOCKING: 'non_blocking',
};

export const HOOK_ACTIONS = {
  NOOP: 'noop',
  FAIL: 'fail',
};

export const HOOK_RESULT_KINDS = {
  GUARD: 'guard',
  ADVISORY: 'advisory',
  ENRICHMENT: 'enrichment',
};

export const HOOK_FAMILIES = {
  TASK_TRANSITION: 'task-transition',
  CONTRACT: 'contract',
  MODE: 'mode',
};

export const HOOK_SURFACES = {
  TASK: 'task',
  WORKSPACE: 'workspace',
};

export const HOOK_PHASES = {
  BEFORE: 'before',
  AFTER: 'after',
  EVENT: 'event',
};

export const HOOK_TAXONOMY = {
  [HOOK_NAMES.BEFORE_START]: {
    family: HOOK_FAMILIES.TASK_TRANSITION,
    surface: HOOK_SURFACES.TASK,
    phase: HOOK_PHASES.BEFORE,
    trigger: 'task.start',
  },
  [HOOK_NAMES.AFTER_START]: {
    family: HOOK_FAMILIES.TASK_TRANSITION,
    surface: HOOK_SURFACES.TASK,
    phase: HOOK_PHASES.AFTER,
    trigger: 'task.start',
  },
  [HOOK_NAMES.BEFORE_DONE]: {
    family: HOOK_FAMILIES.TASK_TRANSITION,
    surface: HOOK_SURFACES.TASK,
    phase: HOOK_PHASES.BEFORE,
    trigger: 'task.done',
  },
  [HOOK_NAMES.AFTER_DONE]: {
    family: HOOK_FAMILIES.TASK_TRANSITION,
    surface: HOOK_SURFACES.TASK,
    phase: HOOK_PHASES.AFTER,
    trigger: 'task.done',
  },
  [HOOK_NAMES.CONTRACT_BOUND]: {
    family: HOOK_FAMILIES.CONTRACT,
    surface: HOOK_SURFACES.WORKSPACE,
    phase: HOOK_PHASES.EVENT,
    trigger: 'contract.bound',
  },
  [HOOK_NAMES.CONTRACT_UNBOUND]: {
    family: HOOK_FAMILIES.CONTRACT,
    surface: HOOK_SURFACES.WORKSPACE,
    phase: HOOK_PHASES.EVENT,
    trigger: 'contract.unbound',
  },
  [HOOK_NAMES.CONTRACT_CHANGED]: {
    family: HOOK_FAMILIES.CONTRACT,
    surface: HOOK_SURFACES.WORKSPACE,
    phase: HOOK_PHASES.EVENT,
    trigger: 'contract.changed',
  },
  [HOOK_NAMES.CONTRACT_DRIFT_DETECTED]: {
    family: HOOK_FAMILIES.CONTRACT,
    surface: HOOK_SURFACES.WORKSPACE,
    phase: HOOK_PHASES.EVENT,
    trigger: 'contract.drift_detected',
  },
  [HOOK_NAMES.MODE_CHANGED]: {
    family: HOOK_FAMILIES.MODE,
    surface: HOOK_SURFACES.WORKSPACE,
    phase: HOOK_PHASES.EVENT,
    trigger: 'mode.changed',
  },
};
