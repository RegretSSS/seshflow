import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';
import crypto from 'crypto';

/**
 * Generate task hash for deduplication
 */
function generateTaskHash(title, description) {
  const content = `${title.trim()}\n${(description || '').trim()}`;
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}

/**
 * Parse task line from markdown
 * Format: - [ ] Task title [P0] [tag1,tag2] [4h] [@assignee] [dependency:id]
 */
function parseTaskLine(line, lineNumber, isCompleted = false) {
  // Remove checkbox
  const taskLine = line.replace(/^-\s*\[[ x]\]\s*/, '').trim();

  if (!taskLine) return null;

  const task = {
    title: '',
    description: '',
    status: isCompleted ? 'done' : 'backlog',
    priority: 'P2',
    tags: [],
    estimatedHours: 0,
    assignee: null,
    dependencies: [],
  };

  // Extract title (everything before first bracket or end)
  const titleMatch = taskLine.match(/^(.+?)(?:\s+\[|$)/);
  if (titleMatch) {
    task.title = titleMatch[1].trim();
  } else {
    task.title = taskLine.trim();
  }

  // Extract all bracketed content
  const allMatches = taskLine.matchAll(/\[([^\]]+)\]/g);
  for (const match of allMatches) {
    const content = match[1];

    // Check if it's priority (P0-P3)
    if (content.match(/^P[0-3]$/)) {
      task.priority = content;
      task.tags.push(content); // Add priority as a tag
      continue;
    }

    // Skip if it's hours (digits+h)
    if (content.match(/^\d+(\.\d+)?h$/i)) {
      task.estimatedHours = parseFloat(content);
      continue;
    }

    // Skip if it's assignee (@xxx)
    if (content.startsWith('@')) {
      task.assignee = content.substring(1);
      continue;
    }

    // Skip if it's dependency (依赖:xxx or dependency:xxx)
    if (content.match(/^(依赖|dependency):/i)) {
      const depString = content.replace(/^(依赖|dependency):\s*/i, '');
      task.dependencies = depString.split(',').map(d => d.trim());
      continue;
    }

    // Everything else is a tag - split by comma and add
    const tags = content.split(',').map(t => t.trim()).filter(Boolean);
    task.tags.push(...tags);
  }

  // Remove duplicate tags
  task.tags = [...new Set(task.tags)];

  return task.title ? task : null;
}

/**
 * Parse markdown file and extract tasks
 */
async function parseMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const tasks = [];
  let currentPhase = '';
  let currentTask = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('```')) continue;

    // Check for phase/group heading (## or ###)
    if (line.startsWith('##')) {
      currentPhase = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Check if it's a subtask (indented)
    if (rawLine.startsWith('  -') || rawLine.startsWith('\t-')) {
      if (currentTask) {
        const isCompleted = line.match(/\[x\]/i) !== null;
        const subtaskTitle = line.replace(/^[\s\t]*-\s*\[[x ]\]\s*/, '').trim();

        // Extract subtask priority if any
        const priorityMatch = subtaskTitle.match(/\[P[0-3]\]/);
        const priority = priorityMatch ? priorityMatch[0] : '';

        // Clean title
        const title = subtaskTitle.replace(/\[.*?\]/g, '').trim();

        // Extract hours
        const hoursMatch = subtaskTitle.match(/\[(\d+(\.\d+)?)h\]/i);
        const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;

        currentTask.subtasks.push({
          title: title,
          completed: isCompleted,
          priority: priority,
          estimatedHours: hours
        });
      }
      continue;
    }

    // Check for description line
    if (line.startsWith('>')) {
      const descLine = line.replace(/^>\s*/, '').trim();
      if (currentTask) {
        currentTask.description = (currentTask.description || '') + descLine + '\n';
      }
      continue;
    }

    // Check for task line
    if (line.match(/^-\s*\[[ x]\]/)) {
      const isCompleted = line.match(/^-\s*\[x\]/i) !== null;
      const task = parseTaskLine(line, i + 1, isCompleted);

      if (task) {
        // Initialize subtasks array
        task.subtasks = [];

        // Add phase as a tag if present
        if (currentPhase && !task.tags.includes(currentPhase)) {
          task.tags.push(currentPhase);
        }

        tasks.push(task);
        currentTask = task; // Set as current task for descriptions
      }
    }
  }

  // Trim description whitespace
  tasks.forEach(task => {
    if (task.description) {
      task.description = task.description.trim();
    }
  });

  return tasks;
}

