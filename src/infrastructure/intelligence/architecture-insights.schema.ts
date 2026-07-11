import { z } from 'zod';

export const ConfidenceSchema = z.object({
  score: z.number().min(0).max(1),
  notes: z.array(z.string()).default([]),
});

export const FrameworkSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
});

export const TechnologySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  category: z.enum([
    'language',
    'framework',
    'runtime',
    'database',
    'orm',
    'testing',
    'styling',
    'deployment',
    'tooling',
    'library',
    'other',
  ]),
});

export const LayerSchema = z.object({
  name: z.string(),
  description: z.string(),
  folders: z.array(z.string()).default([]),
});

export const ModuleSchema = z.object({
  name: z.string(),
  responsibility: z.string(),
  dependencies: z.array(z.string()).default([]),
});

export const BoundarySchema = z.object({
  from: z.string(),
  to: z.string(),
  rule: z.string(),
});

export const RecommendationSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
});

export const ArchitectureInsightsSchema = z.object({
  schemaVersion: z.literal('1.0'),
  generatedAt: z.string(),
  generator: z.object({
    provider: z.literal('fireworks'),
    model: z.string(),
    projectDnaVersion: z.string(),
  }),
  source: z.object({
    overviewProvided: z.boolean(),
    scannerReportVersion: z.string(),
    architectureVersion: z.string().optional(),
  }),
  summary: z.string(),
  project: z.object({
    name: z.string(),
    language: z.string(),
    packageManager: z.string(),
    framework: FrameworkSchema,
  }),
  architectureStyle: z.object({
    primary: z.string(),
    secondary: z.array(z.string()).default([]),
    reasoning: z.string(),
  }),
  projectStructure: z.object({
    layers: z.array(LayerSchema),
    modules: z.array(ModuleSchema),
    boundaries: z.array(BoundarySchema),
    importantFolders: z.array(z.string()).default([]),
    importantFiles: z.array(z.string()).default([]),
  }),
  businessDomains: z.array(z.object({ name: z.string(), description: z.string() })),
  technicalDomains: z.array(z.object({ name: z.string(), description: z.string() })),
  relevantTechnologies: z.array(TechnologySchema),
  dependencyIntent: z.object({
    approved: z.array(z.string()).default([]),
    discouraged: z.array(z.string()).default([]),
    forbidden: z.array(z.string()).default([]),
    reasoning: z.string(),
  }),
  businessIntent: z.object({
    overview: z.string(),
    targetUsers: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
    coreValue: z.string(),
  }),
  codingConventions: z.object({
    patterns: z.array(z.string()).default([]),
    naming: z.array(z.string()).default([]),
    style: z.array(z.string()).default([]),
    architectureRules: z.array(z.string()).default([]),
  }),
  securityConcerns: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
    }),
  ),
  riskAreas: z.array(
    z.object({
      area: z.string(),
      reason: z.string(),
      impact: z.enum(['low', 'medium', 'high', 'critical']),
    }),
  ),
  missingContext: z.array(z.object({ topic: z.string(), reason: z.string() })),
  recommendedConstraints: z.array(z.string()),
  importantModules: z.array(z.object({ name: z.string(), reason: z.string() })),
  reasoningSummary: z.string(),
  architecturalRecommendations: z.array(RecommendationSchema),
  confidence: ConfidenceSchema,
  evidence: z.object({
    scannerSignals: z.array(z.string()),
    overviewSignals: z.array(z.string()),
    derivedSignals: z.array(z.string()),
  }),
});

export type ArchitectureInsightsDocument = z.infer<typeof ArchitectureInsightsSchema>;
