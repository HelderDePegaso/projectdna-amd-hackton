import type { JsonObject, PromptPackage, StructuredAnalysisContextBundle } from './ai-provider-pdna.js';
import type { PromptBuilder } from './prompt-builder.js';

export interface OverviewPromptBuilderInput {
  overview: string;
  contextBundle: StructuredAnalysisContextBundle;
  metadata?: JsonObject;
}

const TECHNOLOGY_CATEGORIES = [
  'language',
  'framework',
  'runtime',
  'database',
  'orm',
  'testing',
  'styling',
  'deployment',
  'tooling',
  'library',
  'other',
] as const;

export class OverviewPromptBuilder implements PromptBuilder<OverviewPromptBuilderInput> {
  public build(input: OverviewPromptBuilderInput): PromptPackage {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);
    const markdown = `${systemPrompt}\n\n${userPrompt}`;

    return {
      systemPrompt,
      userPrompt,
      markdown,
      summary: this.summarizeOverview(input.overview),
      metadata: {
        contextPacking: 'minimal-high-signal',
        outputSchema: 'architecture-insights.json@1.0',
      },
    };
  }

  private buildSystemPrompt(): string {
    return [
      '# 1. System Role',
      'You are Fireworks acting as the Project DNA Architecture Intelligence Agent.',
      'You reason about architecture, business intent, domains, risks, constraints, and missing context.',
      'You do not generate code, UI, shell commands, implementation patches, or generic chatbot commentary.',
      '',
      '# 2. Mission',
      'Convert the human project overview plus compact Project DNA evidence into one structured architecture-insights.json object.',
      'The output must be valid JSON only and must conform to the provided schema contract.',
      '',
      '# Output Phases',
      'Your JSON must support three derived outputs without a second AI pass:',
      'A. Architecture Insights: architecture style, technologies, modules, risks, constraints, recommendations, confidence, and evidence.',
      'B. Business Context Output: business summary, goals, domains, target users, and product intent compatible with business-context.json.',
      'C. Domain Context Output: flat canonical domain names, simple module alignment, and cross-references compatible with domain-context.json.',
      '',
      '# 7. Inference Rules',
      '- Scanner facts are the source of truth for technical reality.',
      '- The human overview is the source of truth for business intent.',
      '- Existing business and domain context should be preserved and enriched when supported by evidence.',
      '- If overview and scanner conflict on technical facts, scanner facts win.',
      '- If something cannot be confidently inferred, report it as missing context.',
      '- Do not invent unsupported facts or certainty.',
      '- Use canonical English domain names where possible and keep matching domain names stable across business and domain context.',
      '',
      '# 10. Fallback Behavior',
      'If evidence is weak, keep required fields present with empty arrays or concise uncertainty notes.',
    ].join('\n');
  }

  private buildUserPrompt(input: OverviewPromptBuilderInput): string {
    const compactContext = this.buildCompactContext(input.contextBundle);
    const decisionLogSection = compactContext.decisionLog
      ? ['','## Decision Log', this.renderJsonBlock(compactContext.decisionLog)].join('\n')
      : '';

    return [
      '# 3. Project Identity',
      this.renderJsonBlock(compactContext.projectIdentity),
      '',
      '# 4. Scanner Facts',
      this.renderJsonBlock(compactContext.scannerFacts),
      '',
      '# 5. Existing Project DNA Knowledge',
      '## Business Context',
      this.renderJsonBlock(compactContext.businessContext),
      '',
      '## Domain Context',
      this.renderJsonBlock(compactContext.domainContext),
      '',
      '## Architecture Summary',
      this.renderJsonBlock(compactContext.architectureContext),
      '',
      '## Dependency Summary',
      this.renderJsonBlock(compactContext.dependencyContext),
      '',
      '## Coding, Security, and API Rules',
      this.renderJsonBlock(compactContext.rulesContext),
      decisionLogSection,
      '',
      '# 6. Human Project Overview',
      input.overview,
      '',
      '# 8. Output Contract',
      this.renderJsonBlock(this.buildArchitectureInsightsContract()),
      '',
      '# 9. Quality Rules',
      '- Return JSON only. Do not wrap the response in markdown.',
      '- Keep the result concise and evidence-based.',
      '- Include architecture insights, business meaning, and domain interpretation in the schema fields.',
      '- Business context must be derivable from businessIntent and businessDomains.',
      '- Domain context must be derivable from businessDomains, technicalDomains, importantModules, and projectStructure.',
      '- Cross-check scanner signals, overview signals, and derived signals in the evidence section.',
    ].filter(Boolean).join('\n');
  }

  private buildCompactContext(contextBundle: StructuredAnalysisContextBundle): JsonObject {
    const scannerFacts = this.asObject(contextBundle.scannerFacts);
    const architectureContext = this.asObject(contextBundle.architectureContext);
    const dependencyContext = this.asObject(contextBundle.dependencyContext);
    const codingRules = this.asObject(contextBundle.codingRules);
    const securityRules = this.asObject(contextBundle.securityRules);
    const apiConventions = this.asObject(contextBundle.apiConventions);

    return {
      projectIdentity: {
        name: this.pickString(scannerFacts, ['projectName', 'packageName']) ?? this.pickString(architectureContext, ['projectName']),
        packageName: this.pickString(scannerFacts, ['packageName']),
        packageVersion: this.pickString(scannerFacts, ['packageVersion']),
        generatedAt: this.pickString(scannerFacts, ['generatedAt']),
      },
      scannerFacts: {
        frameworkDetection: scannerFacts.frameworkDetection ?? scannerFacts.detectedFrameworks,
        technologyDetection: this.takeArray(scannerFacts.technologyDetection ?? scannerFacts.technologies, 20),
        dependencies: this.takeArray(scannerFacts.dependencies, 25),
        devDependencies: this.takeArray(scannerFacts.devDependencies, 15),
        scripts: this.takeArray(scannerFacts.scripts, 15),
        sourceDirectories: this.takeArray(scannerFacts.sourceDirectories, 20),
        configFiles: this.takeArray(scannerFacts.configFiles, 20),
      },
      businessContext: contextBundle.businessContext,
      domainContext: contextBundle.domainContext,
      architectureContext: {
        architectureStyle: architectureContext.architectureStyle ?? architectureContext.identity,
        layers: architectureContext.layers,
        summary: architectureContext.summary,
        rules: this.takeArray(architectureContext.rules, 15),
      },
      dependencyContext: {
        dependencyIntent: dependencyContext.dependencyIntent,
        dependencies: this.takeArray(dependencyContext.dependencies, 25),
        devDependencies: this.takeArray(dependencyContext.devDependencies, 15),
        detectedTechnologies: this.takeArray(dependencyContext.detectedTechnologies, 20),
      },
      rulesContext: {
        coding: {
          conventions: this.takeArray(codingRules.conventions, 20),
          formatting: this.takeArray(codingRules.formatting, 10),
          linting: this.takeArray(codingRules.linting, 10),
        },
        security: {
          concerns: this.takeArray(securityRules.concerns, 20),
          policies: this.takeArray(securityRules.policies, 20),
          restrictions: this.takeArray(securityRules.restrictions, 20),
          rules: this.takeArray(securityRules.rules, 20),
        },
        api: {
          conventions: this.takeArray(apiConventions.conventions, 20),
          patterns: this.takeArray(apiConventions.patterns, 20),
          naming: this.takeArray(apiConventions.naming, 20),
          responseShapes: this.takeArray(apiConventions.responseShapes, 20),
        },
      },
      decisionLog: this.compactDecisionLog(contextBundle.decisionLog),
    };
  }

  private buildArchitectureInsightsContract(): JsonObject {
    return {
      schemaVersion: '1.0',
      generatedAt: 'ISO-8601 string',
      generator: {
        provider: 'fireworks',
        model: 'string',
        projectDnaVersion: 'string',
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
      relevantTechnologies: [{ name: 'string', version: 'string optional', category: TECHNOLOGY_CATEGORIES.join(' | ') }],
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
      architecturalRecommendations: [{ priority: 'low | medium | high | critical', title: 'string', description: 'string', rationale: 'string' }],
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

  private compactDecisionLog(value: unknown): unknown {
    const decisionLog = this.asObject(value);
    const decisions = this.takeArray(decisionLog.decisions, 20);
    if (decisions.length === 0) {
      return undefined;
    }

    return {
      decisions,
      generatedAt: decisionLog.generatedAt ?? decisionLog.createdAt,
    };
  }

  private summarizeOverview(overview: string): string {
    const normalized = overview.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 180) {
      return normalized;
    }

    return `${normalized.slice(0, 177)}...`;
  }

  private renderJsonBlock(value: unknown): string {
    return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
  }

  private asObject(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
  }

  private pickString(source: JsonObject, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private takeArray(value: unknown, limit: number): unknown[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.slice(0, limit);
  }
}
