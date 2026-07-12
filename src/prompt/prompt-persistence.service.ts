import fs from 'fs-extra';
import path from 'node:path';
import type { PromptPackage } from '../ai/ai-provider-pdna.js';
import type { PromptEnrichmentDocument } from './prompt-enrichment.schema.js';
import type { PromptMode, PromptPersistenceResult, PromptSizeOptions } from './prompt-types.js';

export interface PromptFailurePersistenceResult {
  fallbackPath: string;
  logPath: string;
}

export class PromptPersistenceService {
  public async save(pdnaDir: string, result: PromptEnrichmentDocument, promptPackage: PromptPackage, size: PromptSizeOptions): Promise<PromptPersistenceResult> {
    const timestamp = new Date().toISOString();
    const fileStamp = timestamp.replace(/[:.]/g, '-');
    const promptsDir = path.join(pdnaDir, 'prompts');
    const logsDir = path.join(pdnaDir, 'logs', 'prompt');
    await fs.ensureDir(promptsDir);
    await fs.ensureDir(logsDir);

    const promptPath = path.join(promptsDir, `${fileStamp}-${result.source.mode}.md`);
    const jsonPath = path.join(promptsDir, `${fileStamp}-${result.source.mode}.json`);
    const logPath = path.join(logsDir, `${fileStamp}-${result.source.mode}.md`);

    await fs.writeFile(promptPath, result.enrichedPrompt.markdown, 'utf8');
    await fs.writeJson(jsonPath, result, { spaces: 2 });
    await fs.writeFile(logPath, this.renderLog(timestamp, result, promptPath, jsonPath, promptPackage, size), 'utf8');

    return { promptPath, logPath, jsonPath };
  }

  public async saveFailure(
    pdnaDir: string,
    input: {
      mode: PromptMode;
      request: string;
      providerId: string;
      payload: unknown;
      issues: string[];
      promptPackage: PromptPackage;
      size: PromptSizeOptions;
    },
  ): Promise<PromptFailurePersistenceResult> {
    const timestamp = new Date().toISOString();
    const fileStamp = timestamp.replace(/[:.]/g, '-');
    const promptsDir = path.join(pdnaDir, 'prompts');
    const logsDir = path.join(pdnaDir, 'logs', 'prompt');
    await fs.ensureDir(promptsDir);
    await fs.ensureDir(logsDir);

    const fallbackPath = path.join(promptsDir, `${fileStamp}-${input.mode}.failed.json`);
    const logPath = path.join(logsDir, `${fileStamp}-${input.mode}.failed.md`);
    await fs.writeJson(fallbackPath, {
      generatedAt: timestamp,
      providerId: input.providerId,
      userRequest: input.request,
      validationIssues: input.issues,
      payload: input.payload,
    }, { spaces: 2 });
    await fs.writeFile(logPath, this.renderFailureLog(timestamp, input, fallbackPath), 'utf8');
    return { fallbackPath, logPath };
  }

  private renderLog(timestamp: string, result: PromptEnrichmentDocument, promptPath: string, jsonPath: string, promptPackage: PromptPackage, size: PromptSizeOptions): string {
    return [
      '# Project DNA Prompt Run',
      '',
      `- Workflow start: ${timestamp}`,
      `- Provider: ${result.generator.provider}`,
      `- Model: ${result.generator.model}`,
      `- Mode: ${result.source.mode}`,
      `- User request summary: ${this.summarize(result.source.userRequest)}`,
      `- Selected domains: ${result.selectedDomains.length > 0 ? result.selectedDomains.map((domain) => domain.name).join(', ') : '(none)'}`,
      `- Selected artifacts: ${result.source.includedArtifacts.join(', ')}`,
      `- Security included: ${result.source.securityIncluded}`,
      `- Prompt size target: min ${size.minChars}, max ${size.maxChars}, soft overage ${size.softOverage}`,
      `- Generated output location: ${promptPath}`,
      `- Generated JSON location: ${jsonPath}`,
      `- Generated characters: ${result.enrichedPrompt.markdown.length}`,
      '',
      '## Condensed Prompt Sent to Fireworks',
      '````markdown',
      this.truncate(promptPackage.markdown, 12_000),
      '````',
      '',
      '## Missing Context',
      ...(result.enrichedPrompt.missingContext.length > 0 ? result.enrichedPrompt.missingContext.map((item) => `- ${item}`) : ['- None detected.']),
      '',
      '## Warnings',
      ...(result.enrichedPrompt.warnings.length > 0 ? result.enrichedPrompt.warnings.map((item) => `- ${item}`) : ['- None.']),
      '',
    ].join('\n');
  }

  private renderFailureLog(timestamp: string, input: { mode: PromptMode; request: string; providerId: string; issues: string[]; promptPackage: PromptPackage; size: PromptSizeOptions }, fallbackPath: string): string {
    return [
      '# Project DNA Prompt Run Failed',
      '',
      `- Workflow start: ${timestamp}`,
      `- Provider: ${input.providerId}`,
      `- Mode: ${input.mode}`,
      `- User request summary: ${this.summarize(input.request)}`,
      `- Prompt size target: min ${input.size.minChars}, max ${input.size.maxChars}, soft overage ${input.size.softOverage}`,
      `- Fallback output location: ${fallbackPath}`,
      '',
      '## Validation Issues',
      ...(input.issues.length > 0 ? input.issues.map((issue) => `- ${issue}`) : ['- Unknown validation issue.']),
      '',
      '## Condensed Prompt Sent to Fireworks',
      '````markdown',
      this.truncate(input.promptPackage.markdown, 12_000),
      '````',
      '',
    ].join('\n');
  }

  private summarize(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}...`;
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 32)}\n...truncated for markdown log...`;
  }
}