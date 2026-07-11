import fs from 'fs-extra';
import path from 'node:path';
import type { ArchitectureInsights, ProjectScanResult } from '../../domain/models.js';

export class FireworksArchitectureIntelligence {
  public async generateInsights(projectRoot: string): Promise<ArchitectureInsights> {
    const pdnaDir = path.join(projectRoot, '.pdna');
    const scannerReportPath = path.join(pdnaDir, 'scanner-report.json');
    const overviewPath = path.join(pdnaDir, 'project-overview.md');
    const architecturePath = path.join(pdnaDir, 'architecture.json');
    const dependenciesPath = path.join(pdnaDir, 'dependencies.json');
    const businessContextPath = path.join(pdnaDir, 'business-context.json');
    const domainContextPath = path.join(pdnaDir, 'domain-context.json');
    const codingRulesPath = path.join(pdnaDir, 'coding-rules.json');
    const securityRulesPath = path.join(pdnaDir, 'security-rules.json');
    const apiConventionsPath = path.join(pdnaDir, 'api-conventions.json');
    const decisionLogPath = path.join(pdnaDir, 'decision-log.json');
    const insightsPath = path.join(pdnaDir, 'architecture-insights.json');

    const scannerReport = await fs.readJson(scannerReportPath) as ProjectScanResult;
    const overview = await fs.readFile(overviewPath, 'utf8');
    const architecture = await fs.readJson(architecturePath).catch(() => null);
    const dependencies = await fs.readJson(dependenciesPath).catch(() => null);
    const businessContext = await fs.readJson(businessContextPath).catch(() => null);
    const domainContext = await fs.readJson(domainContextPath).catch(() => null);
    const codingRules = await fs.readJson(codingRulesPath).catch(() => null);
    const securityRules = await fs.readJson(securityRulesPath).catch(() => null);
    const apiConventions = await fs.readJson(apiConventionsPath).catch(() => null);
    const decisionLog = await fs.readJson(decisionLogPath).catch(() => null);

    const insights: ArchitectureInsights = {
      projectName: path.basename(projectRoot),
      status: 'ready',
      architectureStyle: this.inferArchitectureStyle(scannerReport),
      businessDomains: this.inferBusinessDomains(overview),
      technicalDomains: this.inferTechnicalDomains(scannerReport),
      relevantFrameworks: scannerReport.detectedFrameworks,
      relevantTechnologies: scannerReport.technologies,
      dependencyIntent: this.inferDependencyIntent(scannerReport),
      businessIntent: this.inferBusinessIntent(overview),
      codingConventions: this.inferCodingConventions(codingRules),
      securityConcerns: this.inferSecurityConcerns(securityRules),
      riskAreas: this.inferRiskAreas(scannerReport, businessContext, securityRules),
      missingContext: this.inferMissingContext(businessContext, domainContext, overview),
      recommendedConstraints: this.inferRecommendedConstraints(apiConventions, codingRules, securityRules),
      importantModules: scannerReport.sourceDirectories,
      reasoningSummary: this.buildReasoningSummary(scannerReport, overview),
      architecturalRecommendations: this.buildArchitecturalRecommendations(scannerReport),
      generatedAt: new Date().toISOString(),
    };

    await writeJsonFile(insightsPath, insights);
    return insights;
  }

  private inferArchitectureStyle(scannerReport: ProjectScanResult): string {
    const styles: string[] = [];
    const frameworkNames = scannerReport.detectedFrameworks.map((framework: string) => framework.toLowerCase());
    if (frameworkNames.includes('next.js') || frameworkNames.includes('nextjs')) {
      styles.push('next.js');
    }
    if (frameworkNames.includes('angular')) {
      styles.push('angular');
    }
    if (frameworkNames.includes('react')) {
      styles.push('react');
    }
    if (frameworkNames.includes('vite')) {
      styles.push('vite');
    }
    if (styles.length === 0) {
      styles.push('framework-agnostic');
    }
    return styles.join(', ');
  }

  private inferBusinessDomains(overview: string): string[] {
    const domains: string[] = [];
    const normalized = overview.toLowerCase();
    if (normalized.includes('finance') || normalized.includes('payment')) domains.push('finance');
    if (normalized.includes('commerce') || normalized.includes('e-commerce')) domains.push('commerce');
    if (normalized.includes('health') || normalized.includes('medical')) domains.push('health');
    if (normalized.includes('education')) domains.push('education');
    if (normalized.includes('analytics')) domains.push('analytics');
    if (domains.length === 0) domains.push('general business domain');
    return domains;
  }

  private inferTechnicalDomains(scannerReport: ProjectScanResult): string[] {
    const domains: string[] = [];
    if (scannerReport.technologies.includes('typescript')) domains.push('type-safe application logic');
    if (scannerReport.technologies.includes('prisma')) domains.push('database modeling and migrations');
    if (scannerReport.technologies.includes('tailwind')) domains.push('ui styling and design system');
    if (scannerReport.technologies.includes('docker')) domains.push('containerization');
    if (domains.length === 0) domains.push('application infrastructure');
    return domains;
  }

  private inferDependencyIntent(scannerReport: ProjectScanResult): string[] {
    return scannerReport.dependencies.slice(0, 5).map((dependency: string) => `uses ${dependency}`);
  }

  private inferBusinessIntent(overview: string): string[] {
    if (!overview.trim()) return ['No overview provided'];
    return [overview.trim().split(/\.|\n/).filter(Boolean).slice(0, 2).join('. ')];
  }

  private inferCodingConventions(codingRules: any): string[] {
    if (codingRules?.conventions?.length > 0) return codingRules.conventions;
    return ['No explicit coding conventions defined yet'];
  }

  private inferSecurityConcerns(securityRules: any): string[] {
    if (securityRules?.policies?.length > 0) return securityRules.policies;
    return ['No explicit security rules defined yet'];
  }

  private inferRiskAreas(scannerReport: ProjectScanResult, businessContext: any, securityRules: any): string[] {
    const risks: string[] = [];
    if (!businessContext?.domain || businessContext.domain === 'Unknown') {
      risks.push('Business domain is not defined');
    }
    if (!scannerReport.technologies.includes('typescript') && scannerReport.detectedFrameworks.length === 0) {
      risks.push('Project framework and technology stack are not strongly identified');
    }
    if (!securityRules?.policies?.length) {
      risks.push('Security rules are not documented');
    }
    if (risks.length === 0) risks.push('No immediate risk areas detected from the current scan');
    return risks;
  }

  private inferMissingContext(businessContext: any, domainContext: any, overview: string): string[] {
    const missing: string[] = [];
    if (!businessContext?.domain || businessContext.domain === 'Unknown') missing.push('business-context.json is incomplete');
    if (!domainContext?.domains?.length) missing.push('domain-context.json has no domains defined');
    if (!overview.trim()) missing.push('project-overview.md is empty');
    return missing;
  }

  private inferRecommendedConstraints(apiConventions: any, codingRules: any, securityRules: any): string[] {
    const recommendations: string[] = [];
    if (!apiConventions?.patterns?.length) recommendations.push('Define API conventions in api-conventions.json');
    if (!codingRules?.conventions?.length) recommendations.push('Document coding conventions in coding-rules.json');
    if (!securityRules?.policies?.length) recommendations.push('Document security constraints in security-rules.json');
    return recommendations;
  }

  private buildReasoningSummary(scannerReport: ProjectScanResult, overview: string): string {
    return `Fireworks analyzed the scanner report and the project overview. Detected ${scannerReport.detectedFrameworks.length} framework signal(s) and ${scannerReport.technologies.length} technology signal(s). ${overview.trim() ? 'The product overview is available for business context.' : 'No project overview was provided.'}`;
  }

  private buildArchitecturalRecommendations(scannerReport: ProjectScanResult): string[] {
    const recommendations: string[] = [];
    if (!scannerReport.detectedFrameworks.length) {
      recommendations.push('Capture the primary framework explicitly in architecture.json.');
    }
    if (!scannerReport.technologies.includes('typescript')) {
      recommendations.push('Confirm whether the project is TypeScript or JavaScript to avoid ambiguity.');
    }
    if (scannerReport.dependencies.includes('eslint')) {
      recommendations.push('Synchronize ESLint rules with coding-rules.json.');
    }
    return recommendations.length ? recommendations : ['No architecture-specific recommendations generated.'];
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeJson(filePath, data, { spaces: 2 });
}
