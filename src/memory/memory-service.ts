import path from 'node:path';
import { ensureProjectDnaDirectory, writeJsonFile } from '../utils/files.js';
import { Logger } from '../utils/logger.js';
import type { ArchitectureSnapshot, ProjectDnaFiles } from '../types/index.js';

export class MemoryService {
  constructor(private readonly logger: Logger = new Logger()) {}

  public async initialize(projectRoot: string): Promise<ProjectDnaFiles> {
    const projectDnaDir = await ensureProjectDnaDirectory(projectRoot);

    const snapshot: ArchitectureSnapshot = {
      version: '1.0.0',
      projectName: path.basename(projectRoot),
      architecture: {
        summary: 'Architecture metadata placeholder for future governance workflows.',
        layers: ['cli', 'core', 'memory', 'context', 'providers', 'validators'],
      },
      dependencies: ['commander', 'zod', 'fs-extra'],
      businessContext: {
        domain: 'Architecture governance',
        goals: ['Preserve architectural context', 'Support future AI integrations'],
      },
    };

    const files: ProjectDnaFiles = {
      architecture: path.join(projectDnaDir, 'architecture.json'),
      dependencies: path.join(projectDnaDir, 'dependencies.json'),
      businessContext: path.join(projectDnaDir, 'business-context.json'),
    };

    await writeJsonFile(files.architecture, snapshot);
    await writeJsonFile(files.dependencies, { dependencies: snapshot.dependencies });
    await writeJsonFile(files.businessContext, snapshot.businessContext);

    this.logger.success(`Initialized Project DNA at ${projectDnaDir}`);
    return files;
  }
}
