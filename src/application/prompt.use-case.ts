import fs from 'fs-extra';
import path from 'node:path';
import readline from 'node:readline/promises';
import type { JsonObject } from '../ai/ai-provider-pdna.js';
import { FireworksService } from '../ai/fireworks.service.js';
import { AIProviderValidationError, PDNAAIService } from '../ai/pdna-ai.service.js';
import { PromptBuilder } from '../prompt/prompt-builder.js';
import { PromptPersistenceService } from '../prompt/prompt-persistence.service.js';
import { PROMPT_MODES, type PromptCommandOptions, type PromptKnowledgeBase, type PromptMode, type PromptSizeOptions } from '../prompt/prompt-types.js';
import { ProjectDnaError } from '../shared/errors.js';
import { ProjectValidationService } from '../shared/project-validation.js';

const REQUIRED_PROMPT_FILES = [
  'dependencies.json',
  'business-context.json',
  'domain-context.json',
  'coding-rules.json',
  'api-conventions.json',
  'decision-log.json',
  'scanner-report.json',
  'architecture-insights.json',
] as const;

const DEFAULT_SIZE: PromptSizeOptions = {
  minChars: 1400,
  maxChars: 5000,
  softOverage: 600,
};

export interface PromptUseCaseResult {
  promptPath: string;
  logPath: string;
  jsonPath?: string;
  mode: PromptMode;
  charCount: number;
  selectedDomains: string[];
  status: 'updated' | 'failed';
}

export class PromptUseCase {
  constructor(
    private readonly validationService: ProjectValidationService = new ProjectValidationService(),
    private readonly aiService: PDNAAIService = new PDNAAIService(new FireworksService()),
    private readonly promptBuilder: PromptBuilder = new PromptBuilder(),
    private readonly persistenceService: PromptPersistenceService = new PromptPersistenceService(),
  ) {}

  public async execute(projectRoot: string, options: PromptCommandOptions = {}): Promise<PromptUseCaseResult> {
    const absoluteRoot = path.resolve(projectRoot);
    await this.validationService.validateWorkspace(absoluteRoot);

    const pdnaDir = path.join(absoluteRoot, '.pdna');
    await this.ensureProjectDnaInitialized(pdnaDir, Boolean(options.includeSecurity));

    const request = await this.resolveRequest(options.request);
    if (request.trim().length === 0) {
      throw new ProjectDnaError('No prompt request was provided.');
    }

    const mode = this.resolveMode(options.mode);
    const size = this.resolveSize(options);
    const includeSecurity = Boolean(options.includeSecurity);
    const knowledgeBase = await this.loadKnowledgeBase(pdnaDir, includeSecurity);
    const buildInput = {
      knowledgeBase,
      request,
      mode,
      size,
      includeSecurity,
      metadata: {
        projectRoot: absoluteRoot,
        projectDnaDir: pdnaDir,
      },
    };
    const promptPackage = this.promptBuilder.build(buildInput);

    try {
      const enrichment = await this.aiService.enrichPrompt({
        ...buildInput,
        promptPackage,
      });
      const persistence = await this.persistenceService.save(pdnaDir, enrichment, promptPackage, size);

      return {
        promptPath: persistence.promptPath,
        logPath: persistence.logPath,
        jsonPath: persistence.jsonPath,
        mode,
        charCount: enrichment.enrichedPrompt.markdown.length,
        selectedDomains: enrichment.selectedDomains.map((domain) => domain.name),
        status: 'updated',
      };
    } catch (error) {
      if (error instanceof AIProviderValidationError) {
        const failure = await this.persistenceService.saveFailure(pdnaDir, {
          mode,
          request,
          providerId: error.providerId,
          payload: error.payload,
          issues: error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
          promptPackage,
          size,
        });

        return {
          promptPath: failure.fallbackPath,
          logPath: failure.logPath,
          mode,
          charCount: 0,
          selectedDomains: [],
          status: 'failed',
        };
      }

      throw error;
    }
  }

