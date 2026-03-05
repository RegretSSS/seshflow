import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';

const TASK_LINE_RE = /^-\s*\[[ x]\]\s+(.+)$/i;
const DEPENDENCY_TOKEN_RE = /\[(dependency|depends|dep|\u4f9d\u8d56)\s*:\s*([^\]]+)\]/ig;

function parseTaskTitle(line) {
  const match = line.match(TASK_LINE_RE);
  if (!match) return null;
  return match[1].replace(/\[[^\]]+\]/g, '').trim();
}

export async function validateMarkdown(filePath) {
  const spinner = ora('Validating markdown task file').start();

  try {
    if (!(await fs.pathExists(filePath))) {
      spinner.fail('Validation failed');
      console.error(chalk.red(`\nFile not found: ${filePath}`));
      process.exit(1);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const errors = [];
    const warnings = [];
    const tasks = [];

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) return;

      const title = parseTaskTitle(line);
      if (!title) return;

      const lineNo = idx + 1;
      tasks.push({ title, lineNo });

      const priorityMatches = [...line.matchAll(/\[(P[0-3])\]/g)];
      if (priorityMatches.length === 0) {
        warnings.push(`Line ${lineNo}: missing priority [P0-P3]`);
      }
      if (priorityMatches.length > 1) {
        errors.push(`Line ${lineNo}: duplicated priority token`);
      }

      const invalidHours = [...line.matchAll(/\[(-?\d+(?:\.\d+)?)h\]/ig)]
        .map(match => Number.parseFloat(match[1]))
        .find(hours => Number.isNaN(hours) || hours < 0);
      if (invalidHours !== undefined) {
        errors.push(`Line ${lineNo}: invalid hour token`);
      }
    });

    if (tasks.length === 0) {
      errors.push('No task lines found');
    }

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!TASK_LINE_RE.test(line)) return;

      let match;
      while ((match = DEPENDENCY_TOKEN_RE.exec(line)) !== null) {
        const refs = match[2]
          .split(',')
          .map(dep => dep.trim())
          .filter(Boolean);

        refs.forEach(ref => {
          const numericIndex = Number.parseInt(ref, 10);
          const byIndex = Number.isInteger(numericIndex) && numericIndex > 0 && numericIndex <= tasks.length;
          const byTitle = tasks.some(task => task.title === ref);
          const looksLikeTaskId = /^task_[a-z0-9_]+$/i.test(ref);

          if (!byIndex && !byTitle && !looksLikeTaskId) {
            warnings.push(`Line ${idx + 1}: unresolved dependency "${ref}"`);
          }
        });
      }
      DEPENDENCY_TOKEN_RE.lastIndex = 0;
    });

    if (errors.length > 0) {
      spinner.fail('Validation failed');
      console.error(chalk.red('\nErrors:'));
      errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
      if (warnings.length > 0) {
        console.error(chalk.yellow('\nWarnings:'));
        warnings.forEach(warning => console.error(chalk.yellow(`  - ${warning}`)));
      }
      process.exit(1);
    }

    spinner.succeed('Validation passed');
    console.log(chalk.green(`\nTasks found: ${tasks.length}`));
    if (warnings.length > 0) {
      console.log(chalk.yellow(`Warnings: ${warnings.length}`));
      warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)));
    } else {
      console.log(chalk.green('Warnings: 0'));
    }
  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
