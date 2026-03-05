#!/usr/bin/env node

/**
 * Fix subtask import logic
 */

import fs from 'fs';

const filePath = 'packages/cli/src/commands/import.js';

let content = await fs.promises.readFile(filePath, 'utf-8');

// Fix line 98: Add rawLine variable
content = content.replace(
  "    const line = lines[i].trim();",
  `    const rawLine = lines[i];
    const line = rawLine.trim();`
);

// Fix line 113: Use rawLine for subtask detection
content = content.replace(
  "    if (line.startsWith('  -') || line.startsWith('\\t-')) {",
  "    if (rawLine.startsWith('  -') || rawLine.startsWith('\\t-')) {"
);

await fs.promises.writeFile(filePath, content, 'utf-8');

console.log('✓ Fixed subtask import logic');
