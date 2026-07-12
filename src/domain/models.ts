export interface FrameworkDetection {
  name?: string;
  confidence?: 'high' | 'medium' | 'low';
  evidence?: string[];
  version?: string;
}

export interface TechnologyDetection {
  name: string;
  category: 'framework' | 'language' | 'tool' | 'database' | 'styling' | 'testing' | 'runtime' | 'other';
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  version?: string;
}

export interface ProjectScanResult {
  projectName: string;
  projectRoot: string;
  packageName?: string;
  packageVersion?: string;
  dependencies: string[];
  devDependencies: string[];
  scripts: string[];
  technologies: string[];
  detectedFrameworks: string[];
  frameworkDetection: FrameworkDetection;
  technologyDetection: TechnologyDetection[];
  sourceDirectories: string[];
  configFiles: string[];
  generatedAt: string;
}

export interface ResolvedContext {
  projectName: string;
  projectRoot: string;
  technologies: string[];
  frameworks: string[];
  dependencies: string[];
  sourceDirectories: string[];
  architectureSummary: string;
  generatedAt: string;
}

export interface ArchitectureSnapshot {
  version: string;
  projectName: string;
  projectRoot: string;
  architecture: {
    summary: string;
    layers: string[];
  };
  dependencies: string[];
  businessContext: {
    domain: string;
    goals: string[];
  };
  generatedAt: string;
  scan?: ProjectScanResult;
}

export interface ProjectDnaFiles {
  architecture: string;
  dependencies: string;
  businessContext: string;
  domainContext: string;
  codingRules: string;
  securityRules: string;
  apiConventions: string;
  decisionLog: string;
  scannerReport: string;
  architectureInsights: string;
  projectOverview: string;
  projectDnaDirectory: string;
}

export interface ArchitectureInsights {
  projectName: string;
  status: 'pending' | 'ready';
  architectureStyle: string;
  businessDomains: string[];
  technicalDomains: string[];
  relevantFrameworks: string[];
  relevantTechnologies: string[];
  dependencyIntent: string[];
  businessIntent: string[];
  codingConventions: string[];
  securityConcerns: string[];
  riskAreas: string[];
  missingContext: string[];
  recommendedConstraints: string[];
  importantModules: string[];
  reasoningSummary: string;
  architecturalRecommendations: string[];
  generatedAt: string;
}

export interface PromptPackage {
  request: string;
  context: ResolvedContext;
  memorySummary: string;
  instructions: string[];
}

export interface ValidationResult {
  isValid: boolean;
  summary: string;
  issues: string[];
}

export interface ExecutionResult {
  output: string;
  provider: string;
  timestamp: string;
}

export interface ProjectDnaConfiguration {
  memoryDirectory: string;
  defaultProvider: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