/**
 * Validate tasks before import
 */
function validateTasks(tasks) {
  const errors = [];
  const warnings = [];

  tasks.forEach((task, index) => {
    const taskNum = index + 1;

    // Check required fields
    if (!task.title) {
      errors.push(`任务 ${taskNum}: 缺少标题`);
    }

    // Check priority
    if (!['P0', 'P1', 'P2', 'P3'].includes(task.priority)) {
      warnings.push(`任务 ${taskNum}: 无效的优先级 ${task.priority}`);
    }

    // Check hours
    if (task.estimatedHours < 0) {
      errors.push(`任务 ${taskNum}: 工时不能为负数`);
    }

    // Check if task has description but should have one
    if (!task.description && task.estimatedHours > 4) {
      warnings.push(`任务 ${taskNum}: 大任务(${task.estimatedHours}h)缺少描述`);
    }
  });

  return { errors, warnings };
}

/**
 * Resolve dependencies from numbers/indices to task IDs
 */
function resolveDependencies(tasks, createdTasks) {
  createdTasks.forEach((task, index) => {
    if (task.dependencies && task.dependencies.length > 0) {
      const resolvedDeps = task.dependencies.map(dep => {
        // If dependency is a number, resolve to task ID
        const num = parseInt(dep);
        if (!isNaN(num)) {
          const targetIndex = num - 1;
          if (targetIndex >= 0 && targetIndex < createdTasks.length) {
            return createdTasks[targetIndex].id;
          }
        }
        // Otherwise return as-is (assuming it's a task ID)
        return dep;
      });

      task.dependencies = resolvedDeps;
      task.blockedBy = resolvedDeps;
    }
  });
}

/**
 * Import tasks from markdown file
 */
