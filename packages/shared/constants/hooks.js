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
