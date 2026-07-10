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
      architectureStyle: this.inferArchitectureStyle(scanResult),
      layers: ['presentation', 'application', 'domain', 'infrastructure'],
      frameworkDetection: scanResult.frameworkDetection,
      technologyDetection: scanResult.technologyDetection,
      rules: [
        'Preserve architectural intent over implementation convenience.',
        'Keep architectural knowledge in .pdna files.',
        'Avoid code generation during architecture governance.',
      ],
      summary: context.architectureSummary,
      generatedAt: context.generatedAt,
    };

    const dependencies = {
      projectName: context.projectName,
      dependencyIntent: this.inferDependencyIntent(scanResult),
      dependencies: scanResult.dependencies,
      devDependencies: scanResult.devDependencies,
      scripts: scanResult.scripts,
      generatedAt: context.generatedAt,
    };

    const businessContext = {
      projectName: context.projectName,
      summary: 'Project DNA captures architectural intent and product context for future AI assistance.',
      goals: ['Preserve architectural DNA', 'Prevent architectural hallucinations', 'Support future AI coding assistants'],
      domains: [],
      generatedAt: context.generatedAt,
    };

    const domainContext = {
      projectName: context.projectName,
      domains: [],
      concepts: [],
      modules: scanResult.sourceDirectories.map((directory) => ({ name: directory, path: directory })),
      generatedAt: context.generatedAt,
    };

    const codingRules = {
      projectName: context.projectName,
      conventions: ['Prefer TypeScript for new implementation work.', 'Keep architecture knowledge centralized in .pdna files.'],
      generatedAt: context.generatedAt,
    };

    const securityRules = {
      projectName: context.projectName,
      concerns: ['Avoid storing secrets in source files.', 'Treat architecture knowledge as sensitive project context.'],
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
      decisions: [
        {
          id: 'initial-architecture-governance',
          title: 'Project DNA stores architecture context rather than generating code.',
          rationale: 'The MVP must preserve architectural DNA and prepare future AI assistance.',
          createdAt: context.generatedAt,
        },
      ],
      generatedAt: context.generatedAt,
    };

    const architectureInsights = {
      projectName: context.projectName,
      status: 'pending',
      architectureStyle: this.inferArchitectureStyle(scanResult),
      businessDomains: [],
      technicalDomains: [],
      relevantFrameworks: context.frameworks,
      relevantTechnologies: context.technologies,
      dependencyIntent: this.inferDependencyIntent(scanResult),
      businessIntent: ['Preserve architecture context', 'Support future AI guidance'],
      codingConventions: codingRules.conventions,
      securityConcerns: securityRules.concerns,
      riskAreas: [],
      missingContext: [],
      recommendedConstraints: ['Keep architecture knowledge in .pdna files.', 'Do not merge scanner facts with AI insights.'],
      importantModules: scanResult.sourceDirectories,
      reasoningSummary: 'Architecture insights will be generated after project overview is captured.',
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

  private inferArchitectureStyle(scanResult: ProjectScanResult): string {
    if (scanResult.detectedFrameworks.some((framework) => framework === 'nextjs' || framework === 'react' || framework === 'vue')) {
      return 'component-based';
    }

    if (scanResult.sourceDirectories.length > 0) {
      return 'layered';
    }

    return 'unknown';
  }

  private inferDependencyIntent(scanResult: ProjectScanResult): string[] {
    const intents: string[] = [];
    if (scanResult.dependencies.some((dependency) => ['react', 'next', 'vue', 'svelte'].includes(dependency))) {
      intents.push('UI delivery');
    }
    if (scanResult.dependencies.some((dependency) => ['express', 'koa', 'fastify', 'hono'].includes(dependency))) {
      intents.push('HTTP services');
    }
    if (scanResult.dependencies.some((dependency) => ['prisma', 'typeorm', 'mongoose', 'sequelize'].includes(dependency))) {
      intents.push('Data persistence');
    }
    if (intents.length === 0) {
      intents.push('Project-specific implementation');
    }
    return intents;
  }
}
