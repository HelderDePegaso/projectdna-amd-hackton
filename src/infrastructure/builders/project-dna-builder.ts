import path from 'node:path';
import fs from 'fs-extra';
import { ensureProjectDnaDirectory, writeJsonFile } from '../../utils/files.js';
import type { ProjectDnaFiles, ProjectScanResult, ResolvedContext, ArchitectureInsights } from '../../domain/models.js';

const DEFAULT_PROJECT_OVERVIEW_MARKDOWN = '# Project Overview\n\nThis file stores the human-provided project description.\nUse `pdna project overview` to add a product or technical overview.\n';

export class ProjectDnaBuilder {
  constructor(private readonly projectRoot: string) {}

  public async build(scanResult: ProjectScanResult, context: ResolvedContext): Promise<ProjectDnaFiles> {
    const projectDnaDir = await ensureProjectDnaDirectory(this.projectRoot);

    const architecture = {
      projectName: context.projectName,
      projectRoot: context.projectRoot,
      version: '1.0.0',
      identity: {
        style: 'undetermined',
        layers: ['cli', 'application', 'domain', 'infrastructure'],
      },
      framework: scanResult.frameworkDetection,
      rules: [],
      createdAt: new Date().toISOString(),
    };

    const dependencies = {
      projectName: context.projectName,
      packageName: scanResult.packageName,
      packageVersion: scanResult.packageVersion,
      dependencies: scanResult.dependencies,
      devDependencies: scanResult.devDependencies,
      scripts: scanResult.scripts,
      detectedTechnologies: scanResult.technologyDetection,
      createdAt: new Date().toISOString(),
    };

    const businessContext = {
      domain: 'Unknown',
      goals: [],
      stakeholders: [],
      assumptions: [],
      createdAt: new Date().toISOString(),
    };

    const domainContext = {
      domains: [],
      boundaries: [],
      concepts: [],
      createdAt: new Date().toISOString(),
    };

    const codingRules = {
      conventions: [],
      formatting: [],
      linting: [],
      createdAt: new Date().toISOString(),
    };

    const securityRules = {
      policies: [],
      restrictions: [],
      createdAt: new Date().toISOString(),
    };

    const apiConventions = {
      patterns: [],
      naming: [],
      responseShapes: [],
      createdAt: new Date().toISOString(),
    };

    const decisionLog = {
      decisions: [],
      createdAt: new Date().toISOString(),
    };

    const architectureInsights: ArchitectureInsights = {
      projectName: context.projectName,
      status: 'pending',
      architectureStyle: 'pending',
      businessDomains: [],
      technicalDomains: [],
      relevantFrameworks: [],
      relevantTechnologies: [],
      dependencyIntent: [],
      businessIntent: [],
      codingConventions: [],
      securityConcerns: [],
      riskAreas: [],
      missingContext: [],
      recommendedConstraints: [],
      importantModules: [],
      reasoningSummary: '',
      architecturalRecommendations: [],
      generatedAt: new Date().toISOString(),
    };

    const architectureInsightsFile = {
      projectName: context.projectName,
      status: 'pending',
      architectureStyle: 'pending',
      businessDomains: [],
      technicalDomains: [],
      relevantFrameworks: [],
      relevantTechnologies: [],
      dependencyIntent: [],
      businessIntent: [],
      codingConventions: [],
      securityConcerns: [],
      riskAreas: [],
      missingContext: [],
      recommendedConstraints: [],
      importantModules: [],
      reasoningSummary: '',
      architecturalRecommendations: [],
      inputs: {
        scannerReport: 'scanner-report.json',
        projectOverview: 'project-overview.md',
        architecture: 'architecture.json',
        dependencies: 'dependencies.json',
        businessContext: 'business-context.json',
        domainContext: 'domain-context.json',
        codingRules: 'coding-rules.json',
        securityRules: 'security-rules.json',
        apiConventions: 'api-conventions.json',
        decisionLog: 'decision-log.json',
      },
    };

    await writeJsonFile(path.join(projectDnaDir, 'architecture.json'), architecture);
    await writeJsonFile(path.join(projectDnaDir, 'dependencies.json'), dependencies);
    await writeJsonFile(path.join(projectDnaDir, 'business-context.json'), businessContext);
    await writeJsonFile(path.join(projectDnaDir, 'domain-context.json'), domainContext);
    await writeJsonFile(path.join(projectDnaDir, 'coding-rules.json'), codingRules);
    await writeJsonFile(path.join(projectDnaDir, 'security-rules.json'), securityRules);
    await writeJsonFile(path.join(projectDnaDir, 'api-conventions.json'), apiConventions);
    await writeJsonFile(path.join(projectDnaDir, 'decision-log.json'), decisionLog);
    await writeJsonFile(path.join(projectDnaDir, 'scanner-report.json'), scanResult);
    await writeJsonFile(path.join(projectDnaDir, 'architecture-insights.json'), architectureInsightsFile);
    await fs.writeFile(path.join(projectDnaDir, 'project-overview.md'), DEFAULT_PROJECT_OVERVIEW_MARKDOWN, 'utf8');

    return {
      architecture: path.join(projectDnaDir, 'architecture.json'),
      dependencies: path.join(projectDnaDir, 'dependencies.json'),
      businessContext: path.join(projectDnaDir, 'business-context.json'),
      domainContext: path.join(projectDnaDir, 'domain-context.json'),
      codingRules: path.join(projectDnaDir, 'coding-rules.json'),
      securityRules: path.join(projectDnaDir, 'security-rules.json'),
      apiConventions: path.join(projectDnaDir, 'api-conventions.json'),
      decisionLog: path.join(projectDnaDir, 'decision-log.json'),
      scannerReport: path.join(projectDnaDir, 'scanner-report.json'),
      architectureInsights: path.join(projectDnaDir, 'architecture-insights.json'),
      projectOverview: path.join(projectDnaDir, 'project-overview.md'),
      projectDnaDirectory: projectDnaDir,
    };
  }
}
