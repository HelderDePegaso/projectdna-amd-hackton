import fs from 'fs-extra';
import path from 'node:path';
import readline from 'node:readline/promises';
import { FireworksService } from '../ai/fireworks.service.js';
import { AIProviderValidationError, PDNAAIService } from '../ai/pdna-ai.service.js';
import type { JsonObject, PromptPackage, StructuredAnalysisContextBundle } from '../ai/ai-provider-pdna.js';
import { OverviewPromptBuilder, type OverviewPromptBuilderInput } from '../ai/overview-prompt-builder.js';
import type { PromptBuilder } from '../ai/prompt-builder.js';
import { ProjectValidationService } from '../shared/project-validation.js';
import { ProjectDnaError } from '../shared/errors.js';
import type { ArchitectureInsightsDocument } from '../infrastructure/intelligence/architecture-insights.schema.js';
import { writeJsonFile } from '../utils/files.js';

const REQUIRED_PROJECT_DNA_FILES = [
  'architecture.json',
  'dependencies.json',
  'business-context.json',
  'domain-context.json',
  'coding-rules.json',
  'security-rules.json',
  'api-conventions.json',
  'decision-log.json',
  'scanner-report.json',
] as const;

export interface ProjectOverviewResult {
  status: 'skipped' | 'updated' | 'failed';
  overviewPath: string;
  insightsPath: string;
  providerId?: string;
  businessContextPath?: string;
  domainContextPath?: string;
  logPath?: string;
  fallbackPath?: string;
}

export class ProjectOverviewUseCase {
  constructor(
    private readonly validationService: ProjectValidationService = new ProjectValidationService(),
    private readonly aiService: PDNAAIService = new PDNAAIService(new FireworksService()),
    private readonly promptBuilder: PromptBuilder<OverviewPromptBuilderInput> = new OverviewPromptBuilder(),
  ) {}

  public async execute(projectRoot: string): Promise<ProjectOverviewResult> {
    const absoluteRoot = path.resolve(projectRoot);
    await this.validationService.validateWorkspace(absoluteRoot);

    const pdnaDir = path.join(absoluteRoot, '.pdna');
    await this.ensureProjectDnaInitialized(pdnaDir);
    const contextBundle = await this.loadContextBundle(pdnaDir);

    const overviewPath = path.join(pdnaDir, 'project-overview.md');
    const insightsPath = path.join(pdnaDir, 'architecture-insights.json');
    const businessContextPath = path.join(pdnaDir, 'business-context.json');
    const domainContextPath = path.join(pdnaDir, 'domain-context.json');
    const existingContent = (await fs.pathExists(overviewPath)) ? await fs.readFile(overviewPath, 'utf8') : '';

    const answer = await this.promptForOverview(existingContent);
    if (answer.trim().length === 0) {
      return { status: 'skipped', overviewPath, insightsPath };
    }

    await fs.writeFile(overviewPath, answer, 'utf8');

    const metadata = {
      projectRoot: absoluteRoot,
      projectDnaDir: pdnaDir,
    };
    const promptPackage = this.promptBuilder.build({
      overview: answer,
      contextBundle,
      metadata,
    });
    const providerInfo = this.aiService.getActiveProviderInfo();

    try {
      const insights = await this.aiService.analyzeProjectOverview({
        overview: answer,
        contextBundle,
        promptPackage,
        metadata,
      });

      const businessContext = this.deriveBusinessContext(contextBundle.businessContext, insights);
      const domainContext = this.deriveDomainContext(contextBundle.domainContext, insights);

      await writeJsonFile(insightsPath, insights);
      await writeJsonFile(businessContextPath, businessContext);
      await writeJsonFile(domainContextPath, domainContext);

      const logPath = await this.writeMarkdownLog(pdnaDir, {
        startedAt: new Date().toISOString(),
        overviewSummary: promptPackage.summary,
        promptPackage,
        provider: providerInfo.displayName,
        providerId: providerInfo.providerId,
        rawResponseSummary: this.summarizeJson(insights),
        validationResult: 'success',
        savedFiles: [overviewPath, insightsPath, businessContextPath, domainContextPath],
      });

      return {
        status: 'updated',
        overviewPath,
        insightsPath,
        businessContextPath,
        domainContextPath,
        logPath,
        providerId: providerInfo.providerId,
      };
    } catch (error) {
      if (error instanceof AIProviderValidationError) {
        const fallbackPath = path.join(pdnaDir, 'architecture-insights.failed.json');
        await writeJsonFile(fallbackPath, {
          generatedAt: new Date().toISOString(),
          providerId: error.providerId,
          validationIssues: error.issues,
          payload: error.payload,
        });

        const logPath = await this.writeMarkdownLog(pdnaDir, {
          startedAt: new Date().toISOString(),
          overviewSummary: promptPackage.summary,
          promptPackage,
          provider: providerInfo.displayName,
          providerId: providerInfo.providerId,
          rawResponseSummary: this.summarizeJson(error.payload),
          validationResult: 'failure',
          savedFiles: [overviewPath, fallbackPath],
          failureDetails: error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
        });

        return {
          status: 'failed',
          overviewPath,
          insightsPath,
          fallbackPath,
          logPath,
          providerId: providerInfo.providerId,
        };
      }

      const fallbackPath = path.join(pdnaDir, 'architecture-insights.error.json');
      await writeJsonFile(fallbackPath, {
        generatedAt: new Date().toISOString(),
        providerId: providerInfo.providerId,
        error: error instanceof Error ? error.message : 'Unknown project overview analysis error.',
      });
      const logPath = await this.writeMarkdownLog(pdnaDir, {
        startedAt: new Date().toISOString(),
        overviewSummary: promptPackage.summary,
        promptPackage,
        provider: providerInfo.displayName,
        providerId: providerInfo.providerId,
        rawResponseSummary: 'No valid JSON response was captured.',
        validationResult: 'error',
        savedFiles: [overviewPath, fallbackPath],
        failureDetails: [error instanceof Error ? error.message : 'Unknown project overview analysis error.'],
      });

      throw new ProjectDnaError(`Project overview analysis failed. Fallback saved to ${fallbackPath}. Log saved to ${logPath}.`);
    }
  }

