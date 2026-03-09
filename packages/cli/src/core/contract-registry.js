import fs from 'fs-extra';
import path from 'path';
import {
  CONTRACT_CHECK_CODES,
  CONTRACT_COMPATIBILITY,
  CONTRACT_KINDS,
  CONTRACT_LIFECYCLE_STATUSES,
  CONTRACT_PROTOCOLS,
  CONTRACT_ROLES,
  CONTRACT_SCHEMA_VERSION,
} from '../../../shared/constants/contracts.js';
import { isValidContractId, omitEmptyFields } from '../utils/helpers.js';

const VALID_KINDS = new Set(Object.values(CONTRACT_KINDS));
const VALID_PROTOCOLS = new Set(Object.values(CONTRACT_PROTOCOLS));
const VALID_ROLES = new Set(Object.values(CONTRACT_ROLES));
const KNOWN_CONTRACT_FIELDS = new Set([
  'schemaVersion',
  'id',
  'version',
  'kind',
  'protocol',
  'name',
  'owner',
  'lifecycle',
  'endpoint',
  'rpc',
  'requestSchema',
  'responseSchema',
  'consumers',
  'implementationBindings',
  'openQuestions',
  'notes',
  'metadata',
  'extensions',
  'payload',
]);

export class ContractRegistry {
  constructor(storage) {
    this.storage = storage;
  }

  async addContractFromFile(filePath) {
    const sourcePath = path.resolve(filePath);
    const [contract] = await this.readExternalContracts(sourcePath);
    const normalized = this.normalizeContract(contract);
    const issues = this.validateContract(normalized);

    if (issues.length > 0) {
      const error = new Error(`Contract validation failed for ${normalized.id || path.basename(sourcePath)}`);
      error.code = 'CONTRACT_VALIDATION_FAILED';
      error.issues = issues;
      throw error;
    }

    const existing = await this.tryReadContract(normalized.id);
    await this.storage.writeContractFile(normalized.id, normalized);

    return {
      changed: JSON.stringify(existing) !== JSON.stringify(normalized),
      contract: normalized,
      storedPath: this.storage.getContractFilePath(normalized.id),
      existed: Boolean(existing),
    };
  }

  async importContractsFromFile(filePath) {
    const sourcePath = path.resolve(filePath);
    const rawContracts = await this.readExternalContracts(sourcePath);

    if (rawContracts.length === 0) {
      const error = new Error(`No contracts found in ${path.basename(sourcePath)}`);
      error.code = 'CONTRACT_IMPORT_EMPTY';
      throw error;
    }

    const normalizedContracts = rawContracts.map(contract => this.normalizeContract(contract));
    const seenIds = new Set();
    const duplicateIssues = [];
    for (const [index, contract] of normalizedContracts.entries()) {
      if (!contract.id) {
        continue;
      }

      if (seenIds.has(contract.id)) {
        duplicateIssues.push({
          code: CONTRACT_CHECK_CODES.DUPLICATE_CONTRACT_ID,
          message: `Duplicate contract id in import bundle: ${contract.id}`,
          contractId: contract.id,
          index,
          sourcePath,
        });
        continue;
      }

      seenIds.add(contract.id);
    }

    const issues = duplicateIssues.concat(normalizedContracts.flatMap((contract, index) =>
      this.validateContract(contract).map(issue => ({
        ...issue,
        index,
        sourcePath,
      }))
    ));

    if (issues.length > 0) {
      const error = new Error(`Contract validation failed for import bundle ${path.basename(sourcePath)}`);
      error.code = 'CONTRACT_VALIDATION_FAILED';
      error.issues = issues;
      throw error;
    }

    const results = [];
    for (const contract of normalizedContracts) {
      const existing = await this.tryReadContract(contract.id);
      await this.storage.writeContractFile(contract.id, contract);
      const changed = JSON.stringify(existing) !== JSON.stringify(contract);
      results.push({
        changed,
        existed: Boolean(existing),
        contract,
        storedPath: this.storage.getContractFilePath(contract.id),
      });
    }

    return {
      importedCount: results.length,
      createdCount: results.filter(result => !result.existed).length,
      updatedCount: results.filter(result => result.existed && result.changed).length,
      unchangedCount: results.filter(result => result.existed && !result.changed).length,
      results,
    };
  }

  async listContracts() {
    const files = await this.storage.listContractFiles();
    const contracts = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const contract = this.normalizeContract(JSON.parse(content));
      contracts.push(contract);
    }

