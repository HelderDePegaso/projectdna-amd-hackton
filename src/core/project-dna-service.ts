import { AskContextUseCase } from '../application/ask-context.use-case.js';
import { InitializeProjectUseCase } from '../application/initialize-project.use-case.js';
import { ValidateOutputUseCase } from '../application/validate-output.use-case.js';
import { ProjectOverviewUseCase } from '../application/project-overview.use-case.js';
import { PromptUseCase } from '../application/prompt.use-case.js';
import { Logger } from '../utils/logger.js';
import type { ProjectDnaFiles } from '../domain/models.js';
import type { PromptCommandOptions } from '../prompt/prompt-types.js';

export class ProjectDnaService {
  constructor(
    private readonly initializeProjectUseCase: InitializeProjectUseCase = new InitializeProjectUseCase(),
    private readonly askContextUseCase: AskContextUseCase = new AskContextUseCase(),
    private readonly validateOutputUseCase: ValidateOutputUseCase = new ValidateOutputUseCase(),
    private readonly projectOverviewUseCase: ProjectOverviewUseCase = new ProjectOverviewUseCase(),
    private readonly promptUseCase: PromptUseCase = new PromptUseCase(),
    private readonly logger: Logger = new Logger(),
  ) {}

  public async initialize(projectRoot: string): Promise<ProjectDnaFiles> {
    this.logger.info('Initializing Project DNA...');
    return this.initializeProjectUseCase.execute(projectRoot);
  }

  public async ask(projectRoot: string): Promise<string> {
    this.logger.info(`Asking Project DNA for context in ${projectRoot}`);
    return this.askContextUseCase.execute(projectRoot);
  }

  public async validate(projectRoot: string): Promise<string> {
    this.logger.info(`Validating Project DNA state in ${projectRoot}`);
    const result = this.validateOutputUseCase.execute();
    return result.summary;
  }

  public async projectOverview(projectRoot: string): Promise<string> {
    debugger
    this.logger.info(`Collecting project overview for ${projectRoot}`);
    const result = await this.projectOverviewUseCase.execute(projectRoot);

    if (result.status === 'skipped') {
      return 'Project overview skipped. No Fireworks request was sent.';
    }

    if (result.status === 'failed') {
      return 'Project overview stored, but Fireworks response failed validation. Fallback and markdown log were saved.';
    }

    return 'Project overview stored and architecture insights updated successfully.';
  }

  public async prompt(projectRoot: string, options: PromptCommandOptions): Promise<string> {
    this.logger.info(`Building Project DNA prompt for ${projectRoot}`);
    const result = await this.promptUseCase.execute(projectRoot, options);
    const domains = result.selectedDomains.length > 0 ? result.selectedDomains.join(', ') : 'no specific domain selected';
    return `Prompt generated successfully at ${result.promptPath}. Log saved at ${result.logPath}. Mode: ${result.mode}. Domains: ${domains}. Characters: ${result.charCount}.`;
  }
}
