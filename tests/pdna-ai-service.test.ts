import test from 'node:test';
import assert from 'node:assert/strict';
import { AIProviderValidationError, PDNAAIService } from '../src/ai/pdna-ai.service.js';
import type { AIProviderPDNA, StructuredAnalysisRequest } from '../src/ai/ai-provider-pdna.js';
import { ArchitectureInsightsSchema } from '../src/infrastructure/intelligence/architecture-insights.schema.js';

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
  assert.match(provider.lastRequest?.promptPackage?.markdown ?? '', /architecture-insights\.json/);
});
