import test from 'node:test';
import assert from 'node:assert/strict';
import { AIProviderValidationError, PDNAAIService } from '../src/ai/pdna-ai.service.js';
import type { AIProviderPDNA, StructuredAnalysisRequest } from '../src/ai/ai-provider-pdna.js';
import { ArchitectureInsightsSchema } from '../src/infrastructure/intelligence/architecture-insights.schema.js';
import { PromptEnrichmentSchema } from '../src/prompt/prompt-enrichment.schema.js';
import { promptKnowledgeBase } from './prompt-fixtures.js';

class StubProvider implements AIProviderPDNA {
  public readonly providerId = 'stub';
  public readonly displayName = 'Stub Provider';
  public lastRequest: StructuredAnalysisRequest | undefined;

  public async getStatus() {
    return { available: true, message: 'ok', metadata: { model: 'stub-model' } };
  }

  public getCapabilities() {
    return { supportsStructuredOutput: true, supportsStatusCheck: true, supportedModes: ['overview-analysis'] };
  }

  public async executeStructuredAnalysis(request: StructuredAnalysisRequest) {
    this.lastRequest = request;
    return {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      generator: {
        provider: 'fireworks',
        model: 'stub-model',
        projectDnaVersion: '0.1.0',
      },
      source: {
        overviewProvided: Boolean(request.overview),
        scannerReportVersion: '1.0',
      },
      summary: 'stub summary',
      project: {
        name: 'stub-project',
        language: 'TypeScript',
        packageManager: 'npm',
        framework: {
          name: 'unknown',
          confidence: 0.5,
          evidence: [],
        },
      },
      architectureStyle: {
        primary: 'layered',
        secondary: [],
        reasoning: 'stub',
      },
      projectStructure: {
        layers: [],
        modules: [],
        boundaries: [],
        importantFolders: [],
        importantFiles: [],
      },
      businessDomains: [],
      technicalDomains: [],
      relevantTechnologies: [],
      dependencyIntent: {
        approved: [],
        discouraged: [],
        forbidden: [],
        reasoning: 'stub',
      },
      businessIntent: {
        overview: request.overview,
        targetUsers: [],
        goals: [],
        coreValue: 'stub',
      },
      codingConventions: {
        patterns: [],
        naming: [],
        style: [],
        architectureRules: [],
      },
      securityConcerns: [],
      riskAreas: [],
      missingContext: [],
      recommendedConstraints: [],
      importantModules: [],
      reasoningSummary: 'stub',
      architecturalRecommendations: [],
      confidence: {
        score: 0.5,
        notes: [],
      },
      evidence: {
        scannerSignals: [],
        overviewSignals: [],
        derivedSignals: [],
      },
    };
  }
}

class InvalidStubProvider extends StubProvider {
  public override async executeStructuredAnalysis(request: StructuredAnalysisRequest) {
    this.lastRequest = request;
    return { schemaVersion: 'invalid' };
  }
}

test('PDNAAIService delegates to the active provider and validates the structured response', async () => {
  const provider = new StubProvider();
  const service = new PDNAAIService(provider);
  const result = await service.analyzeProjectOverview({
    overview: 'A TypeScript CLI for architecture governance.',
    contextBundle: {
      scannerFacts: { technologies: ['typescript'] },
      architectureContext: {},
      dependencyContext: {},
      businessContext: {},
      domainContext: {},
      codingRules: {},
      securityRules: {},
      apiConventions: {},
      decisionLog: {},
    },
  });

  const parsed = ArchitectureInsightsSchema.safeParse(result);
  assert.equal(parsed.success, true);
  assert.equal(provider.lastRequest?.mode, 'overview-analysis');
  assert.match(provider.lastRequest?.promptPackage?.markdown ?? '', /# 4\. Scanner Facts/);
  assert.match(provider.lastRequest?.promptPackage?.markdown ?? '', /# Output Phases/);
});

test('PDNAAIService rejects provider payloads that fail the architecture insights schema', async () => {
  const provider = new InvalidStubProvider();
  const service = new PDNAAIService(provider);

  await assert.rejects(
    () => service.analyzeProjectOverview({
      overview: 'A TypeScript CLI for architecture governance.',
      contextBundle: {
        scannerFacts: { technologies: ['typescript'] },
        architectureContext: {},
        dependencyContext: {},
        businessContext: {},
        domainContext: {},
        codingRules: {},
        securityRules: {},
        apiConventions: {},
        decisionLog: {},
      },
    }),
    AIProviderValidationError,
  );
  assert.match(provider.lastRequest?.promptPackage?.markdown ?? '', /# 8\. Output Contract/);
});

class PromptEnrichmentStubProvider implements AIProviderPDNA {
  public readonly providerId = 'prompt-stub';
  public readonly displayName = 'Prompt Stub Provider';
  public lastRequest: StructuredAnalysisRequest | undefined;

  public async getStatus() {
    return { available: true, message: 'ok', metadata: { model: 'prompt-stub-model' } };
  }

  public getCapabilities() {
    return { supportsStructuredOutput: true, supportsStatusCheck: true, supportedModes: ['prompt-enrichment'] };
  }

  public async executeStructuredAnalysis(request: StructuredAnalysisRequest) {
    this.lastRequest = request;
    return {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      generator: {
        provider: 'fireworks',
        model: 'prompt-stub-model',
        projectDnaVersion: '0.1.0',
      },
      source: {
        userRequest: request.overview,
        mode: 'feature',
        includedArtifacts: ['business-context.json', 'domain-context.json'],
        securityIncluded: true,
      },
      selectedDomains: [
        { name: 'AI Context Provisioning', reason: 'The request is about prompt generation.', evidence: ['domain-context.json'] },
      ],
      relevantContext: {
        business: ['Project DNA supports AI coding assistants.'],
        domain: ['AI Context Provisioning'],
        architecture: ['CLI delegates work to application services.'],
        codingRules: ['Prefer TypeScript.'],
        apiConventions: ['Keep command output concise.'],
        securityRules: ['Avoid storing secrets.'],
        dependencies: ['commander'],
      },
      enrichedPrompt: {
        title: 'Add prompt command support',
        markdown: '# Task\n\nAdd prompt command support using Project DNA context.\n\n## Relevant Domains\n- AI Context Provisioning\n\n## Expected Outcome\n- Produce a project-aware implementation plan.\n\n## Missing Context\n- None.',
        expectedOutcome: ['Produce a project-aware implementation plan.'],
        warnings: [],
        missingContext: [],
      },
      confidence: {
        score: 0.8,
        notes: ['Stubbed provider response.'],
      },
    };
  }
}

test('PDNAAIService delegates prompt enrichment to the provider and validates Fireworks output', async () => {
  const provider = new PromptEnrichmentStubProvider();
  const service = new PDNAAIService(provider);
  const result = await service.enrichPrompt({
    knowledgeBase: promptKnowledgeBase,
    request: 'Add prompt command support',
    mode: 'feature',
    includeSecurity: true,
    size: {
      minChars: 800,
      maxChars: 3000,
      softOverage: 300,
    },
  });

  const parsed = PromptEnrichmentSchema.safeParse(result);
  assert.equal(parsed.success, true);
  assert.equal(provider.lastRequest?.mode, 'prompt-enrichment');
  assert.match(provider.lastRequest?.promptPackage?.markdown ?? '', /Project DNA Prompt Enrichment Agent/);
  assert.match(result.enrichedPrompt.markdown, /AI Context Provisioning/);
});