import type { ArchitectureSnapshot } from '../models.js';

export interface MemoryRepository {
  saveSnapshot(snapshot: ArchitectureSnapshot): Promise<void>;
  loadLatest(projectId: string): Promise<ArchitectureSnapshot | null>;
  listHistory(projectId: string): Promise<ArchitectureSnapshot[]>;
}
