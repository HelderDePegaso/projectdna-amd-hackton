import { ProjectDnaService } from '../core/project-dna-service.js';

export async function runProjectOverviewCommand(projectRoot: string): Promise<string> {
  const service = new ProjectDnaService();
  return service.projectOverview(projectRoot);
}
