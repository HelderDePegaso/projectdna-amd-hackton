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
      architectureSummary: this.buildArchitectureSummary(scanResult),
      generatedAt: new Date().toISOString(),
    };
  }

  // TODO () : Fazer isso com IA
  private buildArchitectureSummary(scanResult: ProjectScanResult): string {
    const layers = ['cli', 'application', 'domain', 'infrastructure'];
    return `Detected ${scanResult.technologies.length > 0 ? scanResult.technologies.join(', ') : 'general'} stack with ${scanResult.sourceDirectories.length > 0 ? scanResult.sourceDirectories.join(', ') : 'standard'} source structure.`;
  }
}