    contracts.sort((left, right) => left.id.localeCompare(right.id));
    return contracts;
  }

  async getContract(contractId) {
    const contract = await this.storage.readContractFile(contractId);
    return this.normalizeContract(contract);
  }

  async checkContracts() {
    const files = await this.storage.listContractFiles();
    const issues = [];

    for (const file of files) {
      const fileName = path.basename(file, '.json');
      if (!isValidContractId(fileName)) {
        issues.push({
          code: CONTRACT_CHECK_CODES.INVALID_FILE_NAME,
          message: `Contract file name must match contract id format: ${fileName}`,
          file,
        });
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(await fs.readFile(file, 'utf-8'));
      } catch (error) {
        issues.push({
          code: CONTRACT_CHECK_CODES.INVALID_JSON,
          message: `Invalid JSON in ${path.basename(file)}: ${error.message}`,
          file,
        });
        continue;
      }

      const contract = this.normalizeContract(parsed);
      for (const issue of this.validateContract(contract)) {
        issues.push({
          ...issue,
          file,
        });
      }
    }

    return {
      contractsChecked: files.length,
      issues,
    };
  }

  summarizeContract(contract) {
    return omitEmptyFields({
      id: contract.id,
      version: contract.version,
      kind: contract.kind,
      protocol: contract.protocol,
      name: contract.name,
      owner: contract.owner,
      lifecycle: contract.lifecycle,
      endpoint: contract.endpoint,
      rpc: contract.rpc,
      metadata: contract.metadata,
      extensions: contract.extensions,
      payload: contract.payload,
    });
  }

  getStarterExamplePaths() {
    return {
      api: '.seshflow/contracts/contract.user-service.create-user.json',
      rpc: '.seshflow/contracts/contract.board-service.move-card.json',
    };
  }

  normalizeContract(raw = {}) {
    const payloadFields = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !KNOWN_CONTRACT_FIELDS.has(key))
    );
    const explicitPayload = raw.payload && typeof raw.payload === 'object' && !Array.isArray(raw.payload)
      ? raw.payload
      : {};
    const normalized = {
      schemaVersion: Number.parseInt(raw.schemaVersion, 10) || CONTRACT_SCHEMA_VERSION,
      id: String(raw.id || '').trim(),
      version: String(raw.version || '').trim(),
      kind: String(raw.kind || '').trim() || CONTRACT_KINDS.API,
      protocol: String(raw.protocol || '').trim() || CONTRACT_PROTOCOLS.HTTP_JSON,
      name: String(raw.name || '').trim(),
      owner: {
        service: String(raw.owner?.service || '').trim(),
        team: String(raw.owner?.team || '').trim(),
        ownerTaskIds: Array.isArray(raw.owner?.ownerTaskIds) ? raw.owner.ownerTaskIds : [],
      },
      lifecycle: {
        status: String(raw.lifecycle?.status || '').trim() || CONTRACT_LIFECYCLE_STATUSES.DRAFT,
        compatibility: String(raw.lifecycle?.compatibility || '').trim() || CONTRACT_COMPATIBILITY.BACKWARD_COMPATIBLE,
        supersedes: Array.isArray(raw.lifecycle?.supersedes) ? raw.lifecycle.supersedes : [],
        replacedBy: raw.lifecycle?.replacedBy || null,
      },
      endpoint: raw.endpoint || null,
      rpc: raw.rpc || null,
      requestSchema: raw.requestSchema || null,
      responseSchema: raw.responseSchema || null,
      consumers: Array.isArray(raw.consumers) ? raw.consumers : [],
      implementationBindings: Array.isArray(raw.implementationBindings) ? raw.implementationBindings : [],
      openQuestions: Array.isArray(raw.openQuestions) ? raw.openQuestions : [],
      notes: Array.isArray(raw.notes) ? raw.notes : [],
      metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata : {},
      extensions: raw.extensions && typeof raw.extensions === 'object' && !Array.isArray(raw.extensions) ? raw.extensions : {},
      payload: {
        ...explicitPayload,
        ...payloadFields,
      },
    };

    normalized.implementationBindings = normalized.implementationBindings.map(binding => ({
      path: String(binding?.path || '').trim(),
      kind: String(binding?.kind || '').trim(),
      ownerTaskIds: Array.isArray(binding?.ownerTaskIds) ? binding.ownerTaskIds : [],
      role: VALID_ROLES.has(binding?.role) ? binding.role : undefined,
    }));

    return omitEmptyFields(normalized);
  }

  validateContract(contract) {
    const issues = [];

    if (!isValidContractId(contract.id)) {
      issues.push({
        code: CONTRACT_CHECK_CODES.INVALID_CONTRACT_ID,
        message: 'Contract id must use the format contract.<domain>.<name>',
        contractId: contract.id || null,
      });
    }

    for (const field of ['version', 'name']) {
      if (!String(contract[field] || '').trim()) {
        issues.push({
          code: CONTRACT_CHECK_CODES.MISSING_REQUIRED_FIELD,
          message: `Missing required field: ${field}`,
          contractId: contract.id || null,
          field,
        });
      }
    }

    if (!VALID_KINDS.has(contract.kind)) {
      issues.push({
        code: CONTRACT_CHECK_CODES.INVALID_KIND,
        message: `Unsupported contract kind: ${contract.kind}`,
        contractId: contract.id || null,
      });
    }

    if (!VALID_PROTOCOLS.has(contract.protocol)) {
      issues.push({
        code: CONTRACT_CHECK_CODES.INVALID_PROTOCOL,
        message: `Unsupported contract protocol: ${contract.protocol}`,
        contractId: contract.id || null,
      });
    }

    return issues;
  }

  async tryReadContract(contractId) {
    try {
      return await this.getContract(contractId);
    } catch {
      return null;
    }
  }

  async readExternalContract(filePath) {
    const contracts = await this.readExternalContracts(filePath);
    return contracts[0];
  }

  async readExternalContracts(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const trimmed = content.trim();

    if (!trimmed) {
      return [];
    }

    const isJsonl = path.extname(filePath).toLowerCase() === '.jsonl';

    if (isJsonl) {
      return trimmed
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line));
    }

    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
}
