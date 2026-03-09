import { MODE_CAPABILITIES, MODE_COMPATIBILITY, VALID_WORKSPACE_MODES, WORKSPACE_MODES } from '../../../shared/constants/modes.js';

function createFallback(mode, fallbackReason = null) {
  return {
    mode,
    requestedMode: mode,
    fallbackMode: null,
    fallbackReason,
    compatibility: MODE_COMPATIBILITY[mode] || MODE_COMPATIBILITY[WORKSPACE_MODES.DEFAULT],
    capabilities: MODE_CAPABILITIES[mode] || MODE_CAPABILITIES[WORKSPACE_MODES.DEFAULT],
  };
}

export function resolveModeFromConfig(config = {}) {
  const requestedMode = String(config?.mode || WORKSPACE_MODES.DEFAULT).trim() || WORKSPACE_MODES.DEFAULT;

  if (VALID_WORKSPACE_MODES.includes(requestedMode)) {
    return {
      mode: requestedMode,
      requestedMode,
      fallbackMode: null,
      fallbackReason: null,
      compatibility: MODE_COMPATIBILITY[requestedMode] || MODE_COMPATIBILITY[WORKSPACE_MODES.DEFAULT],
      capabilities: MODE_CAPABILITIES[requestedMode] || MODE_CAPABILITIES[WORKSPACE_MODES.DEFAULT],
    };
  }

  return {
    mode: WORKSPACE_MODES.DEFAULT,
    requestedMode,
    fallbackMode: WORKSPACE_MODES.DEFAULT,
    fallbackReason: `Unsupported workspace mode "${requestedMode}"`,
    compatibility: MODE_COMPATIBILITY[WORKSPACE_MODES.DEFAULT],
    capabilities: MODE_CAPABILITIES[WORKSPACE_MODES.DEFAULT],
  };
}

export async function resolveWorkspaceMode(storage) {
  const config = await storage.readConfigFile();
  return resolveModeFromConfig(config);
}

export function buildModeGuidance(modeInfo) {
  if (modeInfo.mode === WORKSPACE_MODES.APIFIRST) {
    return {
      migrationAvailable: false,
      recommendedCommand: null,
      note: 'Contract-first mode is active.',
      capabilitySummary: 'Contract-first context, drift reminders, and contract-aware hook families are enabled.',
    };
  }

  return {
    migrationAvailable: true,
    recommendedCommand: 'seshflow mode set apifirst',
    note: 'Default mode is active. Switch to apifirst when you want contract-first planning and context.',
    capabilitySummary: 'Task sequencing is active; contract-aware context stays opt-in until apifirst mode is enabled.',
  };
}

export function createModeInfo(mode = WORKSPACE_MODES.DEFAULT) {
  return createFallback(mode);
}
