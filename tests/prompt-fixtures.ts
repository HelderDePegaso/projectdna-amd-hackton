import type { PromptKnowledgeBase } from '../src/prompt/prompt-types.js';

export const promptKnowledgeBase: PromptKnowledgeBase = {
  dependencies: {
    dependencies: ['commander', 'zod'],
  },
  businessContext: {
    projectName: 'projectdna',
    summary: 'Project DNA preserves architectural knowledge for AI coding assistants.',
    goals: ['Reduce AI hallucinations', 'Preserve architectural boundaries'],
    domains: ['AI Context Provisioning'],
  },
  domainContext: {
    domains: ['CLI', 'AI Context Provisioning', 'Schema Validation'],
    concepts: [
      { name: 'CLI', description: 'Command-line interface for user workflows.' },
      { name: 'AI Context Provisioning', description: 'Structured context for external AI coding assistants.' },
    ],
  },
  codingRules: {
    conventions: ['Prefer TypeScript for new implementation work.'],
  },
  securityRules: {
    concerns: ['Avoid storing secrets in source files.'],
  },
  apiConventions: {
    conventions: ['Keep command outputs concise and human-readable.'],
  },
  decisionLog: {
    decisions: [],
  },
  scannerReport: {
    projectName: 'projectdna',
    packageName: 'projectdna',
    packageVersion: '0.1.0',
    dependencies: ['commander', 'zod'],
    devDependencies: ['tsx', 'typescript'],
    technologies: ['typescript'],
    detectedFrameworks: [],
    sourceDirectories: ['src'],
  },
  architectureInsights: {
    summary: 'Project DNA is a TypeScript CLI with local-first Project DNA storage.',
    architectureStyle: {
      primary: 'Command-Line Interface (CLI)',
      reasoning: 'Commands orchestrate application use cases.',
    },
    businessIntent: {
      coreValue: 'Provide reliable project context to AI coding assistants.',
    },
    businessDomains: [
      { name: 'AI Context Provisioning', description: 'Providing structured context to AI coding assistants.' },
    ],
    technicalDomains: [
      { name: 'CLI', description: 'Command-line interface for Project DNA workflows.' },
    ],
    relevantTechnologies: [
      { name: 'typescript', category: 'language' },
      { name: 'commander', category: 'library' },
    ],
    dependencyIntent: {
      approved: ['commander', 'zod'],
    },
    recommendedConstraints: ['Keep command logic thin and delegate to application services.'],
    importantModules: [
      { name: 'CLI Commands', reason: 'Expose user-facing workflows.' },
    ],
    riskAreas: [],
  },
};