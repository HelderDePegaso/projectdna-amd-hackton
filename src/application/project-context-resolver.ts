import type { ProjectScanResult, ResolvedContext } from '../domain/models.js';

export class ProjectContextResolver {
  public resolve(scanResult: ProjectScanResult): ResolvedContext {
    return {
      projectName: scanResult.projectName,
      projectRoot: scanResult.projectRoot,
      technologies: scanResult.technologies,
      frameworks: scanResult.detectedFrameworks,
      dependencies: [...scanResult.dependencies, ...scanResult.devDependencies],
      sourceDirectories: scanResult.sourceDirectories,
      architectureSummary: '',
      generatedAt: new Date().toISOString(),
    };
  }
}