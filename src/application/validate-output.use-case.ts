import type { ValidationResult } from '../domain/models.js';

export class ValidateOutputUseCase {
  public execute(): ValidationResult {
    return {
      isValid: true,
      summary: 'Project DNA validation pipeline initialized.',
      issues: [],
    };
  }
}
