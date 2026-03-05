import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatTaskJSON, formatSuccessResponse, outputJSON, isJSONMode } from '../utils/json-output.js';

/**
 * Display task as tree node
 */
function displayTaskTree(task, prefix = '', isLast = true) {
  const connector = isLast ? '└──' : '├──';
  const priorityColor = {
    P0: 'red',
    P1: 'yellow',
    P2: 'blue',
    P3: 'green',
  }[task.priority] || 'gray';

  // Status icon
  const statusIcon = {
    'done': chalk.green('✅'),
    'in-progress': chalk.yellow('⏳'),
    'todo': chalk.blue('⏸️'),
    'backlog': chalk.gray('⏸️'),
    'blocked': chalk.red('🚫'),
  }[task.status] || '⏸️';

  const timeInfo = task.actualHours > 0
    ? chalk.dim(` - ${task.actualHours}h`)
    : task.estimatedHours > 0
    ? chalk.dim(` - 预估${task.estimatedHours}h`)
    : '';

  console.log(
    chalk.gray(prefix) +
    connector + ' ' +
    statusIcon + ' ' +
    chalk.gray(task.id + ': ') +
    chalk.white(task.title) +
    ' ' +
    chalk[priorityColor](`[${task.priority}]`) +
    timeInfo
  );
}

/**
 * Display dependency tree
 */
function displayDependencyTree(task, prefix = '', isLast = true) {
  const allTasks = task.manager.tasks || [];

  if (task.dependencies && task.dependencies.length > 0) {
    task.dependencies.forEach((depId, index) => {
      const depTask = allTasks.find(t => t.id === depId);
      if (depTask) {
        const isLastDep = index === task.dependencies.length - 1;
        displayTaskTree(depTask, prefix + '  ', isLastDep);
      }
    });
  }
}

/**
 * Generate Mermaid graph
 */
function generateMermaidGraph(allTasks) {
  const lines = ['graph TD', '    Style=[{font-size: 12px;}'];

  // Track processed edges to avoid duplicates
  const processedEdges = new Set();

  allTasks.forEach(task => {
    const nodeId = task.id.replace(/[^a-zA-Z0-9]/g, '_');

    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const edgeKey = `${depId}->${task.id}`;
        if (!processedEdges.has(edgeKey)) {
          const depNodeId = depId.replace(/[^a-zA-Z0-9]/g, '_');
          const depTask = allTasks.find(t => t.id === depId);
          if (depTask) {
            lines.push(
              `    ${depNodeId}["${depTask.title}\\n(${depTask.priority})"] --> ${nodeId}["${task.title}\\n(${task.priority})"]`
            );
            processedEdges.add(edgeKey);
          }
        }
      });
    }
  });

  return lines.join('\n');
}

/**
 * Dependencies command
 */
