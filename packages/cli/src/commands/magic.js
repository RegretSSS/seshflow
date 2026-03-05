import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { init } from './init.js';
import { list } from './list.js';
import { next } from './next.js';
import { newchatfirstround } from './newchatfirstround.js';

const SKILLS = {
  quickstart: {
    name: 'quickstart',
    description: 'Initialize workspace and show first task',
    level: 1,
    category: 'workflow',
    async execute() {
      console.log(chalk.cyan('\nQuick Start\n'));

      console.log(chalk.gray('1. Initialize workspace...'));
      try {
        await init({});
      } catch {
        // Workspace may already be initialized.
      }

      console.log(chalk.gray('\n2. List tasks...'));
      await list({});

      console.log(chalk.gray('\n3. Pick next task...'));
      await next({});

      console.log(chalk.green('\nQuick start complete.\n'));
    }
  },
  focus: {
    name: 'focus',
    description: 'Show only pending P0 tasks',
    level: 1,
    category: 'filter',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const tasks = manager.getTasks().filter(task => task.priority === 'P0' && task.status !== 'done');
      console.log(chalk.cyan(`\nFocus Mode (${tasks.length} P0 tasks)\n`));

      if (tasks.length === 0) {
        console.log(chalk.green('No pending P0 tasks.\n'));
        return;
      }

      tasks.forEach((task, index) => {
        const icon = task.status === 'in-progress' ? '>' : '-';
        console.log(`${icon} ${index + 1}. ${chalk.bold(task.title)}`);
        console.log(chalk.gray(`   ${task.id} | ${task.status}`));
      });
      console.log('');
    }
  },
  checkpoint: {
    name: 'checkpoint',
    description: 'Show progress and current/next task',
    level: 1,
    category: 'workflow',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const allTasks = manager.getTasks();
      const total = allTasks.length;
      const completed = allTasks.filter(task => task.status === 'done').length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      console.log(chalk.cyan('\nCheckpoint\n'));
      console.log(`Progress: ${progress}% (${completed}/${total})`);

      const currentTask = allTasks.find(task => task.status === 'in-progress');
      if (currentTask) {
        console.log(chalk.yellow(`Current: ${currentTask.title}`));
      } else {
        const nextTask = manager.getNextTask();
        if (nextTask) {
          console.log(chalk.blue(`Next: ${nextTask.title}`));
        }
      }

      const blocked = allTasks.filter(task => (task.blockedBy || []).length > 0);
      if (blocked.length > 0) {
        console.log(chalk.red(`Blocked: ${blocked.length}`));
      }

      console.log('');
    }
  },
  sync: {
    name: 'sync',
    description: 'Refresh context and show next task',
    level: 1,
    category: 'workflow',
    async execute() {
      console.log(chalk.cyan('\nSync\n'));
      await newchatfirstround({ compact: true });
      await next({ compact: true });
      console.log(chalk.green('\nSync complete.\n'));
    }
  },
  batch_done: {
    name: 'batch-done',
    description: 'Complete multiple subtasks by indices',
    level: 2,
    category: 'advanced',
    async execute(taskId, subtaskIndices) {
      const manager = new TaskManager();
      await manager.init();

      const task = manager.getTask(taskId);
      if (!task || !task.subtasks) {
        console.log(chalk.red('Task has no subtasks'));
        return;
      }

      const indices = String(subtaskIndices || '')
        .split(',')
        .map(value => Number.parseInt(value, 10) - 1)
        .filter(index => Number.isInteger(index));

      let completed = 0;
      indices.forEach(index => {
        if (index >= 0 && index < task.subtasks.length && !task.subtasks[index].completed) {
          task.subtasks[index].completed = true;
          completed += 1;
        }
      });

      await manager.saveData();
      console.log(chalk.green(`Completed ${completed} subtasks in "${task.title}"\n`));
    }
  },
  prioritize: {
    name: 'prioritize',
    description: 'Show tasks grouped by priority',
    level: 2,
    category: 'advanced',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const tasks = manager.getTasks();
      const groups = { P0: [], P1: [], P2: [], P3: [] };
      tasks.forEach(task => {
        if (groups[task.priority]) groups[task.priority].push(task);
      });

      console.log(chalk.cyan('\nPrioritized Tasks\n'));
      Object.entries(groups).forEach(([priority, items]) => {
        if (items.length === 0) return;
        console.log(chalk.bold(`${priority} (${items.length})`));
        items.slice(0, 3).forEach(task => console.log(`- ${task.title}`));
        if (items.length > 3) console.log(`... and ${items.length - 3} more`);
        console.log('');
      });
    }
  },
  audit: {
    name: 'audit',
    description: 'Check for common task hygiene issues',
    level: 3,
    category: 'expert',
    async execute() {
      const manager = new TaskManager();
      await manager.init();

      const tasks = manager.getTasks();
      const issues = [];

      const noEstimate = tasks.filter(task => !task.estimatedHours && task.status !== 'done');
      if (noEstimate.length > 0) {
        issues.push(`warning: ${noEstimate.length} open tasks without estimate`);
      }

      const circular = tasks.some(task =>
        (task.dependencies || []).some(depId => {
          const dep = manager.getTask(depId);
          return dep?.dependencies?.includes(task.id);
        })
      );
      if (circular) {
        issues.push('error: circular dependencies detected');
      }

      if (issues.length === 0) {
        console.log(chalk.green('\nNo issues found.\n'));
      } else {
        console.log(chalk.cyan('\nAudit results\n'));
        issues.forEach(issue => console.log(`- ${issue}`));
        console.log('');
      }
    }
  }
};

export async function magicList() {
  console.log(chalk.cyan('\nMagic Commands\n'));

  const groups = { workflow: [], filter: [], advanced: [], expert: [] };
  Object.values(SKILLS).forEach(skill => groups[skill.category]?.push(skill));

  Object.entries(groups).forEach(([group, skills]) => {
    if (skills.length === 0) return;
    console.log(chalk.bold(group));
    skills.forEach(skill => {
      console.log(`  ${skill.name}`);
      console.log(`    ${skill.description}`);
    });
    console.log('');
  });

  console.log(chalk.gray('Usage: seshflow magic <skill-name>\n'));
  console.log(chalk.gray('Example: seshflow magic batch-done <task-id> 1,2,3\n'));
}

export async function magic(skillName, ...args) {
  const normalizedName = String(skillName || '').replace(/-/g, '_');
  const skill = SKILLS[skillName] || SKILLS[normalizedName];
  if (!skill) {
    console.error(chalk.red(`\nUnknown skill: ${skillName}`));
    console.error(chalk.gray("Use 'seshflow magic --list' to see available skills\n"));
    process.exit(1);
  }

  const spinner = process.stdout.isTTY ? ora(`Executing ${skill.name}...`).start() : null;
  try {
    await skill.execute(...args);
    spinner?.succeed(`Magic complete: ${skill.name}`);
  } catch (error) {
    spinner?.fail(`Magic failed: ${skill.name}`);
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
