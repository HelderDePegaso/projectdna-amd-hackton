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
      'Think like an architecture analyst whose output will guide a separate AI coding assistant.',
      'Your job is to transform the user request into a project-aware, architecture-aware, domain-aware prompt that reduces hallucination and preserves Project DNA constraints.',
      '',
      '# 2. Mission',
      'Analyze the user request, select only relevant Project DNA evidence, and use that evidence to enrich the original request into a final Markdown prompt.',
      'Return structured JSON only. The final enriched prompt must be inside enrichedPrompt.markdown.',
      '',
      '# 3. Reasoning Protocol',
      'Before producing the JSON, perform this reasoning internally and reflect the important conclusions in the JSON fields:',
      '1. Intent analysis: determine what the user wants, the software concern involved, the modification type, and the likely technical area affected.',
      '2. Evidence inventory: separate Facts, Inference, and Missing Context from the supplied artifacts.',
      '3. Artifact selection: decide which Project DNA artifacts are relevant for this request before selecting domains or dependencies.',
      '4. Domain selection: select only domains that are directly relevant to the request and supported by evidence.',
      '5. Evidence ranking: prefer high-confidence evidence, report conflicts, and lower confidence when evidence is weak or ambiguous.',
      '6. Prompt synthesis: convert selected project knowledge into actionable implementation guidance for another AI coding assistant.',
      '',
      '# 4. Evidence Rules',
      '- A Fact is directly present in the supplied Project DNA artifacts.',
      '- An Inference is derived from multiple facts. Never present an inference as a confirmed fact.',
      '- Missing Context is information that cannot be safely inferred from the supplied artifacts.',
      '- Every important conclusion must be traceable to supplied artifacts.',
      '- Do not invent domains, dependencies, modules, architecture styles, project conventions, file names, technologies, APIs, or storage locations.',
      '- If evidence is insufficient, say so explicitly in enrichedPrompt.missingContext and confidence.notes.',
      '- If two artifacts conflict, report the conflict in enrichedPrompt.warnings and confidence.notes instead of silently resolving it.',
      '',
      '# 5. Evidence Priority',
      '- Architecture rules and architecture-insights.json are first-class evidence and outrank generic programming knowledge.',
      '- coding-rules.json, api-conventions.json, security-rules.json, and architecture-insights.json constrain every implementation recommendation.',
      '- Use scanner facts for technical reality: detected technologies, dependencies, source directories, scripts, and configuration files.',
      '- Use business-context.json for product goals, users, and business meaning.',
      '- Use domain-context.json for canonical domain names and domain concepts.',
      '- Use dependencies.json and scanner dependency facts only for dependencies that actually appear in the artifacts.',
      '- Use decision-log.json for prior architectural decisions when relevant to the request.',
      '',
      '# 6. Domain Selection Rules',
      '- Do not copy all available domains.',
      '- Select a domain only when the request meaning and artifact evidence both support it.',
      '- For each selectedDomains item, reason must include why it was selected and a confidence label: high, medium, or low.',
      '- For each selectedDomains item, evidence must cite the supporting artifact names and concise evidence statements.',
      '- Ignore domains that are plausible in general but unsupported by the current request and artifacts.',
      '',
      '# 7. Conservative Assumptions',
      '- When the request is ambiguous, explain the ambiguity.',
      '- Choose the most likely interpretation only when evidence supports it.',
      '- Report credible alternative interpretations in enrichedPrompt.missingContext or enrichedPrompt.warnings.',
      '- Reduce confidence when relying on inference or when artifacts are sparse.',
      '',
      '# 8. Non-Goals',
      '- Do not write implementation code.',
      '- Do not output shell commands.',
      '- Do not redesign Project DNA.',
      '- Do not emit markdown outside the required JSON object.',
      '',
      '# 9. Output Philosophy',
      'The enriched prompt must not merely repeat project information.',
      'Every section must turn relevant evidence into useful guidance for another coding model.',
      'Avoid redundancy, generic explanations, and unsupported recommendations.',
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
      '# Required Internal Reasoning',
      'Perform the following analysis before writing the JSON response:',
      '- Intent Analysis: identify the user goal, software concern, requested modification type, and affected technical area.',
      '- Artifact Relevance: decide which supplied artifacts matter for this request and ignore unrelated artifacts.',
      '- Fact / Inference / Missing Context Separation: keep direct evidence separate from derived conclusions and uncertainty.',
      '- Domain Selection: choose only relevant domains, each with evidence and a confidence label embedded in the reason.',
      '- Evidence Ranking: prefer direct, current, architecture-specific evidence over weak or generic evidence.',
      '- Constraint Application: ensure all recommendations obey architecture insights, coding rules, API conventions, and security rules when included.',
      '',
      '# Project DNA Context Package',
      this.renderJsonBlock(compactContext),
      '',
      '# Output Contract',
      this.renderJsonBlock(this.buildOutputContract(input)),
      '',
      '# Output Field Guidance',
      '- selectedDomains[].reason must include "Confidence: high|medium|low" plus why the domain is relevant to this request.',
      '- selectedDomains[].evidence must contain concise artifact-backed evidence, for example "domain-context.json: <fact>".',
      '- relevantContext arrays must include only context that influenced the final prompt; leave unrelated categories empty.',
      '- enrichedPrompt.warnings must include evidence conflicts, risky assumptions, and ambiguous interpretations.',
      '- enrichedPrompt.missingContext must include facts needed for safer implementation but absent from the artifacts.',
      '- confidence.notes must summarize evidence strength, inference strength, conflicts, and ambiguity.',
      '',
      '# Final Prompt Requirements',
      '- enrichedPrompt.markdown must be formal English.',
      '- enrichedPrompt.markdown must include: Task, Relevant Project Context, Relevant Domains, Architecture Notes, Technologies / Dependencies, Coding Constraints, API / Structural Constraints, Expected Outcome, Missing Context.',
      '- Include Security Constraints only when securityIncluded is true and security evidence exists.',
      '- Respect minChars, maxChars, and softOverage as practical character targets for enrichedPrompt.markdown.',
      '- The Relevant Project Context section must distinguish confirmed facts from inference when both are used.',
      '- The Relevant Domains section must include only selected domains and explain why each matters.',
      '- The Architecture Notes section must prioritize architecture-insights.json over generic engineering advice.',
      '- The Technologies / Dependencies section must mention only technologies and dependencies present in the supplied artifacts.',
      '- The Coding Constraints and API / Structural Constraints sections must be constraints, not generic best practices.',
      '- Do not include unsupported file names, module names, dependencies, commands, or architecture patterns.',
    ].join('\n');
  }

  private buildCompactContext(input: PromptBuildInput): JsonObject {
    const scannerReport = this.asObject(input.knowledgeBase.scannerReport);
    const architectureInsights = this.asObject(input.knowledgeBase.architectureInsights);
    const dependencies = this.asObject(input.knowledgeBase.dependencies);

    return {
      artifactManifest: {
        purpose: 'Use this manifest to select relevant evidence. Do not treat every artifact as relevant.',
        availableArtifacts: [
          'business-context.json',
          'domain-context.json',
          'architecture-insights.json',
          'scanner-report.json',
          'dependencies.json',
          'coding-rules.json',
          'api-conventions.json',
          input.includeSecurity ? 'security-rules.json' : 'security-rules.json omitted',
          'decision-log.json',
        ],
      },
      businessContext: input.knowledgeBase.businessContext,
      domainContext: input.knowledgeBase.domainContext,
      architectureInsights: {
        summary: architectureInsights.summary,
        architectureStyle: architectureInsights.architectureStyle,
        businessDomains: architectureInsights.businessDomains,
        technicalDomains: architectureInsights.technicalDomains,
        businessIntent: architectureInsights.businessIntent,
        relevantTechnologies: this.takeArray(architectureInsights.relevantTechnologies, TECHNOLOGY_LIMIT),
        dependencyIntent: architectureInsights.dependencyIntent,
        codingConventions: architectureInsights.codingConventions,
        riskAreas: architectureInsights.riskAreas,
        securityConcerns: architectureInsights.securityConcerns,
        missingContext: architectureInsights.missingContext,
        recommendedConstraints: architectureInsights.recommendedConstraints,
        importantModules: this.takeArray(architectureInsights.importantModules, 16),
        architecturalRecommendations: this.takeArray(architectureInsights.architecturalRecommendations, 12),
        evidence: architectureInsights.evidence,
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
        devDependencies: this.takeArray(scannerReport.devDependencies ?? dependencies.devDependencies, 16),
        dependencyIntent: dependencies.dependencyIntent,
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
