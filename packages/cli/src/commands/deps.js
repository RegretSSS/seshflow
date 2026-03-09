import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatTaskJSON, formatSuccessResponse, outputJSON, isJSONMode, formatErrorResponse } from '../utils/json-output.js';
import { resolveOutputMode } from '../utils/output-mode.js';

function statusMark(status) {
  return {
    done: 'D',
    'in-progress': 'I',
    todo: 'T',
    backlog: 'B',
    blocked: 'X',
    review: 'R',
  }[status] || 'B';
}

function printTaskLine(task) {
  console.log(`  ${statusMark(task.status)} ${task.id} | ${task.status} | ${task.priority} | ${task.title}`);
}

function generateMermaidGraph(allTasks) {
  const lines = ['graph TD'];
  const processedEdges = new Set();

  allTasks.forEach(task => {
    const nodeId = task.id.replace(/[^a-zA-Z0-9]/g, '_');
    (task.dependencies || []).forEach(depId => {
      const edgeKey = `${depId}->${task.id}`;
      if (processedEdges.has(edgeKey)) return;

      const depNodeId = depId.replace(/[^a-zA-Z0-9]/g, '_');
      const depTask = allTasks.find(t => t.id === depId);
      if (!depTask) return;

      lines.push(`    ${depNodeId}["${depTask.title}\\n(${depTask.priority})"] --> ${nodeId}["${task.title}\\n(${task.priority})"]`);
      processedEdges.add(edgeKey);
    });
  });

  return lines.join('\n');
}

export async function deps(taskId, options = {}) {
  const mode = resolveOutputMode(options);
  const compactMode = mode === 'compact';
  const spinner = compactMode ? null : ora('Loading dependencies').start();

  try {
    const manager = new TaskManager();
    await manager.init();
    const allTasks = manager.getTasks() || [];

    if (isJSONMode(options)) {
      spinner?.stop();
      if (taskId) {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) {
          outputJSON(formatErrorResponse(new Error('Task not found'), 'NOT_FOUND'));
          return;
        }

        const dependencies = (task.dependencies || [])
          .map(depId => allTasks.find(t => t.id === depId))
          .filter(Boolean)
          .map(t => formatTaskJSON(t));

        const dependents = allTasks
          .filter(t => t.dependencies && t.dependencies.includes(taskId))
          .map(t => formatTaskJSON(t));

        outputJSON(formatSuccessResponse({
          task: formatTaskJSON(task),
          dependencies,
          dependents,
        }));
      } else {
        const allDeps = allTasks.map(task => ({
          id: task.id,
          title: task.title,
          dependencies: task.dependencies || [],
          dependents: allTasks
            .filter(t => t.dependencies && t.dependencies.includes(task.id))
            .map(t => t.id),
        }));

        outputJSON(formatSuccessResponse({
          tasks: allDeps,
          totalTasks: allTasks.length,
        }));
      }
      return;
    }

    if (taskId) {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) {
        spinner?.fail('Task not found');
        console.error(chalk.red(`\nError: Task not found: ${taskId}`));
        process.exit(1);
      }

      spinner?.stop();
      console.log(chalk.bold.cyan(`\nDependencies: ${task.title}`));
      console.log(chalk.gray(`  ${task.id} | ${task.status} | ${task.priority}`));

      const dependencies = (task.dependencies || [])
        .map(depId => allTasks.find(t => t.id === depId))
        .filter(Boolean);

      if (dependencies.length > 0) {
        console.log(chalk.bold('\nDepends on:'));
        dependencies.forEach(printTaskLine);
      } else {
        console.log(chalk.gray('\n  No dependencies.'));
      }

      const dependents = allTasks.filter(t => t.dependencies && t.dependencies.includes(task.id));
      if (dependents.length > 0) {
        console.log(chalk.bold('\nRequired by:'));
        dependents.forEach(printTaskLine);
      }

      const unmetDeps = manager.getUnmetDependencies(task);
      if (unmetDeps.length > 0) {
        console.log(chalk.yellow('\nBlocked by unmet dependencies:'));
        unmetDeps.forEach(dep => {
          console.log(chalk.yellow(`  - ${dep.id} | ${dep.status} | ${dep.title}`));
        });
      }

      console.log('');
      return;
    }

    if (options.graph) {
      if (spinner) {
        spinner.text = 'Generating dependency graph';
      }
      const mermaidGraph = generateMermaidGraph(allTasks);
      spinner?.stop();
      console.log(chalk.bold.cyan('\nTask Dependency Graph\n'));
      console.log(chalk.gray('Paste into https://mermaid.live/ to visualize:\n'));
      console.log(chalk.cyan(mermaidGraph));
      console.log('');
      return;
    }

    spinner?.stop();
    const tasksWithDeps = allTasks.filter(t => t.dependencies && t.dependencies.length > 0);
    const tasksWithDependents = allTasks.filter(t => allTasks.some(other => other.dependencies && other.dependencies.includes(t.id)));

    if (compactMode) {
      console.log(`DEPS_SUMMARY | total=${allTasks.length} | has_deps=${tasksWithDeps.length} | required_by_others=${tasksWithDependents.length}`);
      return;
    }

    console.log(chalk.bold.cyan('\nDependency Summary\n'));
    console.log(chalk.gray(`  Total tasks: ${allTasks.length}`));
    console.log(chalk.gray(`  Tasks with dependencies: ${tasksWithDeps.length}`));
    console.log(chalk.gray(`  Tasks required by others: ${tasksWithDependents.length}`));

    if (tasksWithDeps.length > 0) {
      console.log(chalk.bold('\nTasks with dependencies:'));
      tasksWithDeps.forEach(task => {
        console.log(chalk.white(`  - ${task.title}`));
        console.log(chalk.dim(`    ${task.id} | depends on: ${(task.dependencies || []).join(', ')}`));
      });
    }

    console.log(chalk.blue('\nTips:'));
    console.log(chalk.gray('  seshflow deps <task-id>')); 
    console.log(chalk.gray('  seshflow add-dep <task-id> <depends-on-task-id>'));
    console.log(chalk.gray('  seshflow remove-dep <task-id> <depends-on-task-id>'));
    console.log(chalk.gray('  seshflow deps --graph'));
    console.log(chalk.gray('  seshflow deps'));
    console.log('');
  } catch (error) {
    spinner?.fail('Failed to load dependencies');
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'DEPS_FAILED'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
    process.exit(1);
  }
}
