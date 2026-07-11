import type { ProjectDnaConfiguration } from '../models.js';

export interface ConfigurationService {
  get<T>(key: keyof ProjectDnaConfiguration, fallback?: T): T;
  getAll(): ProjectDnaConfiguration;
}
