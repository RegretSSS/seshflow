#!/usr/bin/env node

/**
 * Simple verification test
 */

console.log('🧪 Seshflow Project Structure Test\n');

import { promises as fs } from 'fs';
import path from 'path';

async function checkStructure() {
  const checks = [
    { path: 'package.json', name: 'Root package.json' },
    { path: 'pnpm-workspace.yaml', name: 'Workspace config' },
    { path: 'packages/cli/package.json', name: 'CLI package.json' },
    { path: 'packages/cli/bin/seshflow.js', name: 'CLI entry point' },
    { path: 'packages/cli/src/core/task-manager.js', name: 'TaskManager' },
    { path: 'packages/cli/src/core/storage.js', name: 'Storage' },
    { path: 'packages/cli/src/commands/init.js', name: 'Init command' },
    { path: 'packages/cli/src/commands/add.js', name: 'Add command' },
    { path: 'packages/cli/src/commands/next.js', name: 'Next command' },
    { path: 'packages/cli/src/commands/done.js', name: 'Done command' },
    { path: 'packages/shared/types/task.d.ts', name: 'Shared types' },
    { path: 'packages/shared/constants/statuses.js', name: 'Constants' },
    { path: 'README.md', name: 'README' },
    { path: 'docs.md', name: 'Documentation' }
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      await fs.access(path.join(process.cwd(), check.path));
      console.log(`✓ ${check.name}`);
      passed++;
    } catch {
      console.log(`✗ ${check.name} - Missing`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n✨ All structure checks passed!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: pnpm install');
    console.log('   2. Run: node packages/cli/bin/seshflow.js init');
    console.log('   3. Run: node packages/cli/bin/seshflow.js add "First task"');
  } else {
    console.log('\n⚠️  Some files are missing. Please check the structure.');
    process.exit(1);
  }
}

checkStructure();
