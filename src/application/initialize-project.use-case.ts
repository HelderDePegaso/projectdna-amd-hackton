import type { ProjectDnaFiles } from '../domain/models.js';
import { ProjectScanner } from '../infrastructure/scanners/project-scanner.js';
import { ProjectContextResolver } from './project-context-resolver.js';
import { FileMemoryRepository } from '../infrastructure/repositories/file-memory-repository.js';
import { EnvironmentConfigurationService } from '../shared/configuration.service.js';
import { Logger } from '../utils/logger.js';
import path from 'node:path';
import type { MemoryRepository } from '../domain/ports/memory-repository.js';
import type { ConfigurationService } from '../domain/ports/configuration-service.js';
import { ProjectValidationService } from '../shared/project-validation.js';
import { ProjectDnaBuilder } from './dna-builder.js';

export class InitializeProjectUseCase {
  constructor(
    private readonly scanner: ProjectScanner = new ProjectScanner(),
    private readonly resolver: ProjectContextResolver = new ProjectContextResolver(),
    private readonly memoryRepository?: MemoryRepository,
    private readonly configurationService: ConfigurationService = new EnvironmentConfigurationService(),
    private readonly validationService: ProjectValidationService = new ProjectValidationService(),
    private readonly dnaBuilder: ProjectDnaBuilder = new ProjectDnaBuilder(),
    private readonly logger: Logger = new Logger(),
  ) {}

  public async execute(projectRoot: string): Promise<ProjectDnaFiles> {
    const absoluteRoot = path.resolve(projectRoot);
    const memoryDirectory = this.configurationService.get<string>('memoryDirectory', '.pdna');

    await this.validationService.validateProjectDnaCanBeInitialized(absoluteRoot);

    const scanResult = await this.scanner.scan(absoluteRoot);
    const context = this.resolver.resolve(scanResult);
    const files = await this.dnaBuilder.build(absoluteRoot, scanResult, context);

    const snapshot = {
      version: '1.1.0',
      projectName: context.projectName,
      projectRoot: context.projectRoot,
      architecture: {
        summary: context.architectureSummary,
        layers: [],
      },
      dependencies: context.dependencies,
      businessContext: {
        domain: '',
        goals: [],
      },
      generatedAt: context.generatedAt,
      scan: scanResult,
    };

    const snapshotDirectory = path.isAbsolute(memoryDirectory)
      ? memoryDirectory
      : path.join(absoluteRoot, memoryDirectory);
    const memoryRepository = this.memoryRepository ?? new FileMemoryRepository(snapshotDirectory);
    await memoryRepository.saveSnapshot(snapshot);

    this.logger.success(`Initialized Project DNA using ${memoryDirectory}`);
    return files;
  }
}
