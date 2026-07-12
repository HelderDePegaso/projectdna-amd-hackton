import OpenAI from 'openai';
import type { AIProviderCapabilities, AIProviderPDNA, AIProviderStatus, StructuredAnalysisRequest } from './ai-provider-pdna.js';
import { AIProviderExecutionError } from './ai-provider-pdna.js';
import { EnvironmentService } from './environment.service.js';

type FireworksChatClient = {
  chat: {
    completions: {
      create(request: {
        model: string;
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        temperature: number;
        response_format: { type: 'json_object' };
      }): Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
};

export interface FireworksServiceOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  projectDnaVersion?: string;
  client?: FireworksChatClient;
  environment?: EnvironmentService;
}

const DEFAULT_PROJECT_DNA_VERSION = '0.1.0';

export class FireworksService implements AIProviderPDNA {
  public readonly providerId = 'fireworks';
  public readonly displayName = 'Fireworks';

  private readonly apiKey?: string;
  private readonly baseURL: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly projectDnaVersion: string;
  private readonly providedClient?: FireworksChatClient;

  constructor(options: FireworksServiceOptions = {}) {
    const environment = options.environment ?? new EnvironmentService();
    this.apiKey = options.apiKey ?? environment.getOptionalFireworksApiKey();
    this.baseURL = options.baseURL ?? environment.getBaseUrl();
    this.model = options.model ?? environment.getModel();
    this.temperature = options.temperature ?? environment.getTemperature();
    this.timeoutMs = options.timeoutMs ?? environment.getTimeout();
    this.projectDnaVersion = options.projectDnaVersion ?? DEFAULT_PROJECT_DNA_VERSION;
    this.providedClient = options.client;
  }

  public async getStatus(): Promise<AIProviderStatus> {
    if (!this.apiKey && !this.providedClient) {
      return {
        available: false,
        message: 'Missing PDNA_FIREWORKS_API_KEY or FIREWORKS_API_KEY environment variable.',
        metadata: this.getConfigurationMetadata(),
      };
    }

    return {
      available: true,
      message: 'Fireworks provider is configured.',
      metadata: this.getConfigurationMetadata(),
    };
  }

  public getCapabilities(): AIProviderCapabilities {
    return {
      supportsStructuredOutput: true,
      supportsStatusCheck: true,
      supportedModes: ['overview-analysis', 'prompt-enrichment'],
      metadata: {
        model: this.model,
        responseFormat: 'json_object',
        temperature: this.temperature,
        timeoutMs: this.timeoutMs,
      },
    };
  }

  public async executeStructuredAnalysis(request: StructuredAnalysisRequest): Promise<unknown> {
    const status = await this.getStatus();
    if (!status.available) {
      throw new AIProviderExecutionError(this.providerId, `Fireworks provider is unavailable: ${status.message}`);
    }

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.buildProviderSystemPrompt(request) },
          { role: 'user', content: request.promptPackage?.userPrompt ?? this.buildUserPrompt(request) },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIProviderExecutionError(this.providerId, 'Fireworks returned an empty response.');
      }

      return this.parseStructuredResponse(content);
    } catch (error) {
      if (error instanceof AIProviderExecutionError) {
        throw error;
      }

      const details = this.describeProviderError(error);
      throw new AIProviderExecutionError(this.providerId, `Fireworks failed to execute ${request.mode ?? 'structured'} analysis.${details}`, error);
    }
  }

  private getClient(): FireworksChatClient {
    if (this.providedClient) {
      return this.providedClient;
    }

    return new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      timeout: this.timeoutMs,
    }) as unknown as FireworksChatClient;
  }

  private getConfigurationMetadata(): Record<string, string | number> {
    return {
      model: this.model,
      baseURL: this.baseURL,
      temperature: this.temperature,
      timeoutMs: this.timeoutMs,
    };
  }

  private describeProviderError(error: unknown): string {
    if (!(error instanceof Error)) {
      return '';
    }

    const cause = error.cause instanceof Error ? ` Cause: ${error.cause.message}` : '';
    return ` ${error.name}: ${error.message}.${cause}`;
  }

  private buildSystemPrompt(): string {
    return [
      'You are the Fireworks Architecture Intelligence provider for Project DNA.',
      'Analyze only the project overview and the supplied Project DNA context.',
      'Do not generate code, UI, commands, or implementation patches.',
      'Return a single JSON object with no markdown.',
      'The JSON must conform to the architecture-insights.json schema contract supplied by the user message.',
      'Use generator.provider "fireworks".',
      `Use generator.model "${this.model}".`,
      `Use generator.projectDnaVersion "${this.projectDnaVersion}".`,
      'Include every required field. Use empty arrays or concise strings when evidence is unavailable.',
    ].join('\n');
  }

  private buildProviderSystemPrompt(request: StructuredAnalysisRequest): string {
    const basePrompt = request.promptPackage?.systemPrompt ?? this.buildSystemPrompt();
    return [
      basePrompt,
      '',
      '# Provider Metadata',
      'Use generator.provider "fireworks".',
      `Use generator.model "${this.model}".`,
      `Use generator.projectDnaVersion "${this.projectDnaVersion}".`,
    ].join('\n');
  }

  private buildUserPrompt(request: StructuredAnalysisRequest): string {
    return JSON.stringify(
      {
        task: 'project-overview-architecture-analysis',
        schemaContract: this.buildArchitectureInsightsContract(),
        overview: request.overview,
        contextBundle: request.contextBundle,
        metadata: request.metadata ?? {},
      },
      null,
      2,
    );
  }

  private buildArchitectureInsightsContract(): Record<string, unknown> {
    return {
      schemaVersion: '1.0',
      generatedAt: 'ISO-8601 string',
      generator: {
        provider: 'fireworks',
        model: this.model,
        projectDnaVersion: this.projectDnaVersion,
      },
      source: {
        overviewProvided: 'boolean',
        scannerReportVersion: 'string',
        architectureVersion: 'string optional',
      },
      summary: 'string',
      project: {
        name: 'string',
        language: 'string',
        packageManager: 'string',
        framework: {
          name: 'string',
          version: 'string optional',
          confidence: 'number 0..1',
          evidence: ['string'],
        },
      },
      architectureStyle: {
        primary: 'string',
        secondary: ['string'],
        reasoning: 'string',
      },
      projectStructure: {
        layers: [{ name: 'string', description: 'string', folders: ['string'] }],
        modules: [{ name: 'string', responsibility: 'string', dependencies: ['string'] }],
        boundaries: [{ from: 'string', to: 'string', rule: 'string' }],
        importantFolders: ['string'],
        importantFiles: ['string'],
      },
      businessDomains: [{ name: 'string', description: 'string' }],
      technicalDomains: [{ name: 'string', description: 'string' }],
      relevantTechnologies: [
        {
          name: 'string',
          version: 'string optional',
          category: 'language | framework | runtime | database | orm | testing | styling | deployment | tooling | library | other',
        },
      ],
      dependencyIntent: {
        approved: ['string'],
        discouraged: ['string'],
        forbidden: ['string'],
        reasoning: 'string',
      },
      businessIntent: {
        overview: 'string',
        targetUsers: ['string'],
        goals: ['string'],
        coreValue: 'string',
      },
      codingConventions: {
        patterns: ['string'],
        naming: ['string'],
        style: ['string'],
        architectureRules: ['string'],
      },
      securityConcerns: [{ title: 'string', description: 'string', severity: 'low | medium | high | critical' }],
      riskAreas: [{ area: 'string', reason: 'string', impact: 'low | medium | high | critical' }],
      missingContext: [{ topic: 'string', reason: 'string' }],
      recommendedConstraints: ['string'],
      importantModules: [{ name: 'string', reason: 'string' }],
      reasoningSummary: 'string',
      architecturalRecommendations: [
        {
          priority: 'low | medium | high | critical',
          title: 'string',
          description: 'string',
          rationale: 'string',
        },
      ],
      confidence: {
        score: 'number 0..1',
        notes: ['string'],
      },
      evidence: {
        scannerSignals: ['string'],
        overviewSignals: ['string'],
        derivedSignals: ['string'],
      },
    };
  }

  private parseStructuredResponse(content: string): unknown {
    try {
      return JSON.parse(content) as unknown;
    } catch (error) {
      throw new AIProviderExecutionError(this.providerId, 'Fireworks returned invalid JSON.', error);
    }
  }
}
