import type { ProjectScanResult, ResolvedContext } from '../domain/models.js';
import { ProjectScanner } from '../infrastructure/scanners/project-scanner.js';
import { ProjectContextResolver } from './project-context-resolver.js';

export class AskContextUseCase {
  constructor(
    private readonly scanner: ProjectScanner = new ProjectScanner(),
    private readonly resolver: ProjectContextResolver = new ProjectContextResolver(),
  ) {}

  public async execute(projectRoot: string): Promise<string> {
    const scanResult: ProjectScanResult = await this.scanner.scan(projectRoot);
    const context: ResolvedContext = this.resolver.resolve(scanResult);
    return `Architecture context for ${context.projectName}: ${context.architectureSummary}`;
  }
}