  private async resolveRequest(request: string | undefined): Promise<string> {
    if (typeof request === 'string' && request.trim().length > 0) {
      return request.trim();
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      return (await rl.question('Describe the request to turn into a Project DNA prompt:\n')).trim();
    } finally {
      rl.close();
    }
  }

  private resolveMode(mode: PromptMode | undefined): PromptMode {
    if (!mode) return 'feature';
    if ((PROMPT_MODES as readonly string[]).includes(mode)) return mode;
    throw new ProjectDnaError(`Invalid prompt mode "${mode}". Expected one of: ${PROMPT_MODES.join(', ')}.`);
  }

  private resolveSize(options: PromptCommandOptions): PromptSizeOptions {
    const minChars = this.positiveInteger(options.minChars, DEFAULT_SIZE.minChars);
    const maxChars = this.positiveInteger(options.maxChars, DEFAULT_SIZE.maxChars);
    const softOverage = this.nonNegativeInteger(options.softOverage, DEFAULT_SIZE.softOverage);

    if (maxChars < minChars) {
      throw new ProjectDnaError('Invalid prompt size options: --max-chars must be greater than or equal to --min-chars.');
    }

    return { minChars, maxChars, softOverage };
  }

  private async ensureProjectDnaInitialized(pdnaDir: string, includeSecurity: boolean): Promise<void> {
    if (!(await fs.pathExists(pdnaDir))) {
      throw new ProjectDnaError('Project DNA has not been initialized. Run `pdna init` before generating prompts.');
    }

    const missingFiles: string[] = [];
    for (const fileName of REQUIRED_PROMPT_FILES) {
      if (!(await fs.pathExists(path.join(pdnaDir, fileName)))) {
        missingFiles.push(fileName);
      }
    }

    if (includeSecurity && !(await fs.pathExists(path.join(pdnaDir, 'security-rules.json')))) {
      missingFiles.push('security-rules.json');
    }

    if (missingFiles.length > 0) {
      throw new ProjectDnaError(
        `Project DNA initialization is incomplete. Run \`pdna init\` before generating prompts. Missing: ${missingFiles.join(', ')}`,
      );
    }
  }

  private async loadKnowledgeBase(pdnaDir: string, includeSecurity: boolean): Promise<PromptKnowledgeBase> {
    return {
      dependencies: await this.readRequiredJson(pdnaDir, 'dependencies.json'),
      businessContext: await this.readRequiredJson(pdnaDir, 'business-context.json'),
      domainContext: await this.readRequiredJson(pdnaDir, 'domain-context.json'),
      codingRules: await this.readRequiredJson(pdnaDir, 'coding-rules.json'),
      securityRules: includeSecurity ? await this.readRequiredJson(pdnaDir, 'security-rules.json') : {},
      apiConventions: await this.readRequiredJson(pdnaDir, 'api-conventions.json'),
      decisionLog: await this.readRequiredJson(pdnaDir, 'decision-log.json'),
      scannerReport: await this.readRequiredJson(pdnaDir, 'scanner-report.json'),
      architectureInsights: await this.readRequiredJson(pdnaDir, 'architecture-insights.json'),
    };
  }

  private async readRequiredJson(pdnaDir: string, fileName: string): Promise<JsonObject> {
    try {
      const value = await fs.readJson(path.join(pdnaDir, fileName));
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as JsonObject;
      }
      throw new ProjectDnaError(`Invalid ${fileName}: expected a JSON object.`);
    } catch (error) {
      if (error instanceof ProjectDnaError) {
        throw error;
      }
      throw new ProjectDnaError(`Unable to load ${fileName}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private positiveInteger(value: number | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    if (Number.isInteger(value) && value > 0) return value;
    throw new ProjectDnaError('Prompt size options must be positive integers.');
  }

  private nonNegativeInteger(value: number | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    if (Number.isInteger(value) && value >= 0) return value;
    throw new ProjectDnaError('Prompt soft overage must be a non-negative integer.');
  }
}