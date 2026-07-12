import { z } from 'zod';
import { PROMPT_MODES } from './prompt-types.js';

export const PromptEnrichmentSchema = z.object({
  schemaVersion: z.literal('1.0'),
  generatedAt: z.string(),
  generator: z.object({
    provider: z.literal('fireworks'),
    model: z.string(),
    projectDnaVersion: z.string(),
  }),
  source: z.object({
    userRequest: z.string(),
    mode: z.enum(PROMPT_MODES),
    includedArtifacts: z.array(z.string()),
    securityIncluded: z.boolean(),
  }),
  selectedDomains: z.array(
    z.object({
      name: z.string(),
      reason: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
  relevantContext: z.object({
    business: z.array(z.string()),
    domain: z.array(z.string()),
    architecture: z.array(z.string()),
    codingRules: z.array(z.string()),
    apiConventions: z.array(z.string()),
    securityRules: z.array(z.string()),
    dependencies: z.array(z.string()),
  }),
  enrichedPrompt: z.object({
    title: z.string(),
    markdown: z.string().min(120),
    expectedOutcome: z.array(z.string()),
    warnings: z.array(z.string()),
    missingContext: z.array(z.string()),
  }),
  confidence: z.object({
    score: z.number().min(0).max(1),
    notes: z.array(z.string()),
  }),
});

export type PromptEnrichmentDocument = z.infer<typeof PromptEnrichmentSchema>;
