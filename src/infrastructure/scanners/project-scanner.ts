import fs from 'fs-extra';
import path from 'node:path';
import type { FrameworkDetection, ProjectScanResult, TechnologyDetection } from '../../domain/models.js';
import { ScanError } from '../../shared/errors.js';

type ScannerInput = {
  dependencies: string[];
  devDependencies: string[];
  configFiles: string[];
  configurationContents: Map<string, string>;
};

const NEXT_CONFIG_FILES = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
const VITE_CONFIG_FILES = ['vite.config.js', 'vite.config.mjs', 'vite.config.ts'];

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
      ...NEXT_CONFIG_FILES.map((file) => path.join(absoluteRoot, file)),
      ...VITE_CONFIG_FILES.map((file) => path.join(absoluteRoot, file)),
      path.join(absoluteRoot, 'nest-cli.json'),
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
    const configurationContents = await this.readConfigurationContents(configFiles);
    const input = { dependencies, devDependencies, configFiles, configurationContents };
    const frameworkDetections = this.detectFrameworks(input);
    const technologyDetection = this.detectTechnologies(input, frameworkDetections);

    return {
      projectName: packageJson.name ?? '',
      projectRoot: absoluteRoot,
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      dependencies,
      devDependencies,
      scripts,
      technologies: technologyDetection.map((technology) => technology.name),
      detectedFrameworks: frameworkDetections.map((framework) => framework.name as string),
      frameworkDetection: frameworkDetections[0] ?? {},
      technologyDetection,
      sourceDirectories,
      configFiles,
      generatedAt: new Date().toISOString(),
    };
  }

  private async readConfigurationContents(configFiles: string[]): Promise<Map<string, string>> {
    const entries = await Promise.all(
      configFiles.map(async (file) => [path.basename(file), await fs.readFile(file, 'utf8').catch(() => '')] as const),
    );

    return new Map(entries);
  }

  private detectFrameworks(input: ScannerInput): FrameworkDetection[] {
    const configFiles = new Set(input.configFiles.map((file) => path.basename(file)));
    const dependencies = new Set([...input.dependencies, ...input.devDependencies]);
    const frameworks: FrameworkDetection[] = [];

    const hasNextConfig = NEXT_CONFIG_FILES.some((file) => configFiles.has(file));
    const hasNextDependencies = ['next', 'react', 'react-dom'].every((dependency) => dependencies.has(dependency));
    if (hasNextConfig && hasNextDependencies) {
      frameworks.push({
        name: 'nextjs',
        confidence: 'high',
        evidence: ['a Next.js configuration file and the next, react, and react-dom packages were detected'],
      });
    }

    const hasAngularConfig = configFiles.has('angular.json');
    const hasAngularDependencies = ['@angular/core', '@angular/common'].every((dependency) => dependencies.has(dependency));
    if (hasAngularConfig && hasAngularDependencies) {
      frameworks.push({
        name: 'angular',
        confidence: 'high',
        evidence: ['angular.json and the @angular/core and @angular/common packages were detected'],
      });
    }

    const hasNestConfig = configFiles.has('nest-cli.json');
    const hasNestDependencies = ['@nestjs/core', '@nestjs/common'].every((dependency) => dependencies.has(dependency));
    if (hasNestConfig && hasNestDependencies) {
      frameworks.push({
        name: 'nestjs',
        confidence: 'high',
        evidence: ['nest-cli.json and the @nestjs/core and @nestjs/common packages were detected'],
      });
    }

    const reactPlugin = this.findReactVitePlugin(input.configurationContents);
    const hasReactDependencies = reactPlugin !== undefined
      && ['react', 'react-dom', reactPlugin].every((dependency) => dependencies.has(dependency));
    if (reactPlugin && hasReactDependencies) {
      frameworks.push({
        name: 'react',
        confidence: 'high',
        evidence: [`a Vite configuration uses ${reactPlugin} and its React dependency signature was detected`],
      });
    }

    return frameworks;
  }

  private findReactVitePlugin(configurationContents: Map<string, string>): '@vitejs/plugin-react' | '@vitejs/plugin-react-swc' | undefined {
    for (const configFile of VITE_CONFIG_FILES) {
      const content = configurationContents.get(configFile) ?? '';
      if (content.includes('@vitejs/plugin-react-swc')) {
        return '@vitejs/plugin-react-swc';
      }
      if (content.includes('@vitejs/plugin-react')) {
        return '@vitejs/plugin-react';
      }
    }

    return undefined;
  }

  private detectTechnologies(input: ScannerInput, frameworks: FrameworkDetection[]): TechnologyDetection[] {
    const results: TechnologyDetection[] = [];
    const known = [
      { name: 'typescript', dependencyNames: ['typescript'], configFileNames: ['tsconfig.json'], category: 'language' as const },
      { name: 'tailwind', dependencyNames: ['tailwindcss', '@tailwindcss/postcss'], configFileNames: ['tailwind.config.js', 'tailwind.config.ts'], category: 'styling' as const },
      { name: 'prisma', dependencyNames: ['prisma'], configFileNames: ['schema.prisma'], category: 'tool' as const },
      { name: 'eslint', dependencyNames: ['eslint'], configFileNames: [], category: 'tool' as const },
      { name: 'prettier', dependencyNames: ['prettier'], configFileNames: [], category: 'tool' as const },
      { name: 'vitest', dependencyNames: ['vitest'], configFileNames: [], category: 'testing' as const },
      { name: 'jest', dependencyNames: ['jest'], configFileNames: [], category: 'testing' as const },
      { name: 'docker', dependencyNames: [], configFileNames: ['docker-compose.yml'], category: 'tool' as const },
      { name: 'postgresql', dependencyNames: ['pg', 'postgres'], configFileNames: [], category: 'database' as const },
      { name: 'redis', dependencyNames: ['redis'], configFileNames: [], category: 'database' as const },
      { name: 'supabase', dependencyNames: ['@supabase/supabase-js'], configFileNames: [], category: 'tool' as const },
      { name: 'firebase', dependencyNames: ['firebase'], configFileNames: [], category: 'tool' as const },
      { name: 'vite', dependencyNames: ['vite'], configFileNames: VITE_CONFIG_FILES, category: 'tool' as const },
    ];

    const allDependencies = new Set([...input.dependencies, ...input.devDependencies]);
    const configFiles = new Set(input.configFiles.map((file) => path.basename(file)));
    for (const entry of known) {
      const dependencyMatched = entry.dependencyNames.some((dependency) => allDependencies.has(dependency));
      const configMatched = entry.configFileNames.some((configFile) => configFiles.has(configFile));
      if (dependencyMatched || configMatched) {
        results.push({
          name: entry.name,
          category: entry.category,
          confidence: 'high',
          evidence: [dependencyMatched ? 'package.json dependency' : 'framework-specific configuration file'],
        });
      }
    }

    for (const framework of frameworks) {
      if (framework.name) {
        results.push({
          name: framework.name,
          category: 'framework',
          confidence: framework.confidence ?? 'high',
          evidence: framework.evidence ?? [],
        });
      }
    }

    return results;
  }
}