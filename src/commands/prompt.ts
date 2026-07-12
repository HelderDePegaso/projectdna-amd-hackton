import { ProjectDnaService } from '../core/project-dna-service.js';
import type { PromptCommandOptions } from '../prompt/prompt-types.js';

export async function runPromptCommand(projectRoot: string, options: PromptCommandOptions): Promise<string> {
  const service = new ProjectDnaService();
  return service.prompt(projectRoot, options);
}
