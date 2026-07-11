import type { AIProviderCapabilities, AIProviderPDNA, AIProviderStatus, StructuredAnalysisRequest } from './ai-provider-pdna.js';
import type { PromptPackage } from './ai-provider-pdna.js';
import { AIProviderExecutionError } from './ai-provider-pdna.js';
import type { ArchitectureInsightsDocument } from '../infrastructure/intelligence/architecture-insights.schema.js';
import { ArchitectureInsightsSchema } from '../infrastructure/intelligence/architecture-insights.schema.js';
import type { OverviewPromptBuilderInput } from './overview-prompt-builder.js';
import { OverviewPromptBuilder } from './overview-prompt-builder.js';
import type { PromptBuilder } from './prompt-builder.js';
import type { ZodIssue } from 'zod';

export interface ActiveProviderInfo {
  providerId: string;
  displayName: string;
  capabilities: AIProviderCapabilities;
}

export class AIProviderValidationError extends Error {
  public readonly providerId: string;
  public readonly payload: unknown;
  public readonly issues: ZodIssue[];
  public readonly promptPackage: PromptPackage;

  constructor(providerId: string, payload: unknown, issues: ZodIssue[], promptPackage: PromptPackage) {
    super(`Provider ${providerId} returned an invalid architecture insights payload.`);
    this.name = 'AIProviderValidationError';
    this.providerId = providerId;
    this.payload = payload;
    this.issues = issues;
    this.promptPackage = promptPackage;
  }
}

export class PDNAAIService {
  constructor(
    private activeProvider: AIProviderPDNA,
    private readonly overviewPromptBuilder: PromptBuilder<OverviewPromptBuilderInput> = new OverviewPromptBuilder(),
  ) {}

  public setActiveProvider(provider: AIProviderPDNA): void {
    this.activeProvider = provider;
  }

  public getActiveProviderInfo(): ActiveProviderInfo {
    return {
      providerId: this.activeProvider.providerId,
      displayName: this.activeProvider.displayName,
      capabilities: this.activeProvider.getCapabilities(),
    };
  }

  public async getActiveProviderStatus(): Promise<AIProviderStatus> {
    return this.activeProvider.getStatus();
  }

  public async analyzeProjectOverview(request: StructuredAnalysisRequest): Promise<ArchitectureInsightsDocument> {
    const capabilities = this.activeProvider.getCapabilities();
    if (!capabilities.supportsStructuredOutput || !capabilities.supportedModes.includes('overview-analysis')) {
      throw new AIProviderExecutionError(
        this.activeProvider.providerId,
        `Provider ${this.activeProvider.displayName} does not support structured project overview analysis.`,
      );
    }

    const promptPackage = request.promptPackage ?? this.overviewPromptBuilder.build({
      overview: request.overview,
      contextBundle: request.contextBundle,
      metadata: request.metadata,
    });

    const rawResult = await this.activeProvider.executeStructuredAnalysis({
      ...request,
      mode: 'overview-analysis',
      promptPackage,
    });

    const parsed = ArchitectureInsightsSchema.safeParse(rawResult);
    if (!parsed.success) {
      throw new AIProviderValidationError(this.activeProvider.providerId, rawResult, parsed.error.issues, promptPackage);
    }

    return parsed.data;
  }
}
