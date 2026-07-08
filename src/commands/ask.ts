import { ProjectDnaService } from '../core/project-dna-service.js';

export async function runAskCommand(projectRoot: string): Promise<string> {
  const service = new ProjectDnaService();
  return service.ask(projectRoot);
}
