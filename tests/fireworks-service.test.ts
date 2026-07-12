import assert from 'node:assert/strict';
import test from 'node:test';
import { EnvironmentService } from '../src/ai/environment.service.js';
import { FireworksService } from '../src/ai/fireworks.service.js';

test('FireworksService receives provider configuration from EnvironmentService', async () => {
  const service = new FireworksService({
    environment: new EnvironmentService({
      PDNA_FIREWORKS_API_KEY: 'test-key',
      PDNA_FIREWORKS_MODEL: 'test-model',
      PDNA_FIREWORKS_BASE_URL: 'https://fireworks.example.test',
      PDNA_FIREWORKS_TEMPERATURE: '0.4',
      PDNA_FIREWORKS_TIMEOUT_MS: '1500',
    }),
  });

  const status = await service.getStatus();
  const capabilities = service.getCapabilities();

  assert.equal(status.available, true);
  assert.deepEqual(status.metadata, {
    model: 'test-model',
    baseURL: 'https://fireworks.example.test',
    temperature: 0.4,
    timeoutMs: 1500,
  });
  assert.equal(capabilities.metadata?.temperature, 0.4);
  assert.equal(capabilities.metadata?.timeoutMs, 1500);
});

test('FireworksService remains unavailable without a configured API key', async () => {
  const service = new FireworksService({ environment: new EnvironmentService({}) });

  const status = await service.getStatus();

  assert.equal(status.available, false);
  assert.match(status.message ?? '', /PDNA_FIREWORKS_API_KEY or FIREWORKS_API_KEY/);
});