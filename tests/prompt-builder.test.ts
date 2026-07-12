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
  assert.match(result.userPrompt, /# Project DNA Context Package/);
  assert.match(result.userPrompt, /# Output Contract/);
  assert.match(result.userPrompt, /business-context\.json/);
  assert.match(result.userPrompt, /security-rules\.json/);
  assert.match(result.markdown, /selectedDomains/);
});