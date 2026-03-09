export async function shouldShowWorkspaceHint(storage, key, cooldownMs = 15 * 60 * 1000) {
  try {
    return await storage.shouldShowHint(key, cooldownMs);
  } catch {
    return true;
  }
}
