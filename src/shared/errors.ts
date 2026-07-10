export class ProjectDnaError extends Error {
  constructor(message: string, readonly code: string = 'PROJECT_DNA_ERROR') {
    super(message);
    this.name = 'ProjectDnaError';
  }
}

export class ConfigurationError extends ProjectDnaError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class MemoryRepositoryError extends ProjectDnaError {
  constructor(message: string) {
    super(message, 'MEMORY_REPOSITORY_ERROR');
    this.name = 'MemoryRepositoryError';
  }
}

export class ScanError extends ProjectDnaError {
  constructor(message: string) {
    super(message, 'SCAN_ERROR');
    this.name = 'ScanError';
  }
}