  private async promptForOverview(existingContent: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const prompt = existingContent.trim().length > 0
        ? 'Project overview already exists. Type a new overview, or press Enter to skip AI analysis:\n'
        : 'Enter the project overview (business and technical description). Press Enter to skip.\n';
      const answer = await rl.question(prompt);
      return answer;
    } finally {
      rl.close();
    }
  }

  private async ensureProjectDnaInitialized(pdnaDir: string): Promise<void> {
    if (!(await fs.pathExists(pdnaDir))) {
      throw new ProjectDnaError('Project DNA has not been initialized. Run `pdna init` before adding a project overview.');
    }

    const missingFiles: string[] = [];
    for (const fileName of REQUIRED_PROJECT_DNA_FILES) {
      if (!(await fs.pathExists(path.join(pdnaDir, fileName)))) {
        missingFiles.push(fileName);
      }
    }

    if (missingFiles.length > 0) {
      throw new ProjectDnaError(
        `Project DNA initialization is incomplete. Run \`pdna init\` before adding a project overview. Missing: ${missingFiles.join(', ')}`,
      );
    }
  }

  private async loadContextBundle(pdnaDir: string): Promise<StructuredAnalysisContextBundle> {
    const scannerFacts = await this.readRequiredJson(pdnaDir, 'scanner-report.json');

    return {
      scannerFacts,
      frameworkDetectionResults: scannerFacts.frameworkDetection ?? scannerFacts.detectedFrameworks,
      technologyDetectionResults: scannerFacts.technologyDetection ?? scannerFacts.technologies,
      architectureContext: await this.readRequiredJson(pdnaDir, 'architecture.json'),
      dependencyContext: await this.readRequiredJson(pdnaDir, 'dependencies.json'),
      businessContext: await this.readRequiredJson(pdnaDir, 'business-context.json'),
      domainContext: await this.readRequiredJson(pdnaDir, 'domain-context.json'),
      codingRules: await this.readRequiredJson(pdnaDir, 'coding-rules.json'),
      securityRules: await this.readRequiredJson(pdnaDir, 'security-rules.json'),
      apiConventions: await this.readRequiredJson(pdnaDir, 'api-conventions.json'),
      decisionLog: await this.readRequiredJson(pdnaDir, 'decision-log.json'),
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

  private deriveBusinessContext(current: unknown, insights: ArchitectureInsightsDocument): JsonObject {
    const next = { ...this.asObject(current) };
    const businessDomains = this.unique(insights.businessDomains.map((domain) => domain.name));

    if ('projectName' in next || !('domain' in next)) {
      next.projectName = this.nonEmptyString(next.projectName) ?? insights.project.name;
    }
    if ('summary' in next || !('domain' in next)) {
      next.summary = insights.businessIntent.overview || insights.summary;
    }
    if ('domain' in next) {
      next.domain = businessDomains[0] ?? this.nonEmptyString(next.domain) ?? 'Unknown';
    }
    if ('goals' in next) {
      next.goals = insights.businessIntent.goals;
    }
    if ('domains' in next || !('domain' in next)) {
      next.domains = businessDomains;
    }
    if ('generatedAt' in next) {
      next.generatedAt = insights.generatedAt;
    }
    if ('createdAt' in next) {
      next.createdAt = insights.generatedAt;
    }

    return next;
  }

  private deriveDomainContext(current: unknown, insights: ArchitectureInsightsDocument): JsonObject {
    const next = { ...this.asObject(current) };
    const domainNames = this.unique([
      ...insights.businessDomains.map((domain) => domain.name),
      ...insights.technicalDomains.map((domain) => domain.name),
    ]);

    if ('projectName' in next) {
      next.projectName = this.nonEmptyString(next.projectName) ?? insights.project.name;
    }
    if ('domains' in next || Object.keys(next).length === 0) {
      next.domains = domainNames;
    }
    if ('concepts' in next) {
      next.concepts = this.buildDomainConcepts(insights);
    }
    if ('modules' in next && Array.isArray(next.modules) && next.modules.length === 0) {
      next.modules = insights.importantModules.map((module) => ({ name: module.name, reason: module.reason }));
    }
    if ('generatedAt' in next) {
      next.generatedAt = insights.generatedAt;
    }
    if ('createdAt' in next) {
      next.createdAt = insights.generatedAt;
    }

    return next;
  }

  private buildDomainConcepts(insights: ArchitectureInsightsDocument): JsonObject[] {
    return [...insights.businessDomains, ...insights.technicalDomains].map((domain) => ({
      name: domain.name,
      description: domain.description,
    }));
  }

  private async writeMarkdownLog(
    pdnaDir: string,
    input: {
      startedAt: string;
      overviewSummary: string;
      promptPackage: PromptPackage;
      provider: string;
      providerId: string;
      rawResponseSummary: string;
      validationResult: 'success' | 'failure' | 'error';
      savedFiles: string[];
      failureDetails?: string[];
    },
  ): Promise<string> {
    const logsDir = path.join(pdnaDir, 'logs', 'project-overview');
    await fs.ensureDir(logsDir);
    const timestamp = new Date().toISOString();
    const fileName = `${timestamp.replace(/[:.]/g, '-')}.md`;
    const logPath = path.join(logsDir, fileName);
    const failureSection = input.failureDetails?.length
      ? ['## Failure Details', ...input.failureDetails.map((detail) => `- ${detail}`), ''].join('\n')
      : '';

    const markdown = [
      '# Project Overview Intelligence Run',
      '',
      `- Workflow start: ${input.startedAt}`,
      `- Log written: ${timestamp}`,
      `- Provider: ${input.provider} (${input.providerId})`,
      `- Validation result: ${input.validationResult}`,
      '',
      '## Input Overview Summary',
      input.overviewSummary || '(empty overview summary)',
      '',
      '## Condensed Prompt Sent to Fireworks',
      '````markdown',
      this.truncate(input.promptPackage.markdown, 12_000),
      '````',
      '',
      '## Raw Response Summary',
      '```json',
      this.truncate(input.rawResponseSummary, 8_000),
      '```',
      '',
      '## Saved Files',
      ...input.savedFiles.map((filePath) => `- ${filePath}`),
      '',
      failureSection,
    ].join('\n');

    await fs.writeFile(logPath, markdown, 'utf8');
    return logPath;
  }

  private summarizeJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 32)}\n...truncated for markdown log...`;
  }

  private asObject(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
  }

  private nonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}
