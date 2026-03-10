import path from 'node:path';
import fs from 'fs-extra';

export const EXPECTED_ARTIFACT_MISSING = 'EXPECTED_ARTIFACT_MISSING';

export function parseExpectedArtifactsInput(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  return [...new Set(
    String(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  )];
}

export async function checkExpectedArtifacts(basePath, expectedArtifacts = []) {
  const warnings = [];

  for (const artifactPath of [...new Set(expectedArtifacts.filter(Boolean))]) {
    const resolvedPath = path.isAbsolute(artifactPath)
      ? artifactPath
      : path.join(basePath, artifactPath);

    if (!(await fs.pathExists(resolvedPath))) {
      warnings.push({
        code: EXPECTED_ARTIFACT_MISSING,
        artifactPath,
        resolvedPath,
        message: `Expected artifact does not exist yet: ${artifactPath}`,
      });
    }
  }

  return warnings;
}
