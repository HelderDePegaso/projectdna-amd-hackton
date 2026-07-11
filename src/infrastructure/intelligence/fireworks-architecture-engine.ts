import fs from 'fs-extra';
import path from 'node:path';
import type { ArchitectureInsightsDocument } from './architecture-insights.schema.js';
import { writeJsonFile } from '../../utils/files.js';

export interface FireworksInsightRequest {
  projectRoot: string;
  projectDnaDir: string;
  projectOverview: string;
}

export class FireworksArchitectureIntelligenceService {
  public async generateInsights(request: FireworksInsightRequest): Promise<ArchitectureInsightsDocument> {
    const scannerReportPath = path.join(request.projectDnaDir, 'scanner-report.json');
    const architecturePath = path.join(request.projectDnaDir, 'architecture.json');
    const dependenciesPath = path.join(request.projectDnaDir, 'dependencies.json');
    const businessContextPath = path.join(request.projectDnaDir, 'business-context.json');
    const domainContextPath = path.join(request.projectDnaDir, 'domain-context.json');
    const codingRulesPath = path.join(request.projectDnaDir, 'coding-rules.json');
    const securityRulesPath = path.join(request.projectDnaDir, 'security-rules.json');
    const apiConventionsPath = path.join(request.projectDnaDir, 'api-conventions.json');
    const decisionLogPath = path.join(request.projectDnaDir, 'decision-log.json');
    const insightsPath = path.join(request.projectDnaDir, 'architecture-insights.json');

    const scannerReport = await fs.readJson(scannerReportPath);
    const architecture = await fs.readJson(architecturePath).catch(() => null);
    const dependencies = await fs.readJson(dependenciesPath).catch(() => null);
    const businessContext = await fs.readJson(businessContextPath).catch(() => null);
    const domainContext = await fs.readJson(domainContextPath).catch(() => null);
    const codingRules = await fs.readJson(codingRulesPath).catch(() => null);
    const securityRules = await fs.readJson(securityRulesPath).catch(() => null);
    const apiConventions = await fs.readJson(apiConventionsPath).catch(() => null);
    const decisionLog = await fs.readJson(decisionLogPath).catch(() => null);

    const insights: ArchitectureInsightsDocument = {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      generator: {
        provider: 'fireworks',
        model: 'fireworks-architecture-intelligence',
        projectDnaVersion: '0.1.0',
      },
      source: {
        overviewProvided: Boolean(request.projectOverview.trim()),
        scannerReportVersion: scannerReport.generatedAt ?? new Date().toISOString(),
        architectureVersion: architecture?.generatedAt ?? undefined,
      },
      summary: `Project DNA captured ${request.projectOverview.trim() ? 'an overview' : 'a scan'} and derived a structured architecture summary.`,
      project: {
        name: scannerReport.projectName ?? path.basename(request.projectRoot),
        language: scannerReport.technologies.includes('typescript') ? 'TypeScript' : 'JavaScript',
        packageManager: 'npm',
        framework: {
          name: scannerReport.detectedFrameworks[0] ?? 'unknown',
          confidence: scannerReport.detectedFrameworks.length > 0 ? 0.8 : 0.2,
          evidence: scannerReport.configFiles ?? [],
        },
      },
      architectureStyle: {
        primary: architecture?.architectureStyle ?? 'layered',
        secondary: [],
        reasoning: 'Derived from scanner signals and project overview context.',
      },
      projectStructure: {
        layers: [],
        modules: [],
        boundaries: [],
        importantFolders: scannerReport.sourceDirectories ?? [],
        importantFiles: scannerReport.configFiles ?? [],
      },
      businessDomains: (businessContext?.domains ?? []).map((domain: string) => ({ name: domain, description: 'Captured from Project DNA business context.' })),
      technicalDomains: (domainContext?.domains ?? []).map((domain: string) => ({ name: domain, description: 'Captured from Project DNA domain context.' })),
      relevantTechnologies: (scannerReport.technologies ?? []).map((technology: string) => ({ name: technology, category: 'tooling', version: undefined })),
      dependencyIntent: {
        approved: dependencies?.dependencies ?? [],
        discouraged: [],
        forbidden: [],
        reasoning: 'Dependency intent is inferred from the existing dependency list and the project overview.',
      },
      businessIntent: {
        overview: request.projectOverview,
        targetUsers: [],
        goals: [],
        coreValue: 'Preserve architecture context and support future AI guidance.',
      },
      codingConventions: {
        patterns: codingRules?.conventions ?? [],
        naming: [],
        style: [],
        architectureRules: [],
      },
      securityConcerns: (securityRules?.concerns ?? []).map((concern: string) => ({ title: concern, description: concern, severity: 'medium' })),
      riskAreas: [],
      missingContext: [],
      recommendedConstraints: [],
      importantModules: (scannerReport.sourceDirectories ?? []).map((module: string) => ({ name: module, reason: 'Discovered as a source directory.' })),
      reasoningSummary: 'Fireworks architecture intelligence is operating in a structured analysis mode for Project DNA.',
      architecturalRecommendations: [],
      confidence: {
        score: 0.7,
        notes: ['Generated from scanner facts and the captured overview.'],
      },
      evidence: {
        scannerSignals: scannerReport.configFiles ?? [],
        overviewSignals: request.projectOverview ? [request.projectOverview.split(/\n+/)[0]] : [],
        derivedSignals: [],
      },
    };

    await writeJsonFile(insightsPath, insights);
    return insights;
  }
}
