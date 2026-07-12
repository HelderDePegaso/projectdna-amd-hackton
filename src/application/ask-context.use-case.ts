import path from 'node:path';
import type { ProjectScanResult, ResolvedContext } from '../domain/models.js';
import { ProjectScanner } from '../infrastructure/scanners/project-scanner.js';
import { ProjectValidationService } from '../shared/project-validation.js';
import { ProjectContextResolver } from './project-context-resolver.js';

export class AskContextUseCase {
  constructor(
    private readonly scanner: ProjectScanner = new ProjectScanner(),
    private readonly resolver: ProjectContextResolver = new ProjectContextResolver(),
    private readonly validationService: ProjectValidationService = new ProjectValidationService(),
  ) {}

  public async execute(projectRoot: string): Promise<string> {
    const absoluteRoot = await this.validationService.validateProjectDnaInitialized(path.resolve(projectRoot));
    const scanResult: ProjectScanResult = await this.scanner.scan(absoluteRoot);
    const context: ResolvedContext = this.resolver.resolve(scanResult);
    return `Architecture context for ${context.projectName}: ${context.architectureSummary}`;
  }
}