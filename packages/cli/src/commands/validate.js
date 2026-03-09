import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';

const MAIN_TASK_LINE_RE = /^-\s*\[[ x]\]\s+(.+)$/i;
const SUBTASK_LINE_RE = /^\s+[-*]\s*\[[ x]\]\s+(.+)$/i;
const DEPENDENCY_PREFIX_RE = /^(dependency|depends|dep|\u4f9d\u8d56)\s*:/i;
const ID_PREFIX_RE = /^id\s*:/i;
const TAG_PREFIX_RE = /^(\u6807\u7b7e|tags?)\s*[:\uff1a]\s*/i;
const PRIORITY_PREFIX_RE = /^(\u4f18\u5148\u7ea7|priority)\s*[:\uff1a]\s*/i;
const ESTIMATE_PREFIX_RE = /^(\u9884\u4f30|estimate)\s*[:\uff1a]\s*/i;

function parseInlineTokens(text) {
  const result = {
    hasPriority: false,
    hasEstimate: false,
    dependencies: [],
    taskId: null,
  };

  const matches = [...String(text).matchAll(/\[([^\]]+)\]/g)];
  matches.forEach(match => {
    const token = match[1].trim();
    if (/^P[0-3]$/i.test(token)) {
      result.hasPriority = true;
      return;
    }
    if (/^-?\d+(\.\d+)?h$/i.test(token)) {
      result.hasEstimate = true;
      return;
    }
    if (DEPENDENCY_PREFIX_RE.test(token)) {
      result.dependencies.push(
        ...token
          .replace(DEPENDENCY_PREFIX_RE, '')
          .split(',')
          .map(dep => dep.trim())
          .filter(Boolean)
      );
      return;
    }
    if (ID_PREFIX_RE.test(token)) {
      result.taskId = token.replace(ID_PREFIX_RE, '').trim() || null;
    }
  });

  return result;
}

function parseMainTaskTitle(rawLine) {
  const match = rawLine.match(MAIN_TASK_LINE_RE);
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

    let currentTask = null;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = rawLine.trim();
      if (!line || line.startsWith('```')) continue;

      if (SUBTASK_LINE_RE.test(rawLine)) {
        continue;
      }

      const mainTitle = parseMainTaskTitle(rawLine);
      if (mainTitle) {
        const lineNo = i + 1;
        const tokenInfo = parseInlineTokens(rawLine);
        currentTask = {
          title: mainTitle,
          lineNo,
          hasPriority: tokenInfo.hasPriority,
          hasEstimate: tokenInfo.hasEstimate,
          dependencies: [...tokenInfo.dependencies],
          taskId: tokenInfo.taskId,
        };
        tasks.push(currentTask);
        continue;
      }

      if (!currentTask) continue;

      const normalized = line.replace(/^[-*]\s*/, '');

      if (PRIORITY_PREFIX_RE.test(normalized)) {
        const value = normalized.replace(PRIORITY_PREFIX_RE, '').trim();
        if (/^P[0-3]$/i.test(value)) {
          currentTask.hasPriority = true;
        } else {
          warnings.push(`Line ${i + 1}: unrecognized priority value "${value}"`);
        }
        continue;
      }

      if (ESTIMATE_PREFIX_RE.test(normalized)) {
        const value = normalized.replace(ESTIMATE_PREFIX_RE, '').trim();
        const hoursMatch = value.match(/^-?\d+(\.\d+)?h?$/i);
        if (!hoursMatch) {
          errors.push(`Line ${i + 1}: invalid estimate value "${value}"`);
        } else if (parseFloat(value) < 0) {
          errors.push(`Line ${i + 1}: estimate cannot be negative`);
        } else {
          currentTask.hasEstimate = true;
        }
        continue;
      }

      if (DEPENDENCY_PREFIX_RE.test(normalized)) {
        currentTask.dependencies.push(
          ...normalized
            .replace(DEPENDENCY_PREFIX_RE, '')
            .split(',')
            .map(dep => dep.trim())
            .filter(Boolean)
        );
        continue;
      }

      if (ID_PREFIX_RE.test(normalized)) {
        currentTask.taskId = normalized.replace(ID_PREFIX_RE, '').trim() || null;
        continue;
      }

      if (TAG_PREFIX_RE.test(normalized)) {
        continue;
      }
    }

    if (tasks.length === 0) {
      errors.push('No task lines found');
    }

    const seenTaskIds = new Set();
    tasks.forEach(task => {
      if (!task.title) {
        errors.push(`Line ${task.lineNo}: missing task title`);
      }
      if (task.taskId && !/^task_[a-z0-9_]+$/i.test(task.taskId)) {
        errors.push(`Line ${task.lineNo}: invalid task id "${task.taskId}"`);
      }
      if (task.taskId && seenTaskIds.has(task.taskId)) {
        errors.push(`Line ${task.lineNo}: duplicate task id "${task.taskId}"`);
      }
      if (task.taskId) {
        seenTaskIds.add(task.taskId);
      }
      if (!task.hasPriority) {
        warnings.push(`Line ${task.lineNo}: missing priority [P0-P3]`);
      }
    });

    const taskTitles = new Set(tasks.map(task => task.title));
    const taskLineCount = tasks.length;

    tasks.forEach(task => {
      task.dependencies.forEach(dep => {
        const numericIndex = Number.parseInt(dep, 10);
        const byIndex = Number.isInteger(numericIndex) && numericIndex > 0 && numericIndex <= taskLineCount;
        const byTitle = taskTitles.has(dep);
        const byTaskId = /^task_[a-z0-9_]+$/i.test(dep);
        if (!byIndex && !byTitle && !byTaskId) {
          warnings.push(`Line ${task.lineNo}: unresolved dependency "${dep}"`);
        }
      });
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
