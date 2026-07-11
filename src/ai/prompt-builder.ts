import type { PromptPackage } from './ai-provider-pdna.js';

export interface PromptBuilder<TInput> {
  build(input: TInput): PromptPackage;
}