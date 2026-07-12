import { config as loadEnv } from 'dotenv';

export type EnvironmentValues = Record<string, string | undefined>;

export const DEFAULT_FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1';
export const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/llama-v3p1-70b-instruct';
export const DEFAULT_AI_TIMEOUT_MS = 60_000;
export const DEFAULT_AI_TEMPERATURE = 0.2;

loadEnv();

/**
 * Centralizes AI configuration so providers do not need to know where values originate.
 * Environment variables are the current source; additional sources can be introduced here.
 */
export class EnvironmentService {
  constructor(private readonly values: EnvironmentValues = process.env) {}

  public getProvider(): string {
    return this.getValue('PDNA_PROVIDER', 'PDNA_DEFAULT_PROVIDER') ?? 'fireworks';
  }

  public getOptionalApiKey(): string | undefined {
    return this.getValue('PDNA_FIREWORKS_API_KEY', 'FIREWORKS_API_KEY');
  }

  public getApiKey(): string {
    const apiKey = this.getOptionalApiKey();
    if (!apiKey) {
      throw new EnvironmentConfigurationError('Environment variable PDNA_FIREWORKS_API_KEY or FIREWORKS_API_KEY is not configured.');
    }

    return apiKey;
  }

  public getOptionalFireworksApiKey(): string | undefined {
    return this.getOptionalApiKey();
  }

  public getFireworksApiKey(): string {
    return this.getApiKey();
  }

  public getModel(): string {
    return this.getValue('PDNA_FIREWORKS_MODEL', 'FIREWORKS_MODEL') ?? DEFAULT_FIREWORKS_MODEL;
  }

  public getBaseUrl(): string {
    return this.getValue('PDNA_FIREWORKS_BASE_URL', 'FIREWORKS_BASE_URL') ?? DEFAULT_FIREWORKS_BASE_URL;
  }

  public getTimeout(): number {
    return this.getNumber('PDNA_FIREWORKS_TIMEOUT_MS', 'FIREWORKS_TIMEOUT_MS', DEFAULT_AI_TIMEOUT_MS, (value) => Number.isInteger(value) && value > 0);
  }

  public getTemperature(): number {
    return this.getNumber('PDNA_FIREWORKS_TEMPERATURE', 'FIREWORKS_TEMPERATURE', DEFAULT_AI_TEMPERATURE, (value) => value >= 0 && value <= 2);
  }

  private getValue(...keys: string[]): string | undefined {
    for (const key of keys) {
      const value = this.values[key]?.trim();
      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private getNumber(
    primaryKey: string,
    legacyKey: string,
    fallback: number,
    isValid: (value: number) => boolean,
  ): number {
    const rawValue = this.getValue(primaryKey, legacyKey);
    if (!rawValue) {
      return fallback;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || !isValid(value)) {
      throw new EnvironmentConfigurationError(`Environment variable ${primaryKey} or ${legacyKey} must be a valid numeric value.`);
    }

    return value;
  }
}

export class EnvironmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigurationError';
  }
}