export const WORKSPACE_MODES = {
  DEFAULT: 'default',
  APIFIRST: 'apifirst',
};

export const VALID_WORKSPACE_MODES = Object.values(WORKSPACE_MODES);

export const MODE_COMPATIBILITY = {
  default: {
    contractCommands: 'optional',
    contractFirstContext: false,
    starterPlan: null,
  },
  apifirst: {
    contractCommands: 'primary',
    contractFirstContext: true,
    starterPlan: '.seshflow/plans/api-planning.md',
  },
};

export const MODE_CAPABILITIES = {
  default: {
    contractCommands: true,
    contractFirstContext: false,
    contractDriftReminders: false,
    hookFamilies: ['task-transition'],
    rpcShellSurfaces: ['workspace', 'task', 'contract'],
    contextPriorityStrategy: 'basic-task',
  },
  apifirst: {
    contractCommands: true,
    contractFirstContext: true,
    contractDriftReminders: true,
    hookFamilies: ['task-transition', 'contract', 'mode'],
    rpcShellSurfaces: ['workspace', 'task', 'contract'],
    contextPriorityStrategy: 'contract-first',
  },
};
