export interface ProjectDnaConfig {
  projectName: string;
  projectRoot: string;
  generatedAt: string;
}

export interface ArchitectureSnapshot {
  version: string;
  projectName: string;
  architecture: {
    summary: string;
    layers: string[];
  };
  dependencies: string[];
  businessContext: {
    domain: string;
    goals: string[];
  };
}

export interface ProjectDnaFiles {
  architecture: string;
  dependencies: string;
  businessContext: string;
}