export async function deps(taskId, options = {}) {
  const spinner = ora('Loading dependencies').start();

  try {
    const manager = new TaskManager();
    await manager.init();
    const allTasks = manager.tasks || [];

    // JSON mode
    if (isJSONMode(options)) {
      if (taskId) {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) {
          spinner.fail('Task not found');
          outputJSON(formatErrorResponse(new Error('Task not found'), 'NOT_FOUND'));
          return;
        }

        // Get dependencies
        const dependencies = task.dependencies
          .map(depId => allTasks.find(t => t.id === depId))
          .filter(Boolean)
          .map(t => formatTaskJSON(t));

        // Get dependents
        const dependents = allTasks
          .filter(t => t.dependencies && t.dependencies.includes(taskId))
          .map(t => formatTaskJSON(t));

        outputJSON(formatSuccessResponse({
          task: formatTaskJSON(task),
          dependencies,
          dependents,
        }));

        spinner.succeed('Dependencies loaded');
      } else {
        // Show all dependencies as JSON
        const allDeps = allTasks.map(task => ({
          id: task.id,
          title: task.title,
          dependencies: task.dependencies || [],
          dependents: (task.dependencies || [])
            .map(depId => allTasks.find(t => t.id === depId).title)
            .filter(Boolean),
        }));

        outputJSON(formatSuccessResponse({
          tasks: allDeps,
          totalTasks: allTasks.length,
        }));

        spinner.succeed('All dependencies loaded');
      }
      return;
    }

    // Normal mode
    if (taskId) {
      // Show single task dependencies
      const task = allTasks.find(t => t => t.id === taskId);
      if (!task) {
        spinner.fail('Task not found');
        console.error(chalk.red(`\nError: Task not found: ${taskId}`));
        process.exit(1);
      }

      spinner.stop();

      console.log(chalk.bold.cyan(`\n📊 ${task.title}\n`));
      console.log(chalk.gray(`ID: ${task.id}`));
      console.log(chalk.gray(`优先级: ${task.priority}`));
      console.log(chalk.gray(`状态: ${task.status}`));

      // Show dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        console.log(chalk.bold('\n📥 依赖关系:\n'));

        task.dependencies.forEach((depId, index) => {
          const depTask = allTasks.find(t => t.id === depId);
          if (depTask) {
            const isLast = index === task.dependencies.length - 1;
            displayTaskTree(depTask, '', isLast);
          }
        });
      } else {
        console.log(chalk.gray('\n✓ 无依赖'));
      }

      // Show dependents
      const dependents = allTasks.filter(t =>
        t.dependencies && t.dependencies.includes(taskId)
      );

      if (dependents.length > 0) {
        console.log(chalk.bold('\n📤 被依赖:\n'));

        dependents.forEach((depTask, index) => {
          const isLast = index === dependents.length - 1;
          displayTaskTree(depTask, '', isLast);
        });
      } else {
        console.log(chalk.gray('\n✓ 无其他任务依赖此任务'));
      }

      // Show blocking info
      const unmetDeps = manager.getUnmetDependencies(task);
      if (unmetDeps.length > 0) {
        console.log(chalk.bold.yellow('\n⚠️  阻塞任务:'));
        unmetDeps.forEach(dep => {
          console.log(chalk.yellow(`  • ${dep.title} (${dep.status})`));
        });
      }

    } else if (options.graph) {
      // Show Mermaid graph
      spinner.text = 'Generating dependency graph';
      const mermaidGraph = generateMermaidGraph(allTasks);
      spinner.stop();

      console.log(chalk.bold.cyan('\n📊 任务依赖图\n'));
      console.log(chalk.gray('复制以下代码到 https://mermaid.live/ 查看可视化图：\n'));
      console.log(chalk.cyan(mermaidGraph));
      console.log(chalk.gray('\n'));
      console.log(chalk.blue('💡 提示: 使用 "seshflow deps <task-id>" 查看单个任务的依赖'));

    } else {
      spinner.stop();
      console.log(chalk.bold.cyan('\n📊 所有任务的依赖关系\n'));

      // Show summary
      const tasksWithDeps = allTasks.filter(t =>
        t.dependencies && t.dependencies.length > 0
      );

      const tasksWithDependents = allTasks.filter(t =>
        allTasks.some(other =>
          other.dependencies && other.dependencies.includes(t.id)
        )
      );

      console.log(chalk.gray(`总任务: ${allTasks.length}`));
      console.log(chalk.gray(`有依赖的任务: ${tasksWithDeps.length}`));
      console.log(chalk.gray(`被依赖的任务: ${tasksWithDependents.length}`));

      if (tasksWithDeps.length > 0) {
        console.log(chalk.bold('\n📥 有依赖的任务:\n'));
        tasksWithDeps.forEach(task => {
          console.log(chalk.white(`• ${task.title}`));
          console.log(chalk.dim(`  ${task.dependencies.join(', ')}`));
        });
      }

      console.log(chalk.bold('\n💡 命令示例:\n'));
      console.log(chalk.cyan('  # 查看单个任务的依赖'));
      console.log(chalk.gray('  seshflow deps <task-id>\n'));

      console.log(chalk.cyan('  # 生成依赖图'));
      console.log(chalk.gray('  seshflow deps --graph\n'));

      console.log(chalk.cyan('  # JSON 输出'));
      console.log(chalk.gray('  seshflow deps --json'));
    }

  } catch (error) {
    spinner.fail('Failed to load dependencies');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
