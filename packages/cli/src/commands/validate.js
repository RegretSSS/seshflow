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

function createIssue(message, line = null, suggestion = null) {
  return { message, line, suggestion };
}

function formatIssue(issue) {
  const linePrefix = issue.line ? `Line ${issue.line}: ` : '';
  const suggestion = issue.suggestion ? ` | fix: ${issue.suggestion}` : '';
  return `${linePrefix}${issue.message}${suggestion}`;
}

function printIssues(errors, warnings) {
  console.error(chalk.red('\nErrors:'));
  errors.forEach(issue => console.error(chalk.red(`  - ${formatIssue(issue)}`)));

  if (warnings.length > 0) {
    console.error(chalk.yellow('\nWarnings:'));
    warnings.forEach(issue => console.error(chalk.yellow(`  - ${formatIssue(issue)}`)));
  }
}

function printFormatHints() {
  console.error(chalk.blue('\nAccepted task patterns:'));
  console.error(chalk.gray('  - [ ] Task title [P1] [id:task_example] [dependency:task_other]'));
  console.error(chalk.gray('    priority: P1'));
  console.error(chalk.gray('    estimate: 2h'));
  console.error(chalk.gray('    depends: task_other'));
}

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
          warnings.push(createIssue(`unrecognized priority value "${value}"`, i + 1, 'use P0, P1, P2, or P3'));
        }
        continue;
      }

      if (ESTIMATE_PREFIX_RE.test(normalized)) {
        const value = normalized.replace(ESTIMATE_PREFIX_RE, '').trim();
        const hoursMatch = value.match(/^-?\d+(\.\d+)?h?$/i);
        if (!hoursMatch) {
          errors.push(createIssue(`invalid estimate value "${value}"`, i + 1, 'use number or number+h, for example 2 or 2h'));
        } else if (parseFloat(value) < 0) {
          errors.push(createIssue('estimate cannot be negative', i + 1));
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
      errors.push(createIssue('no task lines found', null, 'start each task with "- [ ] Task title [P1]"'));
    }

    const seenTaskIds = new Set();
    tasks.forEach(task => {
      if (!task.title) {
        errors.push(createIssue('missing task title', task.lineNo, 'add text after "- [ ]"'));
      }
      if (task.taskId && !/^task_[a-z0-9_]+$/i.test(task.taskId)) {
        errors.push(createIssue(`invalid task id "${task.taskId}"`, task.lineNo, 'use ids like task_example or task_login_api'));
      }
      if (task.taskId && seenTaskIds.has(task.taskId)) {
        errors.push(createIssue(`duplicate task id "${task.taskId}"`, task.lineNo, 'keep each [id:task_xxx] unique within the file'));
      }
      if (task.taskId) {
        seenTaskIds.add(task.taskId);
      }
      if (!task.hasPriority) {
        warnings.push(createIssue('missing priority [P0-P3]', task.lineNo, 'append [P0], [P1], [P2], or [P3] to the task line'));
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
          warnings.push(createIssue(`unresolved dependency "${dep}"`, task.lineNo, 'reference a task number, title, or stable id like task_example'));
        }
      });
    });

    if (errors.length > 0) {
      spinner.fail('Validation failed');
      printIssues(errors, warnings);
      printFormatHints();
      process.exit(1);
    }

    spinner.succeed('Validation passed');
    console.log(chalk.green(`\nTasks found: ${tasks.length}`));
    if (warnings.length > 0) {
      console.log(chalk.yellow(`Warnings: ${warnings.length}`));
      warnings.forEach(warning => console.log(chalk.yellow(`  - ${formatIssue(warning)}`)));
    } else {
      console.log(chalk.green('Warnings: 0'));
    }
  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
