const VALID_MODES = new Set(['pretty', 'compact']);

/**
 * Resolve output mode with simple precedence:
 * 1) explicit CLI flags
 * 2) SESHFLOW_OUTPUT env
 * 3) non-TTY defaults to compact
 * 4) fallback default mode
 *
 * JSON is resolved separately by isJSONMode().
 */
export function resolveOutputMode(options = {}, defaultMode = 'pretty') {
  if (options.compact) return 'compact';
  if (options.pretty) return 'pretty';

  const envMode = process.env.SESHFLOW_OUTPUT?.toLowerCase();
  if (envMode && VALID_MODES.has(envMode)) {
    return envMode;
  }

  if (!process.stdout.isTTY) {
    return 'compact';
  }

  return VALID_MODES.has(defaultMode) ? defaultMode : 'pretty';
}
