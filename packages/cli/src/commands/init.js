import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';

/**
 * Initialize seshflow workspace
 */
export async function init(options = {}) {
  const spinner = ora('Initializing Seshflow workspace').start();

  try {
    const storage = new Storage();

    // Check if already initialized
    if (storage.isInitialized() && !options.force) {
      spinner.warn('Seshflow already initialized');
      console.log(chalk.yellow('\nUse --force to reinitialize'));
      return;
    }

    // Initialize storage
    await storage.init();

    // Create task manager to ensure data is loaded
    const manager = new TaskManager();
    await manager.init();

    spinner.succeed('Seshflow workspace initialized');

    // Print summary
    console.log(chalk.green('\n✓ Workspace ready!'));
    console.log(chalk.gray(`  Location: ${storage.getSeshflowDir()}`));
    console.log(
      chalk.gray(
        `  Config: ${storage
          .getWorkspacePath()
          .replace(storage.getWorkspacePath(), '.seshflow/config.yaml')}`
      )
    );

    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.gray('  seshflow add "My first task"'));
    console.log(chalk.gray('  seshflow next'));
  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