export async function importTasks(filePath, options = {}) {
  const spinner = ora('Loading and parsing tasks').start();

  try {
    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      spinner.fail('File not found');
      console.error(chalk.red(`\nError: File not found: ${filePath}`));
      process.exit(1);
    }

    // Parse markdown file
    spinner.text = 'Parsing markdown file';
    const tasks = await parseMarkdownFile(filePath);

    if (tasks.length === 0) {
      spinner.warn('No tasks found');
      console.log(chalk.yellow('\nNo tasks found in the file.'));
      console.log(chalk.gray('Make sure your tasks follow the format:'));
      console.log(chalk.gray('  - [ ] Task title [P0] [tag1,tag2] [4h]'));
      return;
    }

    // Validate tasks
    spinner.text = 'Validating tasks';
    const { errors, warnings } = validateTasks(tasks);

    if (errors.length > 0) {
      spinner.fail('Validation failed');
      console.error(chalk.red('\n❌ Validation errors:'));
      errors.forEach((error) => console.error(chalk.red(`  • ${error}`)));
      process.exit(1);
    }

    // Show warnings if any
    if (warnings.length > 0 && !options.force) {
      spinner.warn('Validation warnings');
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      warnings.forEach((warning) => console.log(chalk.yellow(`  • ${warning}`)));

      if (!options.dryRun) {
        console.log(chalk.gray('\nUse --force to ignore warnings'));
      }
    }

    // Dry run mode
    if (options.dryRun) {
      spinner.succeed('Dry run completed');
      console.log(chalk.green(`\n✓ Would import ${tasks.length} tasks:\n`));

      tasks.forEach((task, index) => {
        const descPreview = task.description ?
          task.description.substring(0, 50) + (task.description.length > 50 ? '...' : '') :
          '(no description)';

        console.log(chalk.gray(`${index + 1}. ${task.title}`));
        console.log(chalk.dim(`   Priority: ${task.priority}`));
        console.log(chalk.dim(`   Tags: ${task.tags.join(', ') || 'none'}`));
        console.log(chalk.dim(`   Description: ${descPreview}`));
        if (task.estimatedHours > 0) {
          console.log(chalk.dim(`   Hours: ${task.estimatedHours}h`));
        }
        console.log('');
      });

      return;
    }

    // Import tasks
    spinner.text = 'Importing tasks';
    const manager = new TaskManager();
    await manager.init();

    // Deduplication
    const existingTasks = manager.getTasks();
    const existingHashes = new Map();

    existingTasks.forEach(task => {
      const hash = generateTaskHash(task.title, task.description);
      existingHashes.set(hash, task);
    });

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      duplicates: []
    };

    const createdTasks = [];

    for (const taskData of tasks) {
      const hash = generateTaskHash(taskData.title, taskData.description);
      const existing = existingHashes.get(hash);

      if (!existing) {
        // New task - create
        const created = await manager.createTask({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
        });

        // Add subtasks if any
        if (taskData.subtasks && taskData.subtasks.length > 0) {
          created.subtasks = taskData.subtasks;
        }

        createdTasks.push(created);
        results.created++;
      }
      else if (options.update) {
        // Task exists - update
        await manager.updateTask(existing.id, {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
        });
        results.updated++;
      }
      else if (options.force) {
        // Force create - don't check duplicates
        const created = await manager.createTask({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
        });

        if (taskData.subtasks && taskData.subtasks.length > 0) {
          created.subtasks = taskData.subtasks;
        }

        createdTasks.push(created);
        results.created++;
      }
      else {
        // Skip duplicate
        results.skipped++;
        results.duplicates.push({
          existing: existing,
          new: taskData
        });
      }
    }

    // Save all tasks
    await manager.saveData();

    // Resolve dependencies (convert numeric indices to task IDs)
    resolveDependencies(tasks, createdTasks);

    // Update tasks with resolved dependencies and subtasks
    for (const task of createdTasks) {
      await manager.updateTask(task.id, {
        dependencies: task.dependencies,
        blockedBy: task.blockedBy,
        subtasks: task.subtasks
      });
    }

    // Final save
    await manager.saveData();

    spinner.succeed('Tasks imported successfully');

    // Display results
    if (results.skipped > 0) {
      console.log(chalk.cyan(`\n📊 Import Results:`));
      console.log(chalk.green(`  ✓ Created: ${results.created} new tasks`));
      console.log(chalk.yellow(`  ⏭ Skipped: ${results.skipped} duplicates`));
      if (results.updated > 0) {
        console.log(chalk.blue(`  ↻ Updated: ${results.updated} tasks`));
      }
    }

    console.log(chalk.green(`\n✓ Processed ${tasks.length} tasks (${results.created} created, ${results.skipped} skipped)\n`));

    // Show imported tasks
    if (results.created > 0) {
      createdTasks.forEach((task, index) => {
        const priorityColor = {
          P0: 'red',
          P1: 'yellow',
          P2: 'blue',
          P3: 'green',
        }[task.priority] || 'gray';

        console.log(chalk.gray(`${index + 1}. ${task.title}`));
        console.log(chalk.dim(`   ID: ${task.id}`));
        console.log(chalk[priorityColor](`   Priority: ${task.priority}`));

        if (task.tags && task.tags.length > 0) {
          console.log(chalk.dim(`   Tags: ${task.tags.join(', ')}`));
        }

        if (task.description) {
          const descPreview = task.description.substring(0, 60);
          console.log(chalk.dim(`   Description: ${descPreview}${task.description.length > 60 ? '...' : ''}`));
        }

        if (task.estimatedHours > 0) {
          console.log(chalk.dim(`   Hours: ${task.estimatedHours}h`));
        }

        if (task.dependencies && task.dependencies.length > 0) {
          console.log(chalk.dim(`   Depends on: ${task.dependencies.join(', ')}`));
        }

        if (task.subtasks && task.subtasks.length > 0) {
          console.log(chalk.dim(`   Subtasks: ${task.subtasks.length}`));
        }

        console.log('');
      });
    }

    if (results.skipped > 0 && !options.force) {
      console.log(chalk.blue('\n💡 Tip: Use --update to update existing tasks'));
      console.log(chalk.gray('         Use --force to force create duplicates\n'));
    }

    console.log(chalk.blue('Next steps:'));
    console.log(chalk.gray('  seshflow next     - Start working on first task'));
    console.log(chalk.gray('  seshflow query    - Query tasks by filters'));
    console.log(chalk.gray('  seshflow stats    - Show statistics'));

  } catch (error) {
    spinner.fail('Import failed');
    console.error(chalk.red(`\nError: ${error.message}`));

    if (error.message.includes('unexpected token')) {
      console.error(chalk.yellow('\n💡 Tip: Make sure your markdown file is properly formatted'));
      console.error(chalk.gray('Example:'));
      console.error(chalk.gray('  - [ ] Task title [P0] [tag1,tag2] [4h]'));
    }

    process.exit(1);
  }
}
