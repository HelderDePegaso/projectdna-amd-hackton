import type { JsonObject, PromptPackage } from '../ai/ai-provider-pdna.js';
import type { PromptBuildInput } from './prompt-types.js';

const TECHNOLOGY_LIMIT = 20;
const DEPENDENCY_LIMIT = 24;

export class PromptBuilder {
  public build(input: PromptBuildInput): PromptPackage {
    const compactContext = this.buildCompactContext(input);
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, compactContext);

    return {
      systemPrompt,
      userPrompt,
      markdown: `${systemPrompt}\n\n${userPrompt}`,
      summary: this.summarize(input.request),
      metadata: {
        mode: input.mode,
        includeSecurity: input.includeSecurity,
        outputSchema: 'prompt-enrichment.json@1.0',
        contextPacking: 'project-dna-prompt-enrichment',
      },
    };
  }

  private buildSystemPrompt(): string {
    return [
      '# 1. System Role',
      'You are the Project DNA Prompt Enrichment Agent running through Fireworks.',
      'You are not a code generator and you are not a generic chat assistant.',
      'Your job is to transform the user request into a project-aware, architecture-aware, domain-aware prompt for an external AI coding assistant.',
      '',
      '# 2. Mission',
      'Infer the relevant project domains and context from the supplied Project DNA artifacts.',
      'Use that inference to enrich the original user request into a final Markdown prompt.',
      'Return structured JSON only. The final enriched prompt must be inside enrichedPrompt.markdown.',
      '',
      '# 3. Evidence Priority',
      '- Use scanner facts for technical reality.',
      '- Use business-context.json for product and business meaning.',
      '- Use domain-context.json for domain selection and canonical domain names.',
      '- Use architecture-insights.json for architecture style, constraints, risks, and important modules.',
      '- Use coding-rules.json, api-conventions.json, and optionally security-rules.json as implementation boundaries.',
      '- Do not invent dependencies, modules, domains, architecture patterns, or file paths.',
      '',
      '# 4. Non-Goals',
      '- Do not write implementation code.',
      '- Do not output shell commands.',
      '- Do not redesign Project DNA.',
      '- Do not emit markdown outside the required JSON object.',
      '',
      '# 5. Missing Context Policy',
      'If evidence is insufficient, explicitly report missing context in enrichedPrompt.missingContext and confidence.notes.',
    ].join('\n');
  }

  private buildUserPrompt(input: PromptBuildInput, compactContext: JsonObject): string {
    return [
      '# User Request',
      input.request,
      '',
      '# Prompt Mode',
      input.mode,
      '',
      '# Prompt Size Targets',
      this.renderJsonBlock(input.size),
      '',
      '# Included Security Rules',
      String(input.includeSecurity),
      '',
      '# Project DNA Context Package',
      this.renderJsonBlock(compactContext),
      '',
      '# Output Contract',
      this.renderJsonBlock(this.buildOutputContract(input)),
      '',
      '# Final Prompt Requirements',
      '- enrichedPrompt.markdown must be formal English.',
      '- enrichedPrompt.markdown must include: Task, Relevant Project Context, Relevant Domains, Architecture Notes, Technologies / Dependencies, Coding Constraints, API / Structural Constraints, Expected Outcome, Missing Context.',
      '- Include Security Constraints only when securityIncluded is true and security evidence exists.',
      '- Respect minChars, maxChars, and softOverage as practical character targets for enrichedPrompt.markdown.',
      '- The selectedDomains array must be inferred by Fireworks from the artifacts, not copied blindly.',
      '- Every selected domain must include evidence from the supplied artifacts.',
    ].join('\n');
  }

  private buildCompactContext(input: PromptBuildInput): JsonObject {
    const scannerReport = this.asObject(input.knowledgeBase.scannerReport);
    const architectureInsights = this.asObject(input.knowledgeBase.architectureInsights);
    const dependencies = this.asObject(input.knowledgeBase.dependencies);

    return {
      businessContext: input.knowledgeBase.businessContext,
      domainContext: input.knowledgeBase.domainContext,
      architectureInsights: {
        summary: architectureInsights.summary,
        architectureStyle: architectureInsights.architectureStyle,
        businessDomains: architectureInsights.businessDomains,
        technicalDomains: architectureInsights.technicalDomains,
        //businessIntent: architectureInsights.businessIntent,
        codingConventions: architectureInsights.codingConventions,
        riskAreas: architectureInsights.riskAreas,
        //missingContext: architectureInsights.missingContext,
        //recommendedConstraints: architectureInsights.recommendedConstraints,
        //importantModules: architectureInsights.importantModules,
        //architecturalRecommendations: architectureInsights.architecturalRecommendations,
        confidence: architectureInsights.confidence,
      },
      scannerFacts: {
        projectName: scannerReport.projectName,
        packageName: scannerReport.packageName,
        packageVersion: scannerReport.packageVersion,
        technologies: this.takeArray(scannerReport.technologies, TECHNOLOGY_LIMIT),
        detectedFrameworks: this.takeArray(scannerReport.detectedFrameworks, 8),
        frameworkDetection: scannerReport.frameworkDetection,
        technologyDetection: this.takeArray(scannerReport.technologyDetection, TECHNOLOGY_LIMIT),
        sourceDirectories: this.takeArray(scannerReport.sourceDirectories, 20),
        configFiles: this.takeArray(scannerReport.configFiles, 12),
      },
      dependencies: {
        dependencies: this.takeArray(scannerReport.dependencies ?? dependencies.dependencies, DEPENDENCY_LIMIT),
        //devDependencies: this.takeArray(scannerReport.devDependencies ?? dependencies.devDependencies, 16),
        //dependencyIntent: dependencies.dependencyIntent,
        scripts: this.takeArray(scannerReport.scripts ?? dependencies.scripts, 16),
      },
      codingRules: input.knowledgeBase.codingRules,
      apiConventions: input.knowledgeBase.apiConventions,
      securityRules: input.includeSecurity ? input.knowledgeBase.securityRules ?? {} : { omitted: true },
      decisionLog: this.compactDecisionLog(input.knowledgeBase.decisionLog),
    };
  }

  private buildOutputContract(input: PromptBuildInput): JsonObject {
    return {
      schemaVersion: '1.0',
      generatedAt: 'ISO-8601 string',
      generator: {
        provider: 'fireworks',
        model: 'string',
        projectDnaVersion: 'string',
      },
      source: {
        userRequest: input.request,
        mode: input.mode,
        includedArtifacts: ['business-context.json', 'domain-context.json', 'architecture-insights.json', 'scanner-report.json', 'dependencies.json', 'coding-rules.json', 'api-conventions.json', input.includeSecurity ? 'security-rules.json' : null].filter(Boolean),
        securityIncluded: input.includeSecurity,
      },
      selectedDomains: [{ name: 'string', reason: 'string', evidence: ['string'] }],
      relevantContext: {
        business: ['string'],
        domain: ['string'],
        architecture: ['string'],
        codingRules: ['string'],
        apiConventions: ['string'],
        securityRules: ['string'],
        dependencies: ['string'],
      },
      enrichedPrompt: {
        title: 'string',
        markdown: 'string',
        expectedOutcome: ['string'],
        warnings: ['string'],
        missingContext: ['string'],
      },
      confidence: {
        score: 'number 0..1',
        notes: ['string'],
      },
    };
  }

  private compactDecisionLog(value: unknown): unknown {
    const decisionLog = this.asObject(value);
    return {
      decisions: this.takeArray(decisionLog.decisions, 12),
      generatedAt: decisionLog.generatedAt ?? decisionLog.createdAt,
    };
  }

  private renderJsonBlock(value: unknown): string {
    return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
  }

  private summarize(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}...`;
  }

  private asObject(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
  }

  private takeArray(value: unknown, limit: number): unknown[] {
    return Array.isArray(value) ? value.slice(0, limit) : [];
  }
}