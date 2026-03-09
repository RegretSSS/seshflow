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
