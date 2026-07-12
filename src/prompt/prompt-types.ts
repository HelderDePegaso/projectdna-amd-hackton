import type { JsonObject, PromptPackage } from '../ai/ai-provider-pdna.js';

export const PROMPT_MODES = ['fix', 'feature', 'refactor', 'explain'] as const;

export type PromptMode = typeof PROMPT_MODES[number];

export interface PromptSizeOptions {
  minChars: number;
  maxChars: number;
  softOverage: number;
}

export interface PromptCommandOptions {
  request?: string;
  mode?: PromptMode;
  minChars?: number;
  maxChars?: number;
  softOverage?: number;
  includeSecurity?: boolean;
}

export interface PromptKnowledgeBase {
  dependencies: JsonObject;
  businessContext: JsonObject;
  domainContext: JsonObject;
  codingRules: JsonObject;
  securityRules: JsonObject;
  apiConventions: JsonObject;
  decisionLog: JsonObject;
  scannerReport: JsonObject;
  architectureInsights: JsonObject;
}

export interface PromptBuildInput {
  knowledgeBase: PromptKnowledgeBase;
  request: string;
  mode: PromptMode;
  size: PromptSizeOptions;
  includeSecurity: boolean;
  metadata?: JsonObject;
  promptPackage?: PromptPackage;
}

export interface PromptPersistenceResult {
  promptPath: string;
  logPath: string;
  jsonPath: string;
}

export interface PromptDomain {
  name: string;
  description: string;
  source: 'business-context' | 'domain-context' | 'architecture-insights' | 'inferred';
  score: number;
}

export interface PromptContextResolution {
  projectName: string;
  request: string;
  mode: PromptMode;
  size: PromptSizeOptions;
  selectedDomains: PromptDomain[];
  requestKeywords: string[];
  dependencyHints: string[];
  scannerFacts: {
    packageName?: string;
    packageVersion?: string;
    technologies: string[];
    frameworks: string[];
    sourceDirectories: string[];
  };
  missingContext: string[];
  warnings: string[];
}

export interface SelectedPromptArtifacts {
  businessContext: string[];
  domainContext: string[];
  architectureNotes: string[];
  technologies: string[];
  dependencies: string[];
  codingConstraints: string[];
  securityConstraints: string[];
  apiConstraints: string[];
  expectedOutcome: string[];
  missingContext: string[];
  warnings: string[];
}