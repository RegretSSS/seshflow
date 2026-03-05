import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { existsSync } from 'fs';
import path from 'path';

/**
 * newchatfirstround - 新会话第一轮命令
 * 快速向 AI 提供项目背景和上下文
 */
export async function newchatfirstround(options = {}) {
  const spinner = ora('Loading project context').start();

  try {
    const manager = new TaskManager();
    await manager.init();

    spinner.stop();

    // 获取项目信息
    const workspacePath = process.cwd();
    const projectName = path.basename(workspacePath);

    // 检查关键文件
    const keyFiles = {
      'README.md': '项目说明',
      'IMPROVEMENT_TASKS.md': '改进计划',
      'TASK_SUMMARY.md': '任务总结',
      'NEXT_SESSION_TEMPLATE.md': '会话模板',
      'SESSION_RECOVERY.md': '恢复指南',
      'docs.md': '技术规划',
      'QUICKSTART.md': '快速开始'
    };

    const existingFiles = Object.entries(keyFiles)
      .filter(([file]) => existsSync(path.join(workspacePath, file)))
      .map(([file, desc]) => ({ file, desc }));

    // 获取当前任务
    const currentTask = manager.getCurrentTask();
    const nextTask = currentTask ? null : manager.getNextTask();
    const task = currentTask || nextTask;

    console.log(chalk.bold.cyan('\n📋 Seshflow 项目背景\n'));

    // 1. 项目基本信息
    console.log(chalk.bold('📍 项目位置'));
    console.log(chalk.gray(`   路径: ${workspacePath}`));
    console.log(chalk.gray(`   名称: ${projectName}`));

    // 2. 关键文档索引
    console.log(chalk.bold('\n📚 关键文档（按优先级排序）'));

    const priorityDocs = [
      { file: 'NEXT_SESSION_TEMPLATE.md', desc: '🚀 新会话启动模板（推荐优先阅读）', priority: 1 },
      { file: 'TASK_SUMMARY.md', desc: '📊 任务总结和当前状态', priority: 2 },
      { file: 'IMPROVEMENT_TASKS.md', desc: '🎯 产品改进计划', priority: 3 },
      { file: 'SESSION_RECOVERY.md', desc: '📖 详细恢复指南', priority: 4 },
      { file: 'QUICKSTART.md', desc: '⚡ 快速开始指南', priority: 5 },
      { file: 'docs.md', desc: '📐 完整技术规划', priority: 6 }
    ];

    priorityDocs.forEach(({ file, desc, priority }) => {
      if (existsSync(path.join(workspacePath, file))) {
        console.log(chalk.gray(`   ${priority}. ${file}`));
        console.log(chalk.gray(`      ${desc}`));
      }
    });

    // 3. 当前任务信息
    console.log(chalk.bold('\n🎯 当前任务状态'));

    if (currentTask) {
      console.log(chalk.green('   状态: 进行中'));
      console.log(chalk.white(`   任务: ${currentTask.title}`));
      console.log(chalk.gray(`   优先级: ${currentTask.priority}`));
      if (currentTask.estimatedHours > 0) {
        console.log(chalk.gray(`   预估: ${currentTask.estimatedHours}h`));
      }
    } else if (nextTask) {
      console.log(chalk.yellow('   状态: 待开始'));
      console.log(chalk.white(`   下一个任务: ${nextTask.title}`));
      console.log(chalk.gray(`   优先级: ${nextTask.priority}`));
    } else {
      console.log(chalk.gray('   状态: 无待办任务'));
    }

    // 4. 项目类型和技术栈
    console.log(chalk.bold('\n🔧 技术栈'));
    console.log(chalk.gray('   CLI: Node.js + Commander.js + Chalk'));
    console.log(chalk.gray('   Web: React 18 + Vite + TypeScript'));
    console.log(chalk.gray('   包管理: pnpm workspace'));

    // 5. 快速开始命令
    console.log(chalk.bold('\n⚡ 快速开始'));

    console.log(chalk.white('\n   # 查看当前任务'));
    console.log(chalk.cyan('   seshflow next'));

    console.log(chalk.white('\n   # 阅读项目背景（推荐）'));
    console.log(chalk.cyan('   cat NEXT_SESSION_TEMPLATE.md'));

    console.log(chalk.white('\n   # 查看完整任务列表'));
    console.log(chalk.cyan('   cat .seshflow/tasks.json | python -m json.tool'));

    // 6. AI 使用建议
    console.log(chalk.bold('\n🤖 AI 使用建议'));

    console.log(chalk.white('\n   第一步：理解项目'));
    console.log(chalk.gray('   - 阅读 NEXT_SESSION_TEMPLATE.md（1 分钟）'));
    console.log(chalk.gray('   - 运行 seshflow next 查看当前任务'));

    console.log(chalk.white('\n   第二步：开始工作'));
    console.log(chalk.gray('   - 按照 Coding → Test → GitCommit 流程'));
    console.log(chalk.gray('   - 完成后运行: seshflow done --hours X --note "备注"'));

    console.log(chalk.white('\n   第三步：继续下一个'));
    console.log(chalk.gray('   - 运行: seshflow next'));
    console.log(chalk.gray('   - 重复直到所有任务完成'));

    // 7. 关键文件路径（便于 AI 读取）
    if (options.showPaths || false) {
      console.log(chalk.bold('\n📁 关键文件路径'));
      existingFiles.forEach(({ file, desc }) => {
        const fullPath = path.join(workspacePath, file);
        console.log(chalk.gray(`   ${fullPath}`));
        console.log(chalk.gray(`      ${desc}`));
      });
    }

    // 8. 简洁的恢复指令（便于复制）
    console.log(chalk.bold('\n📋 快速恢复（复制以下内容）'));
    console.log(chalk.cyan('\n   我正在开发 Seshflow 项目，请运行：'));
    console.log(chalk.cyan('   cd "' + workspacePath + '" && node packages/cli/bin/seshflow.js next'));
    console.log(chalk.cyan('\n   然后阅读: cat NEXT_SESSION_TEMPLATE.md\n'));

    // 9. 特殊提示
    if (currentTask) {
      console.log(chalk.bold.yellow('\n⚠️  注意: 当前有进行中的任务'));
      console.log(chalk.yellow('   继续工作或使用: seshflow done 完成'));
    }

  } catch (error) {
    spinner.fail('Failed to load context');
    console.error(chalk.red(`\nError: ${error.message}`));

    // 即使失败也提供基本信息
    console.log(chalk.bold.cyan('\n📋 项目基本信息'));
    console.log(chalk.gray(`路径: ${process.cwd()}`));
    console.log(chalk.cyan('\n快速开始:'));
    console.log(chalk.gray('1. 阅读 NEXT_SESSION_TEMPLATE.md'));
    console.log(chalk.gray('2. 运行: seshflow next'));

    process.exit(1);
  }
}
