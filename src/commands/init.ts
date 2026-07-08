import { ProjectDnaService } from '../core/project-dna-service.js';

export async function runInitCommand(projectRoot: string): Promise<void> {
  const service = new ProjectDnaService();
  await service.initialize(projectRoot);
}
