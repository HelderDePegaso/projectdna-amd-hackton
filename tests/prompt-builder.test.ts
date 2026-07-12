import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptBuilder } from '../src/prompt/prompt-builder.js';
import { promptKnowledgeBase } from './prompt-fixtures.js';

test('PromptBuilder creates a Fireworks prompt package for AI prompt enrichment', () => {
  const result = new PromptBuilder().build({
    knowledgeBase: promptKnowledgeBase,
    request: 'Add prompt command support',
    mode: 'feature',
    includeSecurity: true,
    size: {
      minChars: 800,
      maxChars: 1800,
      softOverage: 300,
    },
  });

  assert.match(result.systemPrompt, /Project DNA Prompt Enrichment Agent/);
  assert.match(result.systemPrompt, /Intent analysis/);
  assert.match(result.systemPrompt, /Facts, Inference, and Missing Context/);
  assert.match(result.systemPrompt, /Do not copy all available domains/);
  assert.match(result.systemPrompt, /Architecture rules and architecture-insights\.json are first-class evidence/);
  assert.match(result.userPrompt, /# Required Internal Reasoning/);
  assert.match(result.userPrompt, /# Project DNA Context Package/);
  assert.match(result.userPrompt, /# Output Contract/);
  assert.match(result.userPrompt, /# Output Field Guidance/);
  assert.match(result.userPrompt, /selectedDomains\[\]\.reason must include "Confidence: high\|medium\|low"/);
  assert.match(result.userPrompt, /business-context\.json/);
  assert.match(result.userPrompt, /security-rules\.json/);
  assert.match(result.userPrompt, /artifactManifest/);
  assert.match(result.userPrompt, /relevantTechnologies/);
  assert.match(result.markdown, /selectedDomains/);
});
