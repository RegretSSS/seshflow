import {
  MODE_CAPABILITIES,
  MODE_COMPATIBILITY,
  MODE_PROFILE_ALLOWED_OVERRIDES,
  normalizeWorkspaceMode,
  VALID_WORKSPACE_MODES,
  WORKSPACE_MODES,
} from '../../../shared/constants/modes.js';

function sanitizeModeOverrides(mode, rawOverrides = {}) {
  const allowed = MODE_PROFILE_ALLOWED_OVERRIDES[mode] || {};
  const overrides = {};

  for (const [key, value] of Object.entries(rawOverrides || {})) {
    if (!Object.prototype.hasOwnProperty.call(allowed, key)) {
      continue;
    }

    if (allowed[key].includes(value)) {
      overrides[key] = value;
    }
  }

  return overrides;
}

function buildModeProfile(mode, rawOverrides = {}) {
  const presetCapabilities = MODE_CAPABILITIES[mode] || MODE_CAPABILITIES[WORKSPACE_MODES.DEFAULT];
  const overrides = sanitizeModeOverrides(mode, rawOverrides);
  const capabilities = {
    ...presetCapabilities,
    ...overrides,
  };

  return {
    preset: mode,
    overrides,
    capabilities,
  };
}

function createFallback(mode, fallbackReason = null) {
  const profile = buildModeProfile(mode);
  return {
    mode,
    requestedMode: mode,
    fallbackMode: null,
    fallbackReason,
    compatibility: MODE_COMPATIBILITY[mode] || MODE_COMPATIBILITY[WORKSPACE_MODES.DEFAULT],
    capabilities: profile.capabilities,
    profile,
  };
}

export function resolveModeFromConfig(config = {}) {
  const requestedMode = String(config?.mode || WORKSPACE_MODES.DEFAULT).trim() || WORKSPACE_MODES.DEFAULT;
  const normalizedMode = normalizeWorkspaceMode(requestedMode);
  const rawOverrides = config?.modeProfile?.overrides || {};

  if (VALID_WORKSPACE_MODES.includes(normalizedMode)) {
    const profile = buildModeProfile(normalizedMode, rawOverrides);
    return {
      mode: normalizedMode,
      requestedMode,
      fallbackMode: null,
      fallbackReason: null,
      compatibility: MODE_COMPATIBILITY[normalizedMode] || MODE_COMPATIBILITY[WORKSPACE_MODES.DEFAULT],
      capabilities: profile.capabilities,
      profile,
    };
  }

  const profile = buildModeProfile(WORKSPACE_MODES.DEFAULT);
  return {
    mode: WORKSPACE_MODES.DEFAULT,
    requestedMode,
    fallbackMode: WORKSPACE_MODES.DEFAULT,
    fallbackReason: `Unsupported workspace mode "${requestedMode}"`,
    compatibility: MODE_COMPATIBILITY[WORKSPACE_MODES.DEFAULT],
    capabilities: profile.capabilities,
    profile,
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
      profileSummary: Object.keys(modeInfo.profile?.overrides || {}).length > 0
        ? 'Bounded mode overrides are active.'
        : 'Preset-only mode profile is active.',
    };
  }

  return {
    migrationAvailable: true,
    recommendedCommand: 'seshflow mode set apifirst',
    note: 'Default mode is active. Switch to apifirst when you want contract-first planning and context.',
    capabilitySummary: 'Task sequencing is active; contract-aware context stays opt-in until apifirst mode is enabled.',
    profileSummary: Object.keys(modeInfo.profile?.overrides || {}).length > 0
      ? 'Bounded mode overrides are active.'
      : 'Preset-only mode profile is active.',
  };
}

export function createModeInfo(mode = WORKSPACE_MODES.DEFAULT) {
  return createFallback(mode);
}
