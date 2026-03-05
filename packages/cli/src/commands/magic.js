import chalk from 'chalk';
import { TaskManager } from '../core/task-manager.js';
import ora from 'ora';

/**
 * Magic commands - Skill system with progressive disclosure
 */

// Skill definitions
const SKILLS = {
  quickstart: {
    name: 'quickstart',
    description: '快速开始：初始化并导入示例任务',
    level: 1,
    category: 'workflow',
    async execute() {
      const { execSync } = await import('child_process');
      console.log(chalk.cyan('🚀 Quick Start - Seshflow\n'));

      console.log(chalk.gray('1. 初始化工作区...'));
      try {
        execSync('seshflow init', { stdio: 'inherit' });
      } catch (e) {
        // Already initialized, that's ok
      }

      console.log(chalk.gray('\n2. 查看当前状态...'));
      execSync('seshflow list', { stdio: 'inherit' });

      console.log(chalk.gray('\n3. 获取下一个任务...'));
      execSync('seshflow next', { stdio: 'inherit' });

      console.log(chalk.green('\n✅ Quick start complete!\n'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  - seshflow show <taskId>  查看任务详情'));
      console.log(chalk.gray('  - seshflow done --hours 2  完成当前任务'));
      console.log(chalk.gray('  - seshflow ncfr  获取AI会话上下文'));
    }
  },

  focus: {
    name: 'focus',
    description: '专注模式：只显示P0优先级任务',
    level: 1,
    category: 'filter',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const tasks = manager.getTasks().filter(t =>
        t.priority === 'P0' && t.status !== 'done'
      );

      console.log(chalk.cyan(`\n🎯 Focus Mode - P0 Tasks (${tasks.length})\n`));

      if (tasks.length === 0) {
        console.log(chalk.green('✓ No P0 tasks pending! Great work!\n'));
        return;
      }

      tasks.forEach((task, i) => {
        const status = task.status === 'in-progress' ? chalk.yellow('⏳') : chalk.blue('📋');
        console.log(`${status} ${i + 1}. ${chalk.bold(task.title)}`);
        console.log(chalk.gray(`   ID: ${task.id} | ${task.status}\n`));
      });
    }
  },

  checkpoint: {
    name: 'checkpoint',
    description: '检查点：显示当前进度和下一步',
    level: 1,
    category: 'workflow',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const allTasks = manager.getTasks();
      const completed = allTasks.filter(t => t.status === 'done').length;
      const total = allTasks.length;
      const progress = Math.round((completed / total) * 100);

      console.log(chalk.cyan('\n📍 Checkpoint - Progress Report\n'));

      // Progress bar
      const barLength = 30;
      const filled = Math.round((progress / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      console.log(`Progress: [${chalk.green(bar)}] ${progress}%`);
      console.log(chalk.gray(`Completed: ${completed}/${total} tasks\n`));

      // Show current task
      const currentTask = allTasks.find(t => t.status === 'in-progress');
      if (currentTask) {
        console.log(chalk.yellow('⏳ Current Task:'));
        console.log(`  ${chalk.bold(currentTask.title)}`);
        console.log(chalk.gray(`  ID: ${currentTask.id}\n`));
      } else {
        // Show next task
        const nextTask = manager.getNextTask();
        if (nextTask) {
          console.log(chalk.blue('📋 Next Task:'));
          console.log(`  ${chalk.bold(nextTask.title)}`);
          console.log(chalk.gray(`  ID: ${nextTask.id}\n`));
        }
      }

      // Show blocked tasks
      const blocked = allTasks.filter(t => {
        if (!t.blockedBy || t.blockedBy.length === 0) return false;
        return t.blockedBy.some(b => b.status !== 'done');
      });

      if (blocked.length > 0) {
        console.log(chalk.red(`⚠️  Blocked Tasks: ${blocked.length}`));
        blocked.forEach(task => {
          console.log(chalk.gray(`  • ${task.title} (${task.blockedBy.length} dependencies)\n`));
        });
      }
    }
  },

  sync: {
    name: 'sync',
    description: '同步：更新会话上下文',
    level: 1,
    category: 'workflow',
    async execute() {
      const { execSync } = await import('child_process');
      console.log(chalk.cyan('🔄 Sync - Update Context\n'));

      console.log(chalk.gray('1. Fetching project context...'));
      execSync('seshflow ncfr', { stdio: 'inherit' });

      console.log(chalk.gray('\n2. Checking current task...'));
      execSync('seshflow next', { stdio: 'inherit' });

      console.log(chalk.green('\n✅ Sync complete!\n'));
    }
  },

  // Level 2 skills (advanced)
  batch_done: {
    name: 'batch-done',
    description: '批量完成：快速完成多个子任务',
    level: 2,
    category: 'advanced',
    async execute(taskId, subtaskIndices) {
      const manager = new TaskManager();
      await manager.init();

      const task = manager.getTask(taskId);
      if (!task || !task.subtasks) {
        console.log(chalk.red('✖ Task has no subtasks'));
        return;
      }

      const indices = subtaskIndices.split(',').map(i => parseInt(i) - 1);
      let completed = 0;

      indices.forEach(index => {
        if (index >= 0 && index < task.subtasks.length) {
          task.subtasks[index].completed = true;
          completed++;
        }
      });

      await manager.saveData();

      console.log(chalk.green(`\n✓ Completed ${completed} subtasks in: ${task.title}\n`));
    }
  },

  prioritize: {
    name: 'prioritize',
    description: '优先级重排：按优先级重新排序任务列表',
    level: 2,
    category: 'advanced',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const tasks = manager.getTasks();
      const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };

      tasks.sort((a, b) => {
        const pa = priorityOrder[a.priority] || 99;
        const pb = priorityOrder[b.priority] || 99;
        if (pa !== pb) return pa - pb;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      console.log(chalk.cyan('\n📊 Tasks prioritized by P0 → P3\n'));

      // Group by priority
      const grouped = { P0: [], P1: [], P2: [], P3: [] };
      tasks.forEach(t => {
        if (grouped[t.priority]) grouped[t.priority].push(t);
      });

      Object.entries(grouped).forEach(([priority, tasks]) => {
        if (tasks.length > 0) {
          const color = priority === 'P0' ? chalk.red :
                       priority === 'P1' ? chalk.yellow :
                       priority === 'P2' ? chalk.blue : chalk.gray;
          console.log(color(`${priority} (${tasks.length})`));
          tasks.slice(0, 3).forEach(t => {
            console.log(chalk.gray(`  • ${t.title}`));
          });
          if (tasks.length > 3) {
            console.log(chalk.gray(`  ... and ${tasks.length - 3} more`));
          }
          console.log('');
        }
      });
    }
  },

  // Level 3 skills (expert)
  audit: {
    name: 'audit',
    description: '审计：检查任务健康度',
    level: 3,
    category: 'expert',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const tasks = manager.getTasks();
      const issues = [];

      console.log(chalk.cyan('\n🔍 Audit - Task Health Check\n'));

      // Check for tasks without estimates
      const noEstimate = tasks.filter(t => !t.estimatedHours && t.status !== 'done');
      if (noEstimate.length > 0) {
        issues.push({ type: 'warning', message: `${noEstimate.length} tasks without time estimates` });
      }

      // Check for orphaned tasks (no dependencies, not dependencies of others)
      const referenced = new Set();
      tasks.forEach(t => {
        (t.dependencies || []).forEach(d => referenced.add(d));
      });
      const orphans = tasks.filter(t => !t.dependencies?.length && !referenced.has(t.id));
      if (orphans.length > 5) {
        issues.push({ type: 'info', message: `${orphans.length} tasks without dependencies` });
      }

      // Check for circular dependencies
      const hasCircular = tasks.some(t => {
        if (!t.dependencies?.length) return false;
        return t.dependencies.some(depId => {
          const dep = manager.getTask(depId);
          return dep?.dependencies?.includes(t.id);
        });
      });
      if (hasCircular) {
        issues.push({ type: 'error', message: 'Circular dependencies detected!' });
      }

      // Display results
      if (issues.length === 0) {
        console.log(chalk.green('✓ No issues found! Tasks are healthy.\n'));
      } else {
        issues.forEach(issue => {
          const color = issue.type === 'error' ? chalk.red :
                       issue.type === 'warning' ? chalk.yellow : chalk.blue;
          console.log(color(`${issue.type.toUpperCase()}: ${issue.message}`));
        });
        console.log('');
      }
    }
  }
};

/**
 * List available skills
 */
export async function magicList() {
  console.log(chalk.cyan('\n✨ Magic Commands (Skills)\n'));

  const grouped = {
    workflow: [],
    filter: [],
    advanced: [],
    expert: []
  };

  Object.values(SKILLS).forEach(skill => {
    if (grouped[skill.category]) {
      grouped[skill.category].push(skill);
    }
  });

  const categoryNames = {
    workflow: '🔄 Workflows',
    filter: '🔍 Filters',
    advanced: '⚡ Advanced',
    expert: '🔓 Expert'
  };

  Object.entries(grouped).forEach(([category, skills]) => {
    if (skills.length > 0) {
      console.log(chalk.bold(categoryNames[category] || category));
      skills.forEach(skill => {
        const levelIndicator = skill.level === 1 ? '' : chalk.gray(` [Lvl ${skill.level}]`);
        console.log(`  ${chalk.cyan(skill.name)}${levelIndicator}`);
        console.log(`    ${chalk.gray(skill.description)}`);
      });
      console.log('');
    }
  });

  console.log(chalk.gray('Usage: seshflow magic <skill-name>\n'));
}

/**
 * Execute a magic command
 */
export async function magic(skillName, ...args) {
  const skill = SKILLS[skillName];

  if (!skill) {
    console.error(chalk.red(`\n✖ Unknown skill: ${skillName}`));
    console.error(chalk.gray(`   Use 'seshflow magic --list' to see available skills\n`));
    process.exit(1);
  }

  // Level check (progressive disclosure)
  const userLevel = 1; // TODO: Load from config
  if (skill.level > userLevel) {
    console.log(chalk.yellow(`\n⚠️  This skill requires level ${skill.level}`));
    console.log(chalk.gray('   Complete more tasks to unlock advanced skills\n'));
    process.exit(0);
  }

  const spinner = ora(`Executing ${skill.name}...`).start();

  try {
    await skill.execute(...args);
    spinner.succeed(`Magic complete: ${skill.name}`);
  } catch (error) {
    spinner.fail(`Magic failed: ${skill.name}`);
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
