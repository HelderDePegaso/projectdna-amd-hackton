import fs from 'fs-extra';
import path from 'node:path';

export async function ensureProjectDnaDirectory(projectRoot: string): Promise<string> {
  const targetDir = path.join(projectRoot, '.project-dna');
  await fs.ensureDir(targetDir);
  return targetDir;
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeJson(filePath, data, { spaces: 2 });
}
