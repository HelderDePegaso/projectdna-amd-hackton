import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import type { ProjectDnaConfiguration } from '../domain/models.js';
import type { ConfigurationService } from '../domain/ports/configuration-service.js';
import { ConfigurationError } from './errors.js';

loadEnv();

const configurationSchema = z.object({
  memoryDirectory: z.string().default('.pdna'),
  defaultProvider: z.string().default('claude'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export class EnvironmentConfigurationService implements ConfigurationService {
  private readonly configuration: ProjectDnaConfiguration;

  constructor() {
    const parsed = configurationSchema.safeParse({
      memoryDirectory: process.env.PDNA_MEMORY_DIRECTORY ?? '.pdna',
      defaultProvider: process.env.PDNA_DEFAULT_PROVIDER ?? 'claude',
      logLevel: process.env.PDNA_LOG_LEVEL ?? 'info',
    });

    if (!parsed.success) {
      throw new ConfigurationError(`Invalid configuration: ${parsed.error.message}`);
    }

    this.configuration = {
      ...parsed.data,
      memoryDirectory: path.normalize(parsed.data.memoryDirectory),
    };
  }

  public get<T>(key: keyof ProjectDnaConfiguration, fallback?: T): T {
    const value = this.configuration[key];
    if (value === undefined) {
      if (fallback === undefined) {
        throw new ConfigurationError(`Configuration key ${String(key)} is not set.`);
      }
      return fallback;
    }
    return value as T;
  }

  public getAll(): ProjectDnaConfiguration {
    return { ...this.configuration };
  }
}
