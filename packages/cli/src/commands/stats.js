import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { formatSuccessResponse, outputJSON, isJSONMode } from '../utils/json-output.js';

/**
 * Display statistics by priority
 */
function displayByPriority(tasks) {
  const priorityStats = {
    P0: { total: 0, completed: 0, inProgress: 0 },
    P1: { total: 0, completed: 0, inProgress: 0 },
    P2: { total: 0, completed: 0, inProgress: 0 },
    P3: { total: 0, completed: 0, inProgress: 0 },
  };

  tasks.forEach(task => {
    const priority = task.priority;
    if (priorityStats[priority]) {
      priorityStats[priority].total++;
      if (task.status === 'done') priorityStats[priority].completed++;
      if (task.status === 'in-progress') priorityStats[priority].inProgress++;
    }
  });

  console.log(chalk.bold('\n📊 按优先级统计:\n'));

  Object.entries(priorityStats).forEach(([priority, stats]) => {
    if (stats.total > 0) {
      const color = {
        P0: 'red',
        P1: 'yellow',
        P2: 'blue',
        P3: 'green',
      }[priority];

      const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

      console.log(
        chalk[color](`  ${priority}:`) +
        chalk.gray(` ${stats.total} 个任务 | `) +
        chalk.green(`${stats.completed} 完成`) +
        chalk.gray(' | ') +
        chalk.yellow(`${stats.inProgress} 进行中`) +
        chalk.gray(` | 进度: ${progress}%`)
      );
    }
  });
  console.log('');
}

/**
 * Display statistics by tags
 */
function displayByTags(tasks) {
  const tagStats = {};

  tasks.forEach(task => {
    if (task.tags && task.tags.length > 0) {
      task.tags.forEach(tag => {
        if (!tagStats[tag]) {
          tagStats[tag] = { total: 0, completed: 0 };
        }
        tagStats[tag].total++;
        if (task.status === 'done') {
          tagStats[tag].completed++;
        }
      });
    }
  });

  // Sort by count
  const sortedTags = Object.entries(tagStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10); // Top 10 tags

  if (sortedTags.length === 0) {
    console.log(chalk.gray('\n🏷️  按标签统计: 无标签\n'));
    return;
  }

  console.log(chalk.bold('\n🏷️  按标签统计 (Top 10):\n'));

  sortedTags.forEach(([tag, stats]) => {
    const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    console.log(
      chalk.cyan(`  ${tag}:`) +
      chalk.gray(` ${stats.total} 个任务 | `) +
      chalk.green(`${stats.completed} 完成`) +
      chalk.gray(` | 进度: ${progress}%`)
    );
  });
  console.log('');
}

/**
 * Display overall statistics
 */
function displayOverall(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const backlog = tasks.filter(t => t.status === 'backlog').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (parseFloat(t.actualHours) || 0), 0);

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  console.log(chalk.bold.cyan('\n📊 Seshflow 统计\n'));

  console.log(chalk.gray(`   总任务: ${total}`));
  console.log(chalk.gray(`   ${chalk.green(completed + ' 完成')} | ${chalk.yellow(inProgress + ' 进行中')} | ${chalk.blue(todo + ' 待办')} | ${chalk.gray(backlog + ' 待办池')} | ${chalk.red(blocked + ' 阻塞')}`));
  console.log(chalk.gray(`   进度: ${progress}%\n`));

  if (totalEstimated > 0) {
    console.log(chalk.gray(`   预估工时: ${totalEstimated}h`));
    console.log(chalk.gray(`   实际工时: ${totalActual}h`));
    const hoursProgress = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;
    console.log(chalk.gray(`   工时进度: ${hoursProgress}%\n`));
  }
}

/**
 * Show task statistics
 */
export async function stats(options = {}) {
  const spinner = ora('Loading statistics').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    const allTasks = manager.getTasks();

    spinner.stop();

    // JSON mode
    if (isJSONMode(options)) {
      const priorityStats = {
        P0: { total: 0, completed: 0, inProgress: 0 },
        P1: { total: 0, completed: 0, inProgress: 0 },
        P2: { total: 0, completed: 0, inProgress: 0 },
        P3: { total: 0, completed: 0, inProgress: 0 },
      };

      allTasks.forEach(task => {
        const priority = task.priority;
        if (priorityStats[priority]) {
          priorityStats[priority].total++;
          if (task.status === 'done') priorityStats[priority].completed++;
          if (task.status === 'in-progress') priorityStats[priority].inProgress++;
        }
      });

      const tagStats = {};
      allTasks.forEach(task => {
        if (task.tags && task.tags.length > 0) {
          task.tags.forEach(tag => {
            if (!tagStats[tag]) {
              tagStats[tag] = { total: 0, completed: 0 };
            }
            tagStats[tag].total++;
            if (task.status === 'done') {
              tagStats[tag].completed++;
            }
          });
        }
      });

      outputJSON(formatSuccessResponse({
        overall: {
          total: allTasks.length,
          completed: allTasks.filter(t => t.status === 'done').length,
          inProgress: allTasks.filter(t => t.status === 'in-progress').length,
          todo: allTasks.filter(t => t.status === 'todo').length,
          backlog: allTasks.filter(t => t.status === 'backlog').length,
          blocked: allTasks.filter(t => t.status === 'blocked').length,
          totalEstimatedHours: allTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
          totalActualHours: allTasks.reduce((sum, t) => sum + (parseFloat(t.actualHours) || 0), 0),
          progress: allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100) : 0,
        },
        byPriority: priorityStats,
        byTags: tagStats,
      }));
      return;
    }

    // Normal mode - display overall stats
    displayOverall(allTasks);

    // Display by priority if requested
    if (options.byPriority) {
      displayByPriority(allTasks);
    }

    // Display by tags if requested
    if (options.byTags) {
      displayByTags(allTasks);
    }

    // Show quick commands
    console.log(chalk.bold('⚡ 快速命令:\n'));
    console.log(chalk.cyan('  # 查看详情统计'));
    console.log(chalk.gray('  seshflow stats --by-priority'));
    console.log(chalk.gray('  seshflow stats --by-tags\n'));

    console.log(chalk.cyan('  # JSON输出'));
    console.log(chalk.gray('  seshflow stats --json\n'));

  } catch (error) {
    spinner.fail('Failed to load statistics');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
