import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AI_TEMPERATURE,
  DEFAULT_AI_TIMEOUT_MS,
  DEFAULT_FIREWORKS_BASE_URL,
  DEFAULT_FIREWORKS_MODEL,
  EnvironmentConfigurationError,
  EnvironmentService,
} from '../src/ai/environment.service.js';

test('EnvironmentService prefers PDNA variables and supports legacy Fireworks variables', () => {
  const environment = new EnvironmentService({
    PDNA_FIREWORKS_API_KEY: 'pdna-key',
    FIREWORKS_API_KEY: 'legacy-key',
    PDNA_FIREWORKS_MODEL: 'pdna-model',
    FIREWORKS_MODEL: 'legacy-model',
    PDNA_FIREWORKS_BASE_URL: 'https://pdna.example.test',
    FIREWORKS_BASE_URL: 'https://legacy.example.test',
    PDNA_FIREWORKS_TIMEOUT_MS: '1500',
    PDNA_FIREWORKS_TEMPERATURE: '0.4',
  });

  assert.equal(environment.getFireworksApiKey(), 'pdna-key');
  assert.equal(environment.getModel(), 'pdna-model');
  assert.equal(environment.getBaseUrl(), 'https://pdna.example.test');
  assert.equal(environment.getTimeout(), 1500);
  assert.equal(environment.getTemperature(), 0.4);
});

test('EnvironmentService supplies stable defaults for optional AI settings', () => {
  const environment = new EnvironmentService({});

  assert.equal(environment.getProvider(), 'fireworks');
  assert.equal(environment.getOptionalApiKey(), undefined);
  assert.equal(environment.getModel(), DEFAULT_FIREWORKS_MODEL);
  assert.equal(environment.getBaseUrl(), DEFAULT_FIREWORKS_BASE_URL);
  assert.equal(environment.getTimeout(), DEFAULT_AI_TIMEOUT_MS);
  assert.equal(environment.getTemperature(), DEFAULT_AI_TEMPERATURE);
});

test('EnvironmentService reports missing or invalid configuration explicitly', () => {
  assert.throws(() => new EnvironmentService({}).getApiKey(), EnvironmentConfigurationError);
  assert.throws(() => new EnvironmentService({ PDNA_FIREWORKS_TIMEOUT_MS: 'zero' }).getTimeout(), EnvironmentConfigurationError);
  assert.throws(() => new EnvironmentService({ PDNA_FIREWORKS_TEMPERATURE: '3' }).getTemperature(), EnvironmentConfigurationError);
});