import path from 'node:path';
import fs from 'fs-extra';
import type { ArchitectureSnapshot } from '../../domain/models.js';
import type { MemoryRepository } from '../../domain/ports/memory-repository.js';
import { MemoryRepositoryError } from '../../shared/errors.js';

export class FileMemoryRepository implements MemoryRepository {
  constructor(private readonly rootDir: string) {}

  public async saveSnapshot(snapshot: ArchitectureSnapshot): Promise<void> {
    try {
      await fs.ensureDir(this.rootDir);
      const filePath = path.join(this.rootDir, `${snapshot.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-snapshot.json`);
      await fs.writeJson(filePath, snapshot, { spaces: 2 });
    } catch (error) {
      throw new MemoryRepositoryError(`Failed to save memory snapshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async loadLatest(projectId: string): Promise<ArchitectureSnapshot | null> {
    try {
      const files = await fs.readdir(this.rootDir);
      const matches = files.filter((file: string) => file.includes(projectId.toLowerCase()));
      if (matches.length === 0) {
        return null;
      }
      const latestFile = matches.sort().at(-1);
      if (!latestFile) {
        return null;
      }
      return await fs.readJson(path.join(this.rootDir, latestFile));
    } catch (error) {
      throw new MemoryRepositoryError(`Failed to load memory snapshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async listHistory(projectId: string): Promise<ArchitectureSnapshot[]> {
    try {
      const files = await fs.readdir(this.rootDir);
      const matches = files.filter((file) => file.includes(projectId.toLowerCase()));
      return await Promise.all(matches.map(async (file: string) => fs.readJson(path.join(this.rootDir, file))));
    } catch (error) {
      throw new MemoryRepositoryError(`Failed to list memory history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
