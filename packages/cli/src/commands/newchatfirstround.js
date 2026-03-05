import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { existsSync } from 'fs';
import path from 'path';
import { formatTaskJSON, formatWorkspaceJSON, formatSuccessResponse, outputJSON, isJSONMode } from '../utils/json-output.js';

/**
 * newchatfirstround - 新会话第一轮命令
 * 快速向 AI 提供项目背景和上下文
 */
export async function newchatfirstround(options = {}) {
  const spinner = ora('Loading project context').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    // JSON mode check
    if (isJSONMode(options)) {
      const workspacePath = process.cwd();
      const projectName = path.basename(workspacePath);
      const currentTask = manager.getCurrentTask();
      const nextTask = currentTask ? null : manager.getNextTask();
      const task = currentTask || nextTask;

      // Calculate statistics
      const allTasks = manager.tasks || [];
      const stats = {
        total: allTasks.length,
        inProgress: allTasks.filter(t => t.status === 'in-progress').length,
        completed: allTasks.filter(t => t.status === 'done').length,
        todo: allTasks.filter(t => t.status === 'todo').length,
        backlog: allTasks.filter(t => t.status === 'backlog').length,
      };

      // Get dependencies
      let dependencies = [];
      let dependents = [];
      if (task) {
        dependencies = manager.getUnmetDependencies(task);
        // Find tasks that depend on this one
        dependents = allTasks.filter(t =>
          t.dependencies && t.dependencies.includes(task.id)
        );
      }

      // Get key files
      const keyFiles = ['README.md', 'docs.md', 'QUICKSTART.md', 'ARCHITECTURE.md', 'API.md']
        .filter(file => existsSync(path.join(workspacePath, file)));

      const workspaceJSON = formatWorkspaceJSON(manager.storage, allTasks.length);

      outputJSON(formatSuccessResponse({
        project: {
          name: projectName,
          path: workspacePath,
          gitBranch: manager.storage.getGitBranch() || 'unknown',
        },
        statistics: stats,
        currentTask: task ? formatTaskJSON(task) : null,
        dependencies: dependencies.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
        dependents: dependents.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
        keyFiles: keyFiles,
      }, workspaceJSON));

      spinner.stop();
      return;
    }

    spinner.stop();

    // 获取项目信息
    const workspacePath = process.cwd();
    const projectName = path.basename(workspacePath);

    // 获取所有任务并计算统计
    const allTasks = manager.tasks || [];
    const stats = {
      total: allTasks.length,
      inProgress: allTasks.filter(t => t.status === 'in-progress').length,
      completed: allTasks.filter(t => t.status === 'done').length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      backlog: allTasks.filter(t => t.status === 'backlog').length,
    };

    // 获取当前任务
    const currentTask = manager.getCurrentTask();
    const nextTask = currentTask ? null : manager.getNextTask();
    const task = currentTask || nextTask;

    console.log(chalk.bold.cyan('\n📋 Seshflow 项目背景\n'));

    // 1. 项目基本信息
    console.log(chalk.bold('📍 项目信息'));
    console.log(chalk.gray(`   路径: ${workspacePath}`));
    console.log(chalk.gray(`   名称: ${projectName}`));

    // Git 信息
    try {
      const gitBranch = manager.storage.getGitBranch();
      if (gitBranch) {
        console.log(chalk.gray(`   Git: ${gitBranch}`));
      }
    } catch (e) {
      // Ignore git errors
    }

    // 统计信息
    console.log(chalk.gray(`   总任务: ${stats.total} 个`));
    console.log(chalk.gray(`   ${chalk.green(stats.completed + ' 完成')} | ${chalk.yellow(stats.inProgress + ' 进行中')} | ${chalk.blue(stats.todo + ' 待办')} | ${chalk.gray(stats.backlog + ' 待办池')}`));

    // 2. 当前任务详情
    console.log(chalk.bold('\n🎯 当前任务'));

    if (task) {
      console.log(chalk.gray(`   ID: ${task.id}`));
      console.log(chalk.white(`   标题: ${task.title}`));
      console.log(chalk.gray(`   优先级: ${task.priority} | 状态: ${task.status}`));

      if (task.estimatedHours > 0) {
        const actual = task.actualHours || 0;
        console.log(chalk.gray(`   预估: ${task.estimatedHours}h | 已用: ${actual}h`));
      }

      if (task.tags && task.tags.length > 0) {
        console.log(chalk.gray(`   标签: [${task.tags.join(', ')}]`));
      }

      // 任务描述
      if (task.description) {
        console.log(chalk.gray(`\n   描述: ${task.description.split('\n').slice(0, 2).join(' ')}...`));
      }

      // 依赖关系
      if (task.dependencies && task.dependencies.length > 0) {
        console.log(chalk.gray('\n   依赖:'));
        const unmetDeps = manager.getUnmetDependencies(task);
        task.dependencies.forEach((depId, index) => {
          const depTask = allTasks.find(t => t.id === depId);
          if (depTask) {
            const isDone = depTask.status === 'done';
            const isInProgress = depTask.status === 'in-progress';
            const icon = isDone ? '✅' : isInProgress ? '⏳' : '⏸️';
            const status = isDone ? '已完成' : isInProgress ? '进行中 ' + (depTask.actualHours || 0) + 'h' : '待办';
            console.log(chalk.gray(`   ${icon} ${depTask.id}: ${depTask.title} (${depTask.priority}) - ${status}`));
          }
        });
      }

      // 后续任务
      const dependents = allTasks.filter(t =>
        t.dependencies && t.dependencies.includes(task.id)
      );
      if (dependents.length > 0) {
        console.log(chalk.gray('\n   后续任务:'));
        dependents.forEach((depTask) => {
          console.log(chalk.gray(`   - ${depTask.id}: ${depTask.title} (${depTask.priority})`));
        });
      }
    } else {
      console.log(chalk.gray('   状态: 无待办任务'));
    }

    // 3. 技术栈
    console.log(chalk.bold('\n🔧 技术栈'));
    console.log(chalk.gray('   CLI: Node.js + Commander.js + Chalk'));
    console.log(chalk.gray('   Web: React 18 + Vite + TypeScript'));
    console.log(chalk.gray('   包管理: pnpm workspace'));

    // 依赖信息
    try {
      const pkgPath = path.join(workspacePath, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = require(pkgPath);
        if (pkg.dependencies) {
          const deps = Object.keys(pkg.dependencies).slice(0, 5);
          console.log(chalk.gray(`   主要依赖: ${deps.join(', ')}`));
        }
      }
    } catch (e) {
      // Ignore
    }

    // 4. 关键文件
    console.log(chalk.bold('\n📁 关键文件'));

    const importantFiles = [
      { file: 'README.md', desc: '项目文档' },
      { file: 'docs.md', desc: '技术文档' },
      { file: 'QUICKSTART.md', desc: '快速开始' },
      { file: 'package.json', desc: '项目配置' },
    ];

    // 尝试查找这些文件
    importantFiles.forEach(({ file, desc }) => {
      if (existsSync(path.join(workspacePath, file))) {
        console.log(chalk.gray(`   - ${file} (${desc})`));
      }
    });

    // 如果有当前任务，显示相关文件
    if (task && task.context && task.context.relatedFiles.length > 0) {
      console.log(chalk.gray('\n   当前任务相关:'));
      task.context.relatedFiles.slice(0, 3).forEach(file => {
        console.log(chalk.gray(`   • ${file}`));
      });
    }

    // 5. 项目文档
    console.log(chalk.bold('\n📚 项目文档'));

    const docs = [
      { file: 'QUICKSTART.md', desc: '快速开始' },
      { file: 'NEXT_SESSION_TEMPLATE.md', desc: '新会话模板' },
      { file: 'docs.md', desc: '完整文档' },
      { file: '.seshflow/MARKDOWN_IMPORT_GUIDE.md', desc: '导入指南' },
    ];

    docs.forEach(({ file, desc }) => {
      if (existsSync(path.join(workspacePath, file))) {
        console.log(chalk.gray(`   ${file}`));
        console.log(chalk.dim(`      ${desc}`));
      }
    });

    // 6. 快速命令
    console.log(chalk.bold('\n⚡ 快速命令'));

    console.log(chalk.white('\n   # 查看当前任务详情（JSON）'));
    console.log(chalk.cyan('   seshflow next --json'));

    if (task) {
      console.log(chalk.white('\n   # 查看任务依赖'));
      console.log(chalk.cyan(`   seshflow deps ${task.id}`));

      console.log(chalk.white('\n   # 查看相关代码'));
      if (task.context && task.context.relatedFiles.length > 0) {
        task.context.relatedFiles.slice(0, 2).forEach(file => {
          console.log(chalk.cyan(`   ls ${file}`));
        });
      } else {
        console.log(chalk.cyan('   ls src/components/*'));
      }
    }

    console.log(chalk.white('\n   # 完成当前任务'));
    console.log(chalk.cyan('   seshflow done --hours <时间> --note "说明"'));

    // 7. AI 使用建议
    console.log(chalk.bold('\n🤖 AI 使用建议'));

    console.log(chalk.white('\n   第一步：理解项目'));
    console.log(chalk.gray('   - 运行: seshflow ncfr --json（获取结构化数据）'));
    console.log(chalk.gray('   - 查看任务: seshflow next'));
    console.log(chalk.gray('   - 阅读文档: cat docs.md'));

    console.log(chalk.white('\n   第二步：开始工作'));
    console.log(chalk.gray('   - 按照 Coding → Test → GitCommit 流程'));
    console.log(chalk.gray('   - 完成后运行: seshflow done --hours X --note "备注"'));

    console.log(chalk.white('\n   第三步：继续下一个'));
    console.log(chalk.gray('   - 运行: seshflow next'));
    console.log(chalk.gray('   - 重复直到所有任务完成'));

    // 8. 快速恢复命令
    console.log(chalk.bold('\n📋 快速恢复（复制以下内容）'));
    console.log(chalk.cyan('\n   我正在开发项目，请运行：'));
    console.log(chalk.cyan(`   cd "${workspacePath}" && seshflow next`));
    console.log(chalk.cyan('\n   查看项目背景：'));
    console.log(chalk.cyan(`   cd "${workspacePath}" && seshflow ncfr\n`));

    // 9. 特殊提示
    if (currentTask) {
      console.log(chalk.bold.yellow('\n⚠️  注意: 当前有进行中的任务'));
      console.log(chalk.yellow('   继续工作或使用: seshflow done 完成'));
    }

    // 10. 相关资源
    if (task && task.context && task.context.links && task.context.links.length > 0) {
      console.log(chalk.bold('\n🔗 相关资源'));
      task.context.links.forEach(link => {
        console.log(chalk.gray(`   - ${link}`));
      });
    }

  } catch (error) {
    spinner.fail('Failed to load context');
    console.error(chalk.red(`\nError: ${error.message}`));

    // 即使失败也提供基本信息
    console.log(chalk.bold.cyan('\n📋 项目基本信息'));
    console.log(chalk.gray(`路径: ${process.cwd()}`));
    console.log(chalk.cyan('\n快速开始:'));
    console.log(chalk.gray('1. 运行: seshflow next'));
    console.log(chalk.gray('2. 阅读: cat docs.md'));

    process.exit(1);
  }
}
