export type StructuredAnalysisMode = 'overview-analysis';

export type JsonObject = Record<string, unknown>;

export interface PromptPackage {
  systemPrompt: string;
  userPrompt: string;
  markdown: string;
  summary: string;
  metadata?: JsonObject;
}

export interface StructuredAnalysisContextBundle {
  scannerFacts: JsonObject;
  frameworkDetectionResults?: unknown;
  technologyDetectionResults?: unknown;
  dependencyContext: unknown;
  architectureContext: unknown;
  businessContext: unknown;
  domainContext: unknown;
  codingRules: unknown;
  securityRules: unknown;
  apiConventions: unknown;
  decisionLog: unknown;
}

export interface StructuredAnalysisRequest {
  mode?: StructuredAnalysisMode;
  overview: string;
  contextBundle: StructuredAnalysisContextBundle;
  promptPackage?: PromptPackage;
  metadata?: JsonObject;
}

export interface AIProviderStatus {
  available: boolean;
  message: string;
  metadata?: JsonObject;
}

export interface AIProviderCapabilities {
  supportsStructuredOutput: boolean;
  supportsStatusCheck: boolean;
  supportedModes: readonly string[];
  metadata?: JsonObject;
}

export interface AIProviderPDNA {
  readonly providerId: string;
  readonly displayName: string;

  getStatus(): Promise<AIProviderStatus>;
  getCapabilities(): AIProviderCapabilities;
  executeStructuredAnalysis(request: StructuredAnalysisRequest): Promise<unknown>;
}

export class AIProviderExecutionError extends Error {
  public readonly providerId: string;
  public readonly cause?: unknown;

  constructor(providerId: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'AIProviderExecutionError';
    this.providerId = providerId;
    this.cause = cause;
  }
}
