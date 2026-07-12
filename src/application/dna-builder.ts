import fs from 'fs-extra';
import path from 'node:path';
import type { ProjectScanResult, ResolvedContext, ProjectDnaFiles } from '../domain/models.js';
import { ensureProjectDnaDirectory, writeJsonFile } from '../utils/files.js';

export class ProjectDnaBuilder {
  public async build(projectRoot: string, scanResult: ProjectScanResult, context: ResolvedContext): Promise<ProjectDnaFiles> {
    const absoluteRoot = path.resolve(projectRoot);
    const projectDnaDir = await ensureProjectDnaDirectory(absoluteRoot);

    const architecture = {
      projectName: context.projectName,
      projectRoot: absoluteRoot,
      architectureStyle: '',
      layers: [],
      frameworkDetection: scanResult.frameworkDetection.name ? scanResult.frameworkDetection : {},
      technologyDetection: scanResult.technologyDetection,
      rules: [],
      summary: '',
      generatedAt: context.generatedAt,
    };

    const dependencies = {
      projectName: context.projectName,
      dependencyIntent: [],
      dependencies: scanResult.dependencies,
      devDependencies: scanResult.devDependencies,
      scripts: scanResult.scripts,
      generatedAt: context.generatedAt,
    };

    const businessContext = {
      projectName: context.projectName,
      summary: '',
      goals: [],
      domains: [],
      generatedAt: context.generatedAt,
    };

    const domainContext = {
      projectName: context.projectName,
      domains: [],
      concepts: [],
      modules: [],
      generatedAt: context.generatedAt,
    };

    const codingRules = {
      projectName: context.projectName,
      conventions: [],
      generatedAt: context.generatedAt,
    };

    const securityRules = {
      projectName: context.projectName,
      concerns: [],
      rules: [],
      generatedAt: context.generatedAt,
    };

    const apiConventions = {
      projectName: context.projectName,
      conventions: [],
      generatedAt: context.generatedAt,
    };

    const decisionLog = {
      projectName: context.projectName,
      decisions: [],
      generatedAt: context.generatedAt,
    };

    const architectureInsights = {
      projectName: context.projectName,
      status: 'pending',
      architectureStyle: '',
      businessDomains: [],
      technicalDomains: [],
      relevantFrameworks: context.frameworks,
      relevantTechnologies: context.technologies,
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
      generatedAt: context.generatedAt,
    };

    const overviewPath = path.join(projectDnaDir, 'project-overview.md');
    await fs.writeFile(overviewPath, '# Project Overview\n\n');

    await writeJsonFile(path.join(projectDnaDir, 'architecture.json'), architecture);
    await writeJsonFile(path.join(projectDnaDir, 'dependencies.json'), dependencies);
    await writeJsonFile(path.join(projectDnaDir, 'business-context.json'), businessContext);
    await writeJsonFile(path.join(projectDnaDir, 'domain-context.json'), domainContext);
    await writeJsonFile(path.join(projectDnaDir, 'coding-rules.json'), codingRules);
    await writeJsonFile(path.join(projectDnaDir, 'security-rules.json'), securityRules);
    await writeJsonFile(path.join(projectDnaDir, 'api-conventions.json'), apiConventions);
    await writeJsonFile(path.join(projectDnaDir, 'decision-log.json'), decisionLog);
    await writeJsonFile(path.join(projectDnaDir, 'scanner-report.json'), scanResult);
    await writeJsonFile(path.join(projectDnaDir, 'architecture-insights.json'), architectureInsights);

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
      projectOverview: overviewPath,
      projectDnaDirectory: projectDnaDir,
    };
  }
}