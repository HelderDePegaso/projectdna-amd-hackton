import { ProjectDnaService } from '../core/project-dna-service.js';

export async function runValidateCommand(projectRoot: string): Promise<string> {
  const service = new ProjectDnaService();
  return service.validate(projectRoot);
}
