import path from 'node:path';
import type { ValidationResult } from '../domain/models.js';
import { ProjectValidationService } from '../shared/project-validation.js';

export class ValidateOutputUseCase {
  constructor(
    private readonly validationService: ProjectValidationService = new ProjectValidationService(),
  ) {}

  public async execute(projectRoot: string): Promise<ValidationResult> {
    await this.validationService.validateProjectDnaInitialized(path.resolve(projectRoot));

    return {
      isValid: true,
      summary: 'Project DNA validation pipeline initialized.',
      issues: [],
    };
  }
}