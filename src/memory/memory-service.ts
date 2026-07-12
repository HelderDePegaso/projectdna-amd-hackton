import path from 'node:path';
import { ensureProjectDnaDirectory, writeJsonFile } from '../utils/files.js';
import { Logger } from '../utils/logger.js';
import type { ArchitectureSnapshot, ProjectDnaFiles } from '../domain/models.js';

export class MemoryService {
  constructor(private readonly logger: Logger = new Logger()) {}

  public async initialize(projectRoot: string): Promise<ProjectDnaFiles> {
    const projectDnaDir = await ensureProjectDnaDirectory(projectRoot);

    const snapshot: ArchitectureSnapshot = {
      version: '1.0.0',
      projectName: path.basename(projectRoot),
      projectRoot,
      architecture: {
        summary: '',
        layers: [],
      },
      dependencies: [],
      businessContext: {
        domain: '',
        goals: [],
      },
      generatedAt: new Date().toISOString(),
    };

    const files: ProjectDnaFiles = {
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

    await writeJsonFile(files.architecture, snapshot);
    await writeJsonFile(files.dependencies, { dependencies: snapshot.dependencies });
    await writeJsonFile(files.businessContext, snapshot.businessContext);

    this.logger.success(`Initialized Project DNA at ${projectDnaDir}`);
    return files;
  }
}
