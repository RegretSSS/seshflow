#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

let cliEntry;
try {
  cliEntry = require.resolve('@seshflow/cli/bin/seshflow.js');
} catch (error) {
  console.error('Failed to locate @seshflow/cli. Try reinstalling seshflow.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliEntry, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Failed to run seshflow: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
