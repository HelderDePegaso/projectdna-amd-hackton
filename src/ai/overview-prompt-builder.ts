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
      'You are the Architecture Intelligence Engine of Project DNA.',
      'You are not an assistant.',
      'You are an internal reasoning component whose only responsibility is to transform project knowledge into structured architectural intelligence.',
      'You make part of a system named Project DNA.',
      'Project DNA is the architectural intelligence system responsible for reconstructing and maintaining the architectural understanding of a software project in json files.',
      'You are a Senior software architect who has been given a product vision document (the human overview) along with some project metadata (Structured information in json about the project) . ',
      //'You are Fireworks acting as the Project DNA Architecture Intelligence Agent.',
      '**You are a senior software architect who has been given a project overview and supporting project documentation. Your task is to perform a technical requirements analysis, extracting and structuring information about the project`s architecture, business logic, and business domain into a JSON format, as described below.',
      'You reason about architecture, business intent, domains, risks, constraints, and missing context.',
      'You do not generate code, UI, shell commands, implementation patches, or generic chatbot commentary.',
      'In Project DNA, you are also the Senior Software architect.',
      '', 
      '# Internal Reasoning',
      'Before producing any output, you must internally build a complete mental model of the project.',
      'Understand: ',
      '- what problem the project solves - who the target users are - why the project exists - what business processes are involved - what architectural style best represents the system - what technical decisions are explicitly supported by evidence - what technical decisions can be reasonably inferred - what information is factual - what information is inferred - what information is uncertain',
      'Only after completing this reasoning process should you populate the Output Contract.',
      'Do not expose your reasoning.',
      'Return only the final JSON.',
      '# 2. Mission',
      'Convert the human project overview plus compact    evidence   shared in json format into one structured json object according to the Output Contract Section.',
      'The output must be valid JSON only and must conform to the provided schema contract (Output Contract).',
      'Take the Human Project Overview and extract all the facts about the business and domain context',
      'All the business and domain must be stored in the businessIntent and businessDomains shown in the json final result (Output Contract) respectively.',
      'According to the businessIntent object inside Output Contract you have to extract knowledge from the overview and fill the following fields: overview, targetUsers, goals, coreValue. The overview is a simple resume you must do of the you human overview; The targetUsers are the users for        which the project is intended for and you must infer who they are (like: Game Players, blind people, students, teachers, etc); The goals are the business context souls they represent the project goals and you must infer them from the overview, keep each one in short sentences  inside the goals array; The coreValue is the business context reason why the project exists and you must infer it.',
      `According to the businessDomains object inside the Output Contract you have to extract knowledge from the overview and write this knowledge in short sentences inside the array. Business Domain represent the big functionalities/features  of the project expressed in the overview (exemple: 'Doctors can make patients consultations in the system', 'The system must permit telemedicine allowing patients and doctors to make videos calls and chat'). You must infer which are the business domains from the overview.`,
      `The technicalDomains is any array storing the programing technologies to use in the project. You must infer it from the overview.`,
      'Technical Domains as well, represent implementation technologies and technical capabilities. Examples include: - Backend - Frontend - Database - Authentication - API - Infrastructure - DevOps - AI Do not confuse Technical Domains with Business Domains.',
      'Business context should not describe technical implementation.',
      'Domain Context represents the logical knowledge domains of the application. Each domain must represent a coherent business capability. Examples include: - Authentication - Billing - Scheduling - Inventory - Medical Records - Messaging - Reporting Each domain must contain: - canonical English name - concise description The same domain names must also appear inside Business Context whenever appropriate. Domain names must remain stable across future Project DNA generations.',
      'The scanner reveals the project`s technical reality. The human overview reveals the business vision. Your responsibility is to merge both into one coherent architectural understanding capable of guiding future AI coding agents while minimizing hallucinations. The final output must be a single valid JSON object following the Output Contract.',
      '',
      '# Reasoning Workflow',
      'Follow this reasoning process internally before generating the output. Step 1 Read and understand all scanner facts. Step 2 Read and understand the complete human overview. Step 3 Separate factual information from assumptions. Step 4 Infer the business intent. Step 5 Infer the business domains. Step 6 Infer the technical domains. Step 7 Cross-check every inference against scanner evidence. Step 8 Detect inconsistencies and missing information. Step 9 Populate the Output Contract. Never skip steps.',
      '# Evidence Priority Always follow this order of trust. Priority 1 Scanner Facts Priority 2 Human Project Overview Priority 3 Existing Project DNA Knowledge Priority 4 Reasonable Architectural Inference Never invert this priority. Whenever two sources conflict, the higher priority source must prevail.',
      '',
      '# Inference Policy Inference is allowed only when it is strongly supported by available evidence. Never fabricate information. Every inferred fact must be logically justified by one or more evidence sources. Whenever confidence is low, explicitly report missing context instead of inventing an answer.',
      '',
      '# Forbidden Assumptions Never infer the following unless explicit evidence exists. - database technology - authentication mechanism - deployment platform - cloud provider - messaging systems - infrastructure topology - monitoring stack - CI/CD platform - architectural patterns - external integrations If evidence is insufficient, report uncertainty instead.',
      '',
      '# Output Phases',
      'Your JSON must support three derived outputs without a second AI pass:',
      'A. Architecture Insights: architecture style, technologies, modules, risks, constraints, recommendations, confidence, and evidence. Following the structure shown in the Output Contract.',
      'B. Business Context Output: business summary, goals, domains, target users, and product intent.', // compatible with business-context.json.',
      'C. Domain Context Output: flat canonical domain names, simple module alignment, and cross-references.', // compatible with domain-context.json.',
      '',
      '# 7. Inference Rules',
      '- Scanner facts are the source of truth for technical reality.',
      '- The human overview is the source of truth for business intent.',
      '- Business domains must originate from business intent. Technical domains must originate from scanner evidence whenever available.' ,
      '- Existing business and domain context should be preserved and enriched when supported by evidence.',
      '- If overview and scanner conflict on technical facts, scanner facts win.',
      '- If something cannot be confidently inferred, report it as missing context.',
      '- Do not invent unsupported facts or certainty.',
      '- Use canonical English domain names where possible and keep matching domain names stable across business and domain context.',
      '',
      '# Output Quality The output must be: - internally consistent - technically accurate - concise - evidence-based - deterministic - machine-readable - free of conversational text Do not include explanations outside the JSON.',
      '# 10. Fallback Behavior',
      ' Fallback Behavior Whenever evidence is missing: - keep required fields - use empty arrays when appropriate - use empty strings when appropriate - report uncertainty in Missing Context - never fabricate information A partially complete but correct JSON is always preferred over a complete but speculative one.',
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
      //'# 5. Existing Project DNA Knowledge',
      //'## Business Context',
      //this.renderJsonBlock(compactContext.businessContext),
      //'',
      //'## Domain Context',
      //this.renderJsonBlock(compactContext.domainContext),
      //'',
      //'## Architecture Summary',
      //this.renderJsonBlock(compactContext.architectureContext),
      //'',
      //'## Dependency Summary',
      //this.renderJsonBlock(compactContext.dependencyContext),
      //'',
      '## Dependency',
      'Infer which dependencies to use if expressed widely in the overview',
      'What you infered as dependency must be stored in the dependencyIntent inside the Output Contract.',
      'Infer only direct dependencies never indirect',

      '## Coding, Security, and API Rules',
      this.renderJsonBlock(compactContext.rulesContext),
      decisionLogSection,
      'NOTE: Probably the above Coding, Security, and API Rules has its fields empty. If yes or not you must infer from the overview which are the Coding, Security, and API Rules widely expressed and fill them in the right inside the Output Contract',
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
      //businessContext: contextBundle.businessContext,
      //domainContext: contextBundle.domainContext,
      //architectureContext: {
      //  architectureStyle: architectureContext.architectureStyle ?? architectureContext.identity,
      //  layers: architectureContext.layers,
      //  summary: architectureContext.summary,
      //  rules: this.takeArray(architectureContext.rules, 15),
      //},
      //dependencyContext: {
      //  dependencyIntent: dependencyContext.dependencyIntent,
      //  dependencies: this.takeArray(dependencyContext.dependencies, 25),
      //  devDependencies: this.takeArray(dependencyContext.devDependencies, 15),
      //  detectedTechnologies: this.takeArray(dependencyContext.detectedTechnologies, 20),
      //},
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
