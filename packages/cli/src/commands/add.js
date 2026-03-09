import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TaskManager } from '../core/task-manager.js';
import { isValidContractId, isValidPriority, truncate } from '../utils/helpers.js';
import { formatErrorResponse, formatSuccessResponse, formatTaskJSON, formatWorkspaceJSON, isJSONMode, outputJSON } from '../utils/json-output.js';
import { CONTRACT_ROLES } from '../../../shared/constants/contracts.js';

const DEPENDENCY_PREFIX_RE = /^(dependency|depends|dep|\u4f9d\u8d56)\s*:/i;
const CONTRACT_PREFIX_RE = /^contracts?\s*:/i;
const FILE_PREFIX_RE = /^(files?|bound-files?)\s*:/i;
const HOURS_RE = /^(\d+(?:\.\d+)?)\s*h?$/i;

function parseHoursInput(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  const match = raw.match(HOURS_RE);
  if (!match) return Number.NaN;
  return parseFloat(match[1]);
}

function parseInlineMetadataFromTitle(rawTitle = '') {
  let cleanTitle = String(rawTitle);
  let priority = null;
  let estimatedHours = null;
  const tags = [];
  const dependencies = [];
  const contractIds = [];
  const boundFiles = [];

  const matches = [...cleanTitle.matchAll(/\[([^\]]+)\]/g)];
  matches.forEach(match => {
    const token = match[1].trim();

    if (/^P[0-3]$/i.test(token)) {
      priority = token.toUpperCase();
      return;
    }

    if (/^\d+(\.\d+)?h$/i.test(token)) {
      estimatedHours = parseFloat(token);
      return;
    }

    if (DEPENDENCY_PREFIX_RE.test(token)) {
      dependencies.push(
        ...token
          .replace(DEPENDENCY_PREFIX_RE, '')
          .split(',')
          .map(dep => dep.trim())
          .filter(Boolean)
      );
      return;
    }

    if (CONTRACT_PREFIX_RE.test(token)) {
      contractIds.push(
        ...token
          .replace(CONTRACT_PREFIX_RE, '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean)
      );
      return;
    }

    if (FILE_PREFIX_RE.test(token)) {
      boundFiles.push(
        ...token
          .replace(FILE_PREFIX_RE, '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean)
      );
      return;
    }

    tags.push(
      ...token
        .split(/[,\uff0c]/)
        .map(tag => tag.trim())
        .filter(Boolean)
    );
  });

  cleanTitle = cleanTitle.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();

  return {
    title: cleanTitle || rawTitle,
    priority,
    estimatedHours,
    tags: [...new Set(tags)],
    dependencies: [...new Set(dependencies)],
    contractIds: [...new Set(contractIds)],
    boundFiles: [...new Set(boundFiles)],
  };
}

/**
 * Add a new task
 */
export async function add(title, options = {}) {
  try {
    const manager = new TaskManager();
    await manager.init();
    const jsonMode = isJSONMode(options);

    const parsed = parseInlineMetadataFromTitle(title);
    const normalizedTitle = parsed.title;
    let description = options.description ?? options.desc ?? '';

    // Interactive description input if not provided
    if (!jsonMode && !description && process.stdin.isTTY) {
      const answers = await inquirer.prompt([
        {
          type: 'editor',
          name: 'description',
          message: 'Enter task description (Markdown supported):',
          default: description
        }
      ]);
      description = answers.description;
    }

    // Parse tags
    const tagsInput = options.tags ?? options.tag;
    const cliTags = tagsInput
      ? String(tagsInput).split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const tags = [...new Set([...parsed.tags, ...cliTags])];

    // Parse dependencies
    const cliDependencies = options.depends
      ? options.depends.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    const dependencies = [...new Set([...parsed.dependencies, ...cliDependencies])];
    const cliContracts = options.contracts
      ? String(options.contracts).split(',').map(value => value.trim()).filter(Boolean)
      : [];
    const contractIds = [...new Set([...parsed.contractIds, ...cliContracts])];
    const invalidContracts = contractIds.filter(contractId => !isValidContractId(contractId));
    if (invalidContracts.length > 0) {
      throw new Error(`Invalid contract id(s): ${invalidContracts.join(', ')}`);
    }

    const cliBoundFiles = options.bindFile
      ? String(options.bindFile).split(',').map(value => value.trim()).filter(Boolean)
      : [];
    const boundFiles = [...new Set([...parsed.boundFiles, ...cliBoundFiles])];
    const contractRole = options.contractRole && Object.values(CONTRACT_ROLES).includes(options.contractRole)
      ? options.contractRole
      : null;

    // Validate priority
    const priority = isValidPriority(options.priority || parsed.priority)
      ? (options.priority || parsed.priority)
      : 'P2';

    // Validate dependencies
    const invalidDeps = manager.validateDependencies(dependencies);
    const warnings = invalidDeps.map(dependencyId => ({
      code: 'DEPENDENCY_NOT_FOUND',
      dependencyId,
      message: `Referenced dependency does not exist yet: ${dependencyId}`,
    }));
    if (!jsonMode && invalidDeps.length > 0) {
      console.warn(
        chalk.yellow(
          `\n⚠️  Warning: The following task dependencies do not exist: ${invalidDeps.join(
            ', '
          )}`
        )
      );
    }

    // Create task
    const spinner = (!jsonMode && process.stdout.isTTY) ? ora('Creating task').start() : null;

    const hoursInput = options.hours ?? options.estimate ?? parsed.estimatedHours;
    const estimatedHours = parseHoursInput(hoursInput);
    if (Number.isNaN(estimatedHours)) {
      throw new Error(`Invalid estimate value: ${hoursInput}. Use number or number+h (e.g. 2 or 2h).`);
    }

    const task = manager.createTask({
      title: normalizedTitle,
      description,
      priority,
      tags,
      dependencies,
      contractIds,
      contractRole,
      boundFiles,
      estimatedHours: estimatedHours ?? 0,
      assignee: options.assignee || null,
      branch: options.branch || null
    });

    await manager.saveData();
    spinner?.succeed('Task created');

    if (jsonMode) {
      const workspaceJSON = await formatWorkspaceJSON(manager.storage, manager.getTasks().length);
      outputJSON(formatSuccessResponse({
        action: 'add',
        changed: true,
        task: formatTaskJSON(task),
        warnings,
      }, workspaceJSON));
      return;
    }

    // Display task info
    console.log(chalk.green(`\n✓ Task: ${chalk.bold(task.title)}`));
    console.log(chalk.gray(`  ID: ${task.id}`));
    console.log(chalk.gray(`  Priority: ${task.priority}`));
    if (description) {
      console.log(chalk.gray(`  Description: ${truncate(description, 80)}`));
    }
    if (tags.length > 0) {
      console.log(chalk.gray(`  Tags: ${tags.join(', ')}`));
    }
    if (dependencies.length > 0) {
      console.log(chalk.gray(`  Dependencies: ${dependencies.join(', ')}`));
    }
    if (contractIds.length > 0) {
      console.log(chalk.gray(`  Contracts: ${contractIds.join(', ')}`));
    }
    if (contractRole) {
      console.log(chalk.gray(`  Contract role: ${contractRole}`));
    }
    if (boundFiles.length > 0) {
      console.log(chalk.gray(`  Bound files: ${boundFiles.join(', ')}`));
    }
    if (task.estimatedHours > 0) {
      console.log(chalk.gray(`  Estimated: ${task.estimatedHours}h`));
    }

    console.log(chalk.blue('\nNext:'), chalk.gray('seshflow next'));
  } catch (error) {
    if (isJSONMode(options)) {
      outputJSON(formatErrorResponse(error, 'ADD_FAILED'));
      process.exit(1);
    }
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}
