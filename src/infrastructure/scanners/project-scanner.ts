import fs from 'fs-extra';
import path from 'node:path';
import type { FrameworkDetection, ProjectScanResult, TechnologyDetection } from '../../domain/models.js';
import { ScanError } from '../../shared/errors.js';

export class ProjectScanner {
  public async scan(projectRoot: string): Promise<ProjectScanResult> {
    const absoluteRoot = path.resolve(projectRoot);

    if (!(await fs.pathExists(absoluteRoot))) {
      throw new ScanError(`Project root does not exist: ${absoluteRoot}`);
    }

    const packageJsonPath = path.join(absoluteRoot, 'package.json');
    const packageJson = (await fs.pathExists(packageJsonPath))
      ? await fs.readJson(packageJsonPath)
      : {};

    const configFiles = [
      packageJsonPath,
      path.join(absoluteRoot, 'tsconfig.json'),
      path.join(absoluteRoot, 'next.config.js'),
      path.join(absoluteRoot, 'next.config.ts'),
      path.join(absoluteRoot, 'vite.config.ts'),
      path.join(absoluteRoot, 'vite.config.js'),
      path.join(absoluteRoot, 'angular.json'),
      path.join(absoluteRoot, 'tailwind.config.js'),
      path.join(absoluteRoot, 'tailwind.config.ts'),
      path.join(absoluteRoot, 'prisma/schema.prisma'),
      path.join(absoluteRoot, 'docker-compose.yml'),
    ].filter((file) => fs.existsSync(file));

    const sourceDirectories = ['src', 'lib', 'app', 'server', 'client'].filter((dir) => fs.existsSync(path.join(absoluteRoot, dir)));
    const dependencies = Object.keys(packageJson.dependencies ?? {});
    const devDependencies = Object.keys(packageJson.devDependencies ?? {});
    const scripts = Object.keys(packageJson.scripts ?? {});

    const technologyDetection = this.detectTechnologies({ dependencies, devDependencies, configFiles, absoluteRoot });
    const frameworkDetection = this.detectFramework({ dependencies, devDependencies, sourceDirectories, configFiles, absoluteRoot });

    return {
      projectName: packageJson.name ?? path.basename(absoluteRoot),
      projectRoot: absoluteRoot,
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      dependencies,
      devDependencies,
      scripts,
      technologies: technologyDetection.map((technology) => technology.name),
      detectedFrameworks: frameworkDetection.name === 'unknown' ? [] : [frameworkDetection.name],
      frameworkDetection,
      technologyDetection,
      sourceDirectories,
      configFiles,
      generatedAt: new Date().toISOString(),
    };
  }

  private detectFramework(input: {
    dependencies: string[];
    devDependencies: string[];
    sourceDirectories: string[];
    configFiles: string[];
    absoluteRoot: string;
  }): FrameworkDetection {
    const evidence: string[] = [];
    const allConfigFiles = input.configFiles.map((file) => path.basename(file));

    if (allConfigFiles.includes('next.config.js') || allConfigFiles.includes('next.config.ts') || input.dependencies.includes('next')) {
      evidence.push('Next.js configuration or dependency detected');
      return { name: 'nextjs', confidence: 'high', evidence, version: input.dependencies.find((dep) => dep === 'next') ? 'dependency-based' : undefined };
    }

    if (allConfigFiles.includes('angular.json') || input.dependencies.includes('@angular/core')) {
      evidence.push('Angular configuration or dependency detected');
      return { name: 'angular', confidence: 'high', evidence };
    }

    if (allConfigFiles.some((file) => file.includes('vite')) || input.dependencies.includes('vite') || input.devDependencies.includes('vite')) {
      evidence.push('Vite configuration or dependency detected');
      return { name: 'vite', confidence: 'medium', evidence };
    }

    if (input.dependencies.includes('react') || input.dependencies.includes('react-dom') || input.sourceDirectories.includes('src')) {
      evidence.push('React-oriented dependency or source convention detected');
      return { name: 'react', confidence: 'medium', evidence };
    }

    if (input.sourceDirectories.length > 0) {
      evidence.push('Project source directories detected');
      return { name: 'unknown', confidence: 'low', evidence };
    }

    return { name: 'unknown', confidence: 'low', evidence: ['No strong framework markers detected'] };
  }

  private detectTechnologies(input: {
    dependencies: string[];
    devDependencies: string[];
    configFiles: string[];
    absoluteRoot: string;
  }): TechnologyDetection[] {
    const results: TechnologyDetection[] = [];
    const known = [
      { name: 'typescript', dependencyNames: ['typescript'], category: 'language' as const, evidence: ['package.json dependency'] },
      { name: 'javascript', dependencyNames: [''], category: 'language' as const, evidence: ['default runtime'] },
      { name: 'tailwind', dependencyNames: ['tailwindcss', '@tailwindcss/postcss'], category: 'styling' as const, evidence: ['package.json dependency'] },
      { name: 'prisma', dependencyNames: ['prisma'], category: 'tool' as const, evidence: ['package.json dependency'] },
      { name: 'eslint', dependencyNames: ['eslint'], category: 'tool' as const, evidence: ['package.json dependency'] },
      { name: 'prettier', dependencyNames: ['prettier'], category: 'tool' as const, evidence: ['package.json dependency'] },
      { name: 'vitest', dependencyNames: ['vitest'], category: 'testing' as const, evidence: ['package.json dependency'] },
      { name: 'jest', dependencyNames: ['jest'], category: 'testing' as const, evidence: ['package.json dependency'] },
      { name: 'docker', dependencyNames: ['docker'], category: 'tool' as const, evidence: ['config file'] },
      { name: 'postgresql', dependencyNames: ['pg', 'postgres'], category: 'database' as const, evidence: ['package.json dependency'] },
      { name: 'redis', dependencyNames: ['redis'], category: 'database' as const, evidence: ['package.json dependency'] },
      { name: 'supabase', dependencyNames: ['@supabase/supabase-js'], category: 'tool' as const, evidence: ['package.json dependency'] },
      { name: 'firebase', dependencyNames: ['firebase'], category: 'tool' as const, evidence: ['package.json dependency'] },
      { name: 'react', dependencyNames: ['react', 'react-dom'], category: 'framework' as const, evidence: ['package.json dependency'] },
      { name: 'nextjs', dependencyNames: ['next'], category: 'framework' as const, evidence: ['package.json dependency'] },
      { name: 'vite', dependencyNames: ['vite'], category: 'framework' as const, evidence: ['package.json dependency'] },
    ];

    const allDependencies = [...input.dependencies, ...input.devDependencies];
    for (const entry of known) {
      const matched = entry.dependencyNames.some((dependency) => dependency && allDependencies.includes(dependency));
      const configMatches = entry.name === 'docker' ? input.configFiles.some((file) => file.includes('docker')) : false;
      if (matched || configMatches) {
        results.push({ name: entry.name, category: entry.category, confidence: 'high', evidence: entry.evidence });
      }
    }

    if (results.length === 0) {
      results.push({ name: 'javascript', category: 'language', confidence: 'medium', evidence: ['No specific technology markers found'] });
    }

    return results;
  }
}
