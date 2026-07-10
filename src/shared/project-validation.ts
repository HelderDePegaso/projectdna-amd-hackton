import fs from 'fs-extra';
import path from 'node:path';
import { ProjectDnaError, ScanError } from './errors.js';

export class ProjectValidationService {
  public async validateWorkspace(projectRoot: string, targetDirectoryName = '.pdna'): Promise<string> {
    const absoluteRoot = path.resolve(projectRoot);
    const stats = await fs.stat(absoluteRoot).catch(() => {
      throw new ScanError(`Project root does not exist: ${absoluteRoot}`);
    });

    if (!stats.isDirectory()) {
      throw new ScanError(`Project root is not a directory: ${absoluteRoot}`);
    }

    const packageJsonPath = path.join(absoluteRoot, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      throw new ScanError(`Missing package.json in project root: ${absoluteRoot}`);
    }

    const targetDir = path.join(absoluteRoot, targetDirectoryName);
    if (await fs.pathExists(targetDir)) {
      const targetStats = await fs.stat(targetDir);
      if (targetStats.isDirectory()) {
        return absoluteRoot;
      }
      throw new ProjectDnaError(`A file exists at ${targetDir} and blocks Project DNA initialization.`);
    }

    await fs.access(absoluteRoot, fs.constants.R_OK | fs.constants.W_OK).catch(() => {
      throw new ProjectDnaError(`Insufficient permissions to read/write the project root: ${absoluteRoot}`);
    });

    return absoluteRoot;
  }
}
