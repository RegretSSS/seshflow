#!/usr/bin/env node

/**
 * Fix show.js blockedBy handling
 */

import fs from 'fs';

const filePath = 'packages/cli/src/commands/show.js';

let content = await fs.promises.readFile(filePath, 'utf-8');

// Fix dependencies check
content = content.replace(
  "  if (task.dependencies.length > 0) {",
  "  if (task.dependencies && task.dependencies.length > 0) {"
);

// Fix blockedBy check and handling
content = content.replace(
  "  if (task.blockedBy && task.blockedBy.length > 0) {\n    console.log(chalk.cyan('│'));\n    console.log(chalk.cyan(`│ Blocked By:`));\n    task.blockedBy.forEach(blocker => {\n      console.log(chalk.cyan(`│   • ${blocker.id}: ${truncate(blocker.title, 50)}`));\n    });\n  }",
  "  if (task.blockedBy && Array.isArray(task.blockedBy) && task.blockedBy.length > 0) {\n    console.log(chalk.cyan('│'));\n    console.log(chalk.cyan(`│ Blocked By:`));\n    task.blockedBy.forEach(blocker => {\n      if (blocker && blocker.id) {\n        console.log(chalk.cyan(`│   • ${blocker.id}: ${truncate(blocker.title || blocker.id, 50)}`));\n      }\n    });\n  }"
);

await fs.promises.writeFile(filePath, content, 'utf-8');

console.log('✓ Fixed show.js blockedBy handling');
