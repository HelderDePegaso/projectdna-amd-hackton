#!/usr/bin/env -S node --use-system-ca

// src/cli/program.ts
import { Command } from "commander";

// src/application/ask-context.use-case.ts
import path3 from "path";

// src/infrastructure/scanners/project-scanner.ts
import fs from "fs-extra";
import path from "path";

// src/shared/errors.ts
var ProjectDnaError = class extends Error {
  constructor(message, code = "PROJECT_DNA_ERROR") {
    super(message);
    this.code = code;
    this.name = "ProjectDnaError";
  }
  code;
};
var ConfigurationError = class extends ProjectDnaError {
  constructor(message) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
};
var MemoryRepositoryError = class extends ProjectDnaError {
  constructor(message) {
    super(message, "MEMORY_REPOSITORY_ERROR");
    this.name = "MemoryRepositoryError";
  }
};
var ScanError = class extends ProjectDnaError {
  constructor(message) {
    super(message, "SCAN_ERROR");
    this.name = "ScanError";
  }
};

// src/infrastructure/scanners/project-scanner.ts
var NEXT_CONFIG_FILES = ["next.config.js", "next.config.mjs", "next.config.ts"];
var VITE_CONFIG_FILES = ["vite.config.js", "vite.config.mjs", "vite.config.ts"];
var ProjectScanner = class {
  async scan(projectRoot) {
    const absoluteRoot = path.resolve(projectRoot);
    if (!await fs.pathExists(absoluteRoot)) {
      throw new ScanError(`Project root does not exist: ${absoluteRoot}`);
    }
    const packageJsonPath = path.join(absoluteRoot, "package.json");
    const packageJson = await fs.pathExists(packageJsonPath) ? await fs.readJson(packageJsonPath) : {};
    const configFiles = [
      packageJsonPath,
      path.join(absoluteRoot, "tsconfig.json"),
      ...NEXT_CONFIG_FILES.map((file) => path.join(absoluteRoot, file)),
      ...VITE_CONFIG_FILES.map((file) => path.join(absoluteRoot, file)),
      path.join(absoluteRoot, "nest-cli.json"),
      path.join(absoluteRoot, "angular.json"),
      path.join(absoluteRoot, "tailwind.config.js"),
      path.join(absoluteRoot, "tailwind.config.ts"),
      path.join(absoluteRoot, "prisma/schema.prisma"),
      path.join(absoluteRoot, "docker-compose.yml")
    ].filter((file) => fs.existsSync(file));
    const sourceDirectories = ["src", "lib", "app", "server", "client"].filter((dir) => fs.existsSync(path.join(absoluteRoot, dir)));
    const dependencies = Object.keys(packageJson.dependencies ?? {});
    const devDependencies = Object.keys(packageJson.devDependencies ?? {});
    const scripts = Object.keys(packageJson.scripts ?? {});
    const configurationContents = await this.readConfigurationContents(configFiles);
    const input = { dependencies, devDependencies, configFiles, configurationContents };
    const frameworkDetections = this.detectFrameworks(input);
    const technologyDetection = this.detectTechnologies(input, frameworkDetections);
    return {
      projectName: packageJson.name ?? "",
      projectRoot: absoluteRoot,
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      dependencies,
      devDependencies,
      scripts,
      technologies: technologyDetection.map((technology) => technology.name),
      detectedFrameworks: frameworkDetections.map((framework) => framework.name),
      frameworkDetection: frameworkDetections[0] ?? {},
      technologyDetection,
      sourceDirectories,
      configFiles,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async readConfigurationContents(configFiles) {
    const entries = await Promise.all(
      configFiles.map(async (file) => [path.basename(file), await fs.readFile(file, "utf8").catch(() => "")])
    );
    return new Map(entries);
  }
  detectFrameworks(input) {
    const configFiles = new Set(input.configFiles.map((file) => path.basename(file)));
    const dependencies = /* @__PURE__ */ new Set([...input.dependencies, ...input.devDependencies]);
    const frameworks = [];
    const hasNextConfig = NEXT_CONFIG_FILES.some((file) => configFiles.has(file));
    const hasNextDependencies = ["next", "react", "react-dom"].every((dependency) => dependencies.has(dependency));
    if (hasNextConfig && hasNextDependencies) {
      frameworks.push({
        name: "nextjs",
        confidence: "high",
        evidence: ["a Next.js configuration file and the next, react, and react-dom packages were detected"]
      });
    }
    const hasAngularConfig = configFiles.has("angular.json");
    const hasAngularDependencies = ["@angular/core", "@angular/common"].every((dependency) => dependencies.has(dependency));
    if (hasAngularConfig && hasAngularDependencies) {
      frameworks.push({
        name: "angular",
        confidence: "high",
        evidence: ["angular.json and the @angular/core and @angular/common packages were detected"]
      });
    }
    const hasNestConfig = configFiles.has("nest-cli.json");
    const hasNestDependencies = ["@nestjs/core", "@nestjs/common"].every((dependency) => dependencies.has(dependency));
    if (hasNestConfig && hasNestDependencies) {
      frameworks.push({
        name: "nestjs",
        confidence: "high",
        evidence: ["nest-cli.json and the @nestjs/core and @nestjs/common packages were detected"]
      });
    }
    const reactPlugin = this.findReactVitePlugin(input.configurationContents);
    const hasReactDependencies = reactPlugin !== void 0 && ["react", "react-dom", reactPlugin].every((dependency) => dependencies.has(dependency));
    if (reactPlugin && hasReactDependencies) {
      frameworks.push({
        name: "react",
        confidence: "high",
        evidence: [`a Vite configuration uses ${reactPlugin} and its React dependency signature was detected`]
      });
    }
    return frameworks;
  }
  findReactVitePlugin(configurationContents) {
    for (const configFile of VITE_CONFIG_FILES) {
      const content = configurationContents.get(configFile) ?? "";
      if (content.includes("@vitejs/plugin-react-swc")) {
        return "@vitejs/plugin-react-swc";
      }
      if (content.includes("@vitejs/plugin-react")) {
        return "@vitejs/plugin-react";
      }
    }
    return void 0;
  }
  detectTechnologies(input, frameworks) {
    const results = [];
    const known = [
      { name: "typescript", dependencyNames: ["typescript"], configFileNames: ["tsconfig.json"], category: "language" },
      { name: "tailwind", dependencyNames: ["tailwindcss", "@tailwindcss/postcss"], configFileNames: ["tailwind.config.js", "tailwind.config.ts"], category: "styling" },
      { name: "prisma", dependencyNames: ["prisma"], configFileNames: ["schema.prisma"], category: "tool" },
      { name: "eslint", dependencyNames: ["eslint"], configFileNames: [], category: "tool" },
      { name: "prettier", dependencyNames: ["prettier"], configFileNames: [], category: "tool" },
      { name: "vitest", dependencyNames: ["vitest"], configFileNames: [], category: "testing" },
      { name: "jest", dependencyNames: ["jest"], configFileNames: [], category: "testing" },
      { name: "docker", dependencyNames: [], configFileNames: ["docker-compose.yml"], category: "tool" },
      { name: "postgresql", dependencyNames: ["pg", "postgres"], configFileNames: [], category: "database" },
      { name: "redis", dependencyNames: ["redis"], configFileNames: [], category: "database" },
      { name: "supabase", dependencyNames: ["@supabase/supabase-js"], configFileNames: [], category: "tool" },
      { name: "firebase", dependencyNames: ["firebase"], configFileNames: [], category: "tool" },
      { name: "vite", dependencyNames: ["vite"], configFileNames: VITE_CONFIG_FILES, category: "tool" }
    ];
    const allDependencies = /* @__PURE__ */ new Set([...input.dependencies, ...input.devDependencies]);
    const configFiles = new Set(input.configFiles.map((file) => path.basename(file)));
    for (const entry of known) {
      const dependencyMatched = entry.dependencyNames.some((dependency) => allDependencies.has(dependency));
      const configMatched = entry.configFileNames.some((configFile) => configFiles.has(configFile));
      if (dependencyMatched || configMatched) {
        results.push({
          name: entry.name,
          category: entry.category,
          confidence: "high",
          evidence: [dependencyMatched ? "package.json dependency" : "framework-specific configuration file"]
        });
      }
    }
    for (const framework of frameworks) {
      if (framework.name) {
        results.push({
          name: framework.name,
          category: "framework",
          confidence: framework.confidence ?? "high",
          evidence: framework.evidence ?? []
        });
      }
    }
    return results;
  }
};

// src/shared/project-validation.ts
import fs2 from "fs-extra";
import path2 from "path";
var ProjectValidationService = class {
  async validateWorkspace(projectRoot) {
    const absoluteRoot = path2.resolve(projectRoot);
    const stats = await fs2.stat(absoluteRoot).catch(() => {
      throw new ScanError(`Project root does not exist: ${absoluteRoot}`);
    });
    if (!stats.isDirectory()) {
      throw new ScanError(`Project root is not a directory: ${absoluteRoot}`);
    }
    const packageJsonPath = path2.join(absoluteRoot, "package.json");
    if (!await fs2.pathExists(packageJsonPath)) {
      throw new ScanError(`Missing package.json in project root: ${absoluteRoot}`);
    }
    await fs2.access(absoluteRoot, fs2.constants.R_OK | fs2.constants.W_OK).catch(() => {
      throw new ProjectDnaError(`Insufficient permissions to read/write the project root: ${absoluteRoot}`);
    });
    return absoluteRoot;
  }
  async validateProjectDnaInitialized(projectRoot, targetDirectoryName = ".pdna") {
    const absoluteRoot = await this.validateWorkspace(projectRoot);
    const targetDir = path2.join(absoluteRoot, targetDirectoryName);
    if (!await fs2.pathExists(targetDir)) {
      throw new ProjectDnaError(`Project DNA has not been initialized. Run \`pdna init\` before using this command.`);
    }
    const targetStats = await fs2.stat(targetDir);
    if (!targetStats.isDirectory()) {
      throw new ProjectDnaError(`A file exists at ${targetDir} and blocks Project DNA usage.`);
    }
    return absoluteRoot;
  }
  async validateProjectDnaCanBeInitialized(projectRoot, targetDirectoryName = ".pdna") {
    const absoluteRoot = await this.validateWorkspace(projectRoot);
    const targetDir = path2.join(absoluteRoot, targetDirectoryName);
    if (await fs2.pathExists(targetDir)) {
      const targetStats = await fs2.stat(targetDir);
      if (targetStats.isDirectory()) {
        throw new ProjectDnaError(`Project DNA is already initialized at ${targetDir}.`);
      }
      throw new ProjectDnaError(`A file exists at ${targetDir} and blocks Project DNA initialization.`);
    }
    return absoluteRoot;
  }
};

// src/application/project-context-resolver.ts
var ProjectContextResolver = class {
  resolve(scanResult) {
    return {
      projectName: scanResult.projectName,
      projectRoot: scanResult.projectRoot,
      technologies: scanResult.technologies,
      frameworks: scanResult.detectedFrameworks,
      dependencies: [...scanResult.dependencies, ...scanResult.devDependencies],
      sourceDirectories: scanResult.sourceDirectories,
      architectureSummary: "",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// src/application/ask-context.use-case.ts
var AskContextUseCase = class {
  constructor(scanner = new ProjectScanner(), resolver = new ProjectContextResolver(), validationService = new ProjectValidationService()) {
    this.scanner = scanner;
    this.resolver = resolver;
    this.validationService = validationService;
  }
  scanner;
  resolver;
  validationService;
  async execute(projectRoot) {
    const absoluteRoot = await this.validationService.validateProjectDnaInitialized(path3.resolve(projectRoot));
    const scanResult = await this.scanner.scan(absoluteRoot);
    const context = this.resolver.resolve(scanResult);
    return `Architecture context for ${context.projectName}: ${context.architectureSummary}`;
  }
};

// src/infrastructure/repositories/file-memory-repository.ts
import path4 from "path";
import fs3 from "fs-extra";
var FileMemoryRepository = class {
  constructor(rootDir) {
    this.rootDir = rootDir;
  }
  rootDir;
  async saveSnapshot(snapshot) {
    try {
      await fs3.ensureDir(this.rootDir);
      const filePath = path4.join(this.rootDir, `${snapshot.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-snapshot.json`);
      await fs3.writeJson(filePath, snapshot, { spaces: 2 });
    } catch (error) {
      throw new MemoryRepositoryError(`Failed to save memory snapshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async loadLatest(projectId) {
    try {
      const files = await fs3.readdir(this.rootDir);
      const matches = files.filter((file) => file.includes(projectId.toLowerCase()));
      if (matches.length === 0) {
        return null;
      }
      const latestFile = matches.sort().at(-1);
      if (!latestFile) {
        return null;
      }
      return await fs3.readJson(path4.join(this.rootDir, latestFile));
    } catch (error) {
      throw new MemoryRepositoryError(`Failed to load memory snapshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async listHistory(projectId) {
    try {
      const files = await fs3.readdir(this.rootDir);
      const matches = files.filter((file) => file.includes(projectId.toLowerCase()));
      return await Promise.all(matches.map(async (file) => fs3.readJson(path4.join(this.rootDir, file))));
    } catch (error) {
      throw new MemoryRepositoryError(`Failed to list memory history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// src/shared/configuration.service.ts
import path5 from "path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
loadEnv();
var configurationSchema = z.object({
  memoryDirectory: z.string().default(".pdna"),
  defaultProvider: z.string().default("claude"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info")
});
var EnvironmentConfigurationService = class {
  configuration;
  constructor() {
    const parsed = configurationSchema.safeParse({
      memoryDirectory: process.env.PDNA_MEMORY_DIRECTORY ?? ".pdna",
      defaultProvider: process.env.PDNA_DEFAULT_PROVIDER ?? "claude",
      logLevel: process.env.PDNA_LOG_LEVEL ?? "info"
    });
    if (!parsed.success) {
      throw new ConfigurationError(`Invalid configuration: ${parsed.error.message}`);
    }
    this.configuration = {
      ...parsed.data,
      memoryDirectory: path5.normalize(parsed.data.memoryDirectory)
    };
  }
  get(key, fallback) {
    const value = this.configuration[key];
    if (value === void 0) {
      if (fallback === void 0) {
        throw new ConfigurationError(`Configuration key ${String(key)} is not set.`);
      }
      return fallback;
    }
    return value;
  }
  getAll() {
    return { ...this.configuration };
  }
};

// src/utils/logger.ts
import chalk from "chalk";
var Logger = class {
  info(message) {
    console.log(chalk.cyan(message));
  }
  success(message) {
    console.log(chalk.green(message));
  }
  warn(message) {
    console.log(chalk.yellow(message));
  }
  error(message) {
    console.error(chalk.red(message));
  }
};

// src/application/initialize-project.use-case.ts
import path8 from "path";

// src/application/dna-builder.ts
import fs5 from "fs-extra";
import path7 from "path";

// src/utils/files.ts
import fs4 from "fs-extra";
import path6 from "path";
async function ensureProjectDnaDirectory(projectRoot) {
  const targetDir = path6.join(projectRoot, ".pdna");
  await fs4.ensureDir(targetDir);
  return targetDir;
}
async function writeJsonFile(filePath, data) {
  await fs4.writeJson(filePath, data, { spaces: 2 });
}

// src/application/dna-builder.ts
var ProjectDnaBuilder = class {
  async build(projectRoot, scanResult, context) {
    const absoluteRoot = path7.resolve(projectRoot);
    const projectDnaDir = await ensureProjectDnaDirectory(absoluteRoot);
    const architecture = {
      projectName: context.projectName,
      projectRoot: absoluteRoot,
      architectureStyle: "",
      layers: [],
      frameworkDetection: scanResult.frameworkDetection.name ? scanResult.frameworkDetection : {},
      technologyDetection: scanResult.technologyDetection,
      rules: [],
      summary: "",
      generatedAt: context.generatedAt
    };
    const dependencies = {
      projectName: context.projectName,
      dependencyIntent: [],
      dependencies: scanResult.dependencies,
      devDependencies: scanResult.devDependencies,
      scripts: scanResult.scripts,
      generatedAt: context.generatedAt
    };
    const businessContext = {
      projectName: context.projectName,
      summary: "",
      goals: [],
      domains: [],
      generatedAt: context.generatedAt
    };
    const domainContext = {
      projectName: context.projectName,
      domains: [],
      concepts: [],
      modules: [],
      generatedAt: context.generatedAt
    };
    const codingRules = {
      projectName: context.projectName,
      conventions: [],
      generatedAt: context.generatedAt
    };
    const securityRules = {
      projectName: context.projectName,
      concerns: [],
      rules: [],
      generatedAt: context.generatedAt
    };
    const apiConventions = {
      projectName: context.projectName,
      conventions: [],
      generatedAt: context.generatedAt
    };
    const decisionLog = {
      projectName: context.projectName,
      decisions: [],
      generatedAt: context.generatedAt
    };
    const architectureInsights = {
      projectName: context.projectName,
      status: "pending",
      architectureStyle: "",
      businessDomains: [],
      technicalDomains: [],
      relevantFrameworks: context.frameworks,
      relevantTechnologies: context.technologies,
      dependencyIntent: [],
      businessIntent: [],
      codingConventions: [],
      securityConcerns: [],
      riskAreas: [],
      missingContext: [],
      recommendedConstraints: [],
      importantModules: [],
      reasoningSummary: "",
      architecturalRecommendations: [],
      generatedAt: context.generatedAt
    };
    const overviewPath = path7.join(projectDnaDir, "project-overview.md");
    await fs5.writeFile(overviewPath, "# Project Overview\n\n");
    await writeJsonFile(path7.join(projectDnaDir, "architecture.json"), architecture);
    await writeJsonFile(path7.join(projectDnaDir, "dependencies.json"), dependencies);
    await writeJsonFile(path7.join(projectDnaDir, "business-context.json"), businessContext);
    await writeJsonFile(path7.join(projectDnaDir, "domain-context.json"), domainContext);
    await writeJsonFile(path7.join(projectDnaDir, "coding-rules.json"), codingRules);
    await writeJsonFile(path7.join(projectDnaDir, "security-rules.json"), securityRules);
    await writeJsonFile(path7.join(projectDnaDir, "api-conventions.json"), apiConventions);
    await writeJsonFile(path7.join(projectDnaDir, "decision-log.json"), decisionLog);
    await writeJsonFile(path7.join(projectDnaDir, "scanner-report.json"), scanResult);
    await writeJsonFile(path7.join(projectDnaDir, "architecture-insights.json"), architectureInsights);
    return {
      architecture: path7.join(projectDnaDir, "architecture.json"),
      dependencies: path7.join(projectDnaDir, "dependencies.json"),
      businessContext: path7.join(projectDnaDir, "business-context.json"),
      domainContext: path7.join(projectDnaDir, "domain-context.json"),
      codingRules: path7.join(projectDnaDir, "coding-rules.json"),
      securityRules: path7.join(projectDnaDir, "security-rules.json"),
      apiConventions: path7.join(projectDnaDir, "api-conventions.json"),
      decisionLog: path7.join(projectDnaDir, "decision-log.json"),
      scannerReport: path7.join(projectDnaDir, "scanner-report.json"),
      architectureInsights: path7.join(projectDnaDir, "architecture-insights.json"),
      projectOverview: overviewPath,
      projectDnaDirectory: projectDnaDir
    };
  }
};

// src/application/initialize-project.use-case.ts
var InitializeProjectUseCase = class {
  constructor(scanner = new ProjectScanner(), resolver = new ProjectContextResolver(), memoryRepository, configurationService = new EnvironmentConfigurationService(), validationService = new ProjectValidationService(), dnaBuilder = new ProjectDnaBuilder(), logger = new Logger()) {
    this.scanner = scanner;
    this.resolver = resolver;
    this.memoryRepository = memoryRepository;
    this.configurationService = configurationService;
    this.validationService = validationService;
    this.dnaBuilder = dnaBuilder;
    this.logger = logger;
  }
  scanner;
  resolver;
  memoryRepository;
  configurationService;
  validationService;
  dnaBuilder;
  logger;
  async execute(projectRoot) {
    const absoluteRoot = path8.resolve(projectRoot);
    const memoryDirectory = this.configurationService.get("memoryDirectory", ".pdna");
    await this.validationService.validateProjectDnaCanBeInitialized(absoluteRoot);
    const scanResult = await this.scanner.scan(absoluteRoot);
    const context = this.resolver.resolve(scanResult);
    const files = await this.dnaBuilder.build(absoluteRoot, scanResult, context);
    const snapshot = {
      version: "1.1.0",
      projectName: context.projectName,
      projectRoot: context.projectRoot,
      architecture: {
        summary: context.architectureSummary,
        layers: []
      },
      dependencies: context.dependencies,
      businessContext: {
        domain: "",
        goals: []
      },
      generatedAt: context.generatedAt,
      scan: scanResult
    };
    const snapshotDirectory = path8.isAbsolute(memoryDirectory) ? memoryDirectory : path8.join(absoluteRoot, memoryDirectory);
    const memoryRepository = this.memoryRepository ?? new FileMemoryRepository(snapshotDirectory);
    await memoryRepository.saveSnapshot(snapshot);
    this.logger.success(`Initialized Project DNA using ${memoryDirectory}`);
    return files;
  }
};

// src/application/validate-output.use-case.ts
import path9 from "path";
var ValidateOutputUseCase = class {
  constructor(validationService = new ProjectValidationService()) {
    this.validationService = validationService;
  }
  validationService;
  async execute(projectRoot) {
    await this.validationService.validateProjectDnaInitialized(path9.resolve(projectRoot));
    return {
      isValid: true,
      summary: "Project DNA validation pipeline initialized.",
      issues: []
    };
  }
};

// src/application/project-overview.use-case.ts
import fs6 from "fs-extra";
import path10 from "path";
import readline from "readline/promises";

// src/ai/fireworks.service.ts
import OpenAI from "openai";

// src/ai/ai-provider-pdna.ts
var AIProviderExecutionError = class extends Error {
  providerId;
  cause;
  constructor(providerId, message, cause) {
    super(message);
    this.name = "AIProviderExecutionError";
    this.providerId = providerId;
    this.cause = cause;
  }
};

// src/ai/environment.service.ts
import { config as loadEnv2 } from "dotenv";
var DEFAULT_FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1";
var DEFAULT_FIREWORKS_MODEL = "accounts/fireworks/models/llama-v3p1-70b-instruct";
var DEFAULT_AI_TIMEOUT_MS = 6e4;
var DEFAULT_AI_TEMPERATURE = 0.2;
loadEnv2();
var EnvironmentService = class {
  constructor(values = process.env) {
    this.values = values;
  }
  values;
  getProvider() {
    return this.getValue("PDNA_PROVIDER", "PDNA_DEFAULT_PROVIDER") ?? "fireworks";
  }
  getOptionalApiKey() {
    return this.getValue("PDNA_FIREWORKS_API_KEY", "FIREWORKS_API_KEY");
  }
  getApiKey() {
    const apiKey = this.getOptionalApiKey();
    if (!apiKey) {
      throw new EnvironmentConfigurationError("Environment variable PDNA_FIREWORKS_API_KEY or FIREWORKS_API_KEY is not configured.");
    }
    return apiKey;
  }
  getOptionalFireworksApiKey() {
    return this.getOptionalApiKey();
  }
  getFireworksApiKey() {
    return this.getApiKey();
  }
  getModel() {
    return this.getValue("PDNA_FIREWORKS_MODEL", "FIREWORKS_MODEL") ?? DEFAULT_FIREWORKS_MODEL;
  }
  getBaseUrl() {
    return this.getValue("PDNA_FIREWORKS_BASE_URL", "FIREWORKS_BASE_URL") ?? DEFAULT_FIREWORKS_BASE_URL;
  }
  getTimeout() {
    return this.getNumber("PDNA_FIREWORKS_TIMEOUT_MS", "FIREWORKS_TIMEOUT_MS", DEFAULT_AI_TIMEOUT_MS, (value) => Number.isInteger(value) && value > 0);
  }
  getTemperature() {
    return this.getNumber("PDNA_FIREWORKS_TEMPERATURE", "FIREWORKS_TEMPERATURE", DEFAULT_AI_TEMPERATURE, (value) => value >= 0 && value <= 2);
  }
  getValue(...keys) {
    for (const key of keys) {
      const value = this.values[key]?.trim();
      if (value) {
        return value;
      }
    }
    return void 0;
  }
  getNumber(primaryKey, legacyKey, fallback, isValid) {
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
};
var EnvironmentConfigurationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "EnvironmentConfigurationError";
  }
};

// src/ai/fireworks.service.ts
var DEFAULT_PROJECT_DNA_VERSION = "0.1.0";
var FireworksService = class {
  providerId = "fireworks";
  displayName = "Fireworks";
  apiKey;
  baseURL;
  model;
  temperature;
  timeoutMs;
  projectDnaVersion;
  providedClient;
  constructor(options = {}) {
    const environment = options.environment ?? new EnvironmentService();
    this.apiKey = options.apiKey ?? environment.getOptionalFireworksApiKey();
    this.baseURL = options.baseURL ?? environment.getBaseUrl();
    this.model = options.model ?? environment.getModel();
    this.temperature = options.temperature ?? environment.getTemperature();
    this.timeoutMs = options.timeoutMs ?? environment.getTimeout();
    this.projectDnaVersion = options.projectDnaVersion ?? DEFAULT_PROJECT_DNA_VERSION;
    this.providedClient = options.client;
  }
  async getStatus() {
    if (!this.apiKey && !this.providedClient) {
      return {
        available: false,
        message: "Missing PDNA_FIREWORKS_API_KEY or FIREWORKS_API_KEY environment variable.",
        metadata: this.getConfigurationMetadata()
      };
    }
    return {
      available: true,
      message: "Fireworks provider is configured.",
      metadata: this.getConfigurationMetadata()
    };
  }
  getCapabilities() {
    return {
      supportsStructuredOutput: true,
      supportsStatusCheck: true,
      supportedModes: ["overview-analysis", "prompt-enrichment"],
      metadata: {
        model: this.model,
        responseFormat: "json_object",
        temperature: this.temperature,
        timeoutMs: this.timeoutMs
      }
    };
  }
  async executeStructuredAnalysis(request) {
    const status = await this.getStatus();
    if (!status.available) {
      throw new AIProviderExecutionError(this.providerId, `Fireworks provider is unavailable: ${status.message}`);
    }
    try {
      const response = await this.getClient().chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: this.buildProviderSystemPrompt(request) },
          { role: "user", content: request.promptPackage?.userPrompt ?? this.buildUserPrompt(request) }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIProviderExecutionError(this.providerId, "Fireworks returned an empty response.");
      }
      return this.parseStructuredResponse(content);
    } catch (error) {
      if (error instanceof AIProviderExecutionError) {
        throw error;
      }
      const details = this.describeProviderError(error);
      throw new AIProviderExecutionError(this.providerId, `Fireworks failed to execute ${request.mode ?? "structured"} analysis.${details}`, error);
    }
  }
  getClient() {
    if (this.providedClient) {
      return this.providedClient;
    }
    return new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      timeout: this.timeoutMs
    });
  }
  getConfigurationMetadata() {
    return {
      model: this.model,
      baseURL: this.baseURL,
      temperature: this.temperature,
      timeoutMs: this.timeoutMs
    };
  }
  describeProviderError(error) {
    if (!(error instanceof Error)) {
      return "";
    }
    const cause = error.cause instanceof Error ? ` Cause: ${error.cause.message}` : "";
    return ` ${error.name}: ${error.message}.${cause}`;
  }
  buildSystemPrompt() {
    return [
      "You are the Fireworks Architecture Intelligence provider for Project DNA.",
      "Analyze only the project overview and the supplied Project DNA context.",
      "Do not generate code, UI, commands, or implementation patches.",
      "Return a single JSON object with no markdown.",
      "The JSON must conform to the architecture-insights.json schema contract supplied by the user message.",
      'Use generator.provider "fireworks".',
      `Use generator.model "${this.model}".`,
      `Use generator.projectDnaVersion "${this.projectDnaVersion}".`,
      "Include every required field. Use empty arrays or concise strings when evidence is unavailable."
    ].join("\n");
  }
  buildProviderSystemPrompt(request) {
    const basePrompt = request.promptPackage?.systemPrompt ?? this.buildSystemPrompt();
    return [
      basePrompt,
      "",
      "# Provider Metadata",
      'Use generator.provider "fireworks".',
      `Use generator.model "${this.model}".`,
      `Use generator.projectDnaVersion "${this.projectDnaVersion}".`
    ].join("\n");
  }
  buildUserPrompt(request) {
    return JSON.stringify(
      {
        task: "project-overview-architecture-analysis",
        schemaContract: this.buildArchitectureInsightsContract(),
        overview: request.overview,
        contextBundle: request.contextBundle,
        metadata: request.metadata ?? {}
      },
      null,
      2
    );
  }
  buildArchitectureInsightsContract() {
    return {
      schemaVersion: "1.0",
      generatedAt: "ISO-8601 string",
      generator: {
        provider: "fireworks",
        model: this.model,
        projectDnaVersion: this.projectDnaVersion
      },
      source: {
        overviewProvided: "boolean",
        scannerReportVersion: "string",
        architectureVersion: "string optional"
      },
      summary: "string",
      project: {
        name: "string",
        language: "string",
        packageManager: "string",
        framework: {
          name: "string",
          version: "string optional",
          confidence: "number 0..1",
          evidence: ["string"]
        }
      },
      architectureStyle: {
        primary: "string",
        secondary: ["string"],
        reasoning: "string"
      },
      projectStructure: {
        layers: [{ name: "string", description: "string", folders: ["string"] }],
        modules: [{ name: "string", responsibility: "string", dependencies: ["string"] }],
        boundaries: [{ from: "string", to: "string", rule: "string" }],
        importantFolders: ["string"],
        importantFiles: ["string"]
      },
      businessDomains: [{ name: "string", description: "string" }],
      technicalDomains: [{ name: "string", description: "string" }],
      relevantTechnologies: [
        {
          name: "string",
          version: "string optional",
          category: "language | framework | runtime | database | orm | testing | styling | deployment | tooling | library | other"
        }
      ],
      dependencyIntent: {
        approved: ["string"],
        discouraged: ["string"],
        forbidden: ["string"],
        reasoning: "string"
      },
      businessIntent: {
        overview: "string",
        targetUsers: ["string"],
        goals: ["string"],
        coreValue: "string"
      },
      codingConventions: {
        patterns: ["string"],
        naming: ["string"],
        style: ["string"],
        architectureRules: ["string"]
      },
      securityConcerns: [{ title: "string", description: "string", severity: "low | medium | high | critical" }],
      riskAreas: [{ area: "string", reason: "string", impact: "low | medium | high | critical" }],
      missingContext: [{ topic: "string", reason: "string" }],
      recommendedConstraints: ["string"],
      importantModules: [{ name: "string", reason: "string" }],
      reasoningSummary: "string",
      architecturalRecommendations: [
        {
          priority: "low | medium | high | critical",
          title: "string",
          description: "string",
          rationale: "string"
        }
      ],
      confidence: {
        score: "number 0..1",
        notes: ["string"]
      },
      evidence: {
        scannerSignals: ["string"],
        overviewSignals: ["string"],
        derivedSignals: ["string"]
      }
    };
  }
  parseStructuredResponse(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new AIProviderExecutionError(this.providerId, "Fireworks returned invalid JSON.", error);
    }
  }
};

// src/infrastructure/intelligence/architecture-insights.schema.ts
import { z as z2 } from "zod";
var ConfidenceSchema = z2.object({
  score: z2.number().min(0).max(1),
  notes: z2.array(z2.string()).default([])
});
var FrameworkSchema = z2.object({
  name: z2.string(),
  version: z2.string().optional(),
  confidence: z2.number().min(0).max(1),
  evidence: z2.array(z2.string())
});
var TechnologySchema = z2.object({
  name: z2.string(),
  version: z2.string().optional(),
  category: z2.enum([
    "language",
    "framework",
    "runtime",
    "database",
    "orm",
    "testing",
    "styling",
    "deployment",
    "tooling",
    "library",
    "other"
  ])
});
var LayerSchema = z2.object({
  name: z2.string(),
  description: z2.string(),
  folders: z2.array(z2.string()).default([])
});
var ModuleSchema = z2.object({
  name: z2.string(),
  responsibility: z2.string(),
  dependencies: z2.array(z2.string()).default([])
});
var BoundarySchema = z2.object({
  from: z2.string(),
  to: z2.string(),
  rule: z2.string()
});
var RecommendationSchema = z2.object({
  priority: z2.enum(["low", "medium", "high", "critical"]),
  title: z2.string(),
  description: z2.string(),
  rationale: z2.string()
});
var ArchitectureInsightsSchema = z2.object({
  schemaVersion: z2.literal("1.0"),
  generatedAt: z2.string(),
  generator: z2.object({
    provider: z2.literal("fireworks"),
    model: z2.string(),
    projectDnaVersion: z2.string()
  }),
  source: z2.object({
    overviewProvided: z2.boolean(),
    scannerReportVersion: z2.string(),
    architectureVersion: z2.string().optional()
  }),
  summary: z2.string(),
  project: z2.object({
    name: z2.string(),
    language: z2.string(),
    packageManager: z2.string(),
    framework: FrameworkSchema
  }),
  architectureStyle: z2.object({
    primary: z2.string(),
    secondary: z2.array(z2.string()).default([]),
    reasoning: z2.string()
  }),
  projectStructure: z2.object({
    layers: z2.array(LayerSchema),
    modules: z2.array(ModuleSchema),
    boundaries: z2.array(BoundarySchema),
    importantFolders: z2.array(z2.string()).default([]),
    importantFiles: z2.array(z2.string()).default([])
  }),
  businessDomains: z2.array(z2.object({ name: z2.string(), description: z2.string() })),
  technicalDomains: z2.array(z2.object({ name: z2.string(), description: z2.string() })),
  relevantTechnologies: z2.array(TechnologySchema),
  dependencyIntent: z2.object({
    approved: z2.array(z2.string()).default([]),
    discouraged: z2.array(z2.string()).default([]),
    forbidden: z2.array(z2.string()).default([]),
    reasoning: z2.string()
  }),
  businessIntent: z2.object({
    overview: z2.string(),
    targetUsers: z2.array(z2.string()).default([]),
    goals: z2.array(z2.string()).default([]),
    coreValue: z2.string()
  }),
  codingConventions: z2.object({
    patterns: z2.array(z2.string()).default([]),
    naming: z2.array(z2.string()).default([]),
    style: z2.array(z2.string()).default([]),
    architectureRules: z2.array(z2.string()).default([])
  }),
  securityConcerns: z2.array(
    z2.object({
      title: z2.string(),
      description: z2.string(),
      severity: z2.enum(["low", "medium", "high", "critical"])
    })
  ),
  riskAreas: z2.array(
    z2.object({
      area: z2.string(),
      reason: z2.string(),
      impact: z2.enum(["low", "medium", "high", "critical"])
    })
  ),
  missingContext: z2.array(z2.object({ topic: z2.string(), reason: z2.string() })),
  recommendedConstraints: z2.array(z2.string()),
  importantModules: z2.array(z2.object({ name: z2.string(), reason: z2.string() })),
  reasoningSummary: z2.string(),
  architecturalRecommendations: z2.array(RecommendationSchema),
  confidence: ConfidenceSchema,
  evidence: z2.object({
    scannerSignals: z2.array(z2.string()),
    overviewSignals: z2.array(z2.string()),
    derivedSignals: z2.array(z2.string())
  })
});

// src/ai/overview-prompt-builder.ts
var TECHNOLOGY_CATEGORIES = [
  "language",
  "framework",
  "runtime",
  "database",
  "orm",
  "testing",
  "styling",
  "deployment",
  "tooling",
  "library",
  "other"
];
var OverviewPromptBuilder = class {
  build(input) {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);
    const markdown = `${systemPrompt}

${userPrompt}`;
    return {
      systemPrompt,
      userPrompt,
      markdown,
      summary: this.summarizeOverview(input.overview),
      metadata: {
        contextPacking: "minimal-high-signal",
        outputSchema: "architecture-insights.json@1.0"
      }
    };
  }
  buildSystemPrompt() {
    return [
      "# 1. System Role",
      "You are the Architecture Intelligence Engine of Project DNA.",
      "You are not an assistant.",
      "You are an internal reasoning component whose only responsibility is to transform project knowledge into structured architectural intelligence.",
      "You make part of a system named Project DNA.",
      "Project DNA is the architectural intelligence system responsible for reconstructing and maintaining the architectural understanding of a software project in json files.",
      "You are a Senior software architect who has been given a product vision document (the human overview) along with some project metadata (Structured information in json about the project) . ",
      //'You are Fireworks acting as the Project DNA Architecture Intelligence Agent.',
      "**You are a senior software architect who has been given a project overview and supporting project documentation. Your task is to perform a technical requirements analysis, extracting and structuring information about the project`s architecture, business logic, and business domain into a JSON format, as described below.",
      "You reason about architecture, business intent, domains, risks, constraints, and missing context.",
      "You do not generate code, UI, shell commands, implementation patches, or generic chatbot commentary.",
      "In Project DNA, you are also the Senior Software architect.",
      "",
      "# Internal Reasoning",
      "Before producing any output, you must internally build a complete mental model of the project.",
      "Understand: ",
      "- what problem the project solves - who the target users are - why the project exists - what business processes are involved - what architectural style best represents the system - what technical decisions are explicitly supported by evidence - what technical decisions can be reasonably inferred - what information is factual - what information is inferred - what information is uncertain",
      "Only after completing this reasoning process should you populate the Output Contract.",
      "Do not expose your reasoning.",
      "Return only the final JSON.",
      "# 2. Mission",
      "Convert the human project overview plus compact    evidence   shared in json format into one structured json object according to the Output Contract Section.",
      "The output must be valid JSON only and must conform to the provided schema contract (Output Contract).",
      "Take the Human Project Overview and extract all the facts about the business and domain context",
      "All the business and domain must be stored in the businessIntent and businessDomains shown in the json final result (Output Contract) respectively.",
      "According to the businessIntent object inside Output Contract you have to extract knowledge from the overview and fill the following fields: overview, targetUsers, goals, coreValue. The overview is a simple resume you must do of the you human overview; The targetUsers are the users for        which the project is intended for and you must infer who they are (like: Game Players, blind people, students, teachers, etc); The goals are the business context souls they represent the project goals and you must infer them from the overview, keep each one in short sentences  inside the goals array; The coreValue is the business context reason why the project exists and you must infer it.",
      `According to the businessDomains object inside the Output Contract you have to extract knowledge from the overview and write this knowledge in short sentences inside the array. Business Domain represent the big functionalities/features  of the project expressed in the overview (exemple: 'Doctors can make patients consultations in the system', 'The system must permit telemedicine allowing patients and doctors to make videos calls and chat'). You must infer which are the business domains from the overview.`,
      `The technicalDomains is any array storing the programing technologies to use in the project. You must infer it from the overview.`,
      "Technical Domains as well, represent implementation technologies and technical capabilities. Examples include: - Backend - Frontend - Database - Authentication - API - Infrastructure - DevOps - AI Do not confuse Technical Domains with Business Domains.",
      "Business context should not describe technical implementation.",
      "Domain Context represents the logical knowledge domains of the application. Each domain must represent a coherent business capability. Examples include: - Authentication - Billing - Scheduling - Inventory - Medical Records - Messaging - Reporting Each domain must contain: - canonical English name - concise description The same domain names must also appear inside Business Context whenever appropriate. Domain names must remain stable across future Project DNA generations.",
      "The scanner reveals the project`s technical reality. The human overview reveals the business vision. Your responsibility is to merge both into one coherent architectural understanding capable of guiding future AI coding agents while minimizing hallucinations. The final output must be a single valid JSON object following the Output Contract.",
      "",
      "# Reasoning Workflow",
      "Follow this reasoning process internally before generating the output. Step 1 Read and understand all scanner facts. Step 2 Read and understand the complete human overview. Step 3 Separate factual information from assumptions. Step 4 Infer the business intent. Step 5 Infer the business domains. Step 6 Infer the technical domains. Step 7 Cross-check every inference against scanner evidence. Step 8 Detect inconsistencies and missing information. Step 9 Populate the Output Contract. Never skip steps.",
      "# Evidence Priority Always follow this order of trust. Priority 1 Scanner Facts Priority 2 Human Project Overview Priority 3 Existing Project DNA Knowledge Priority 4 Reasonable Architectural Inference Never invert this priority. Whenever two sources conflict, the higher priority source must prevail.",
      "",
      "# Inference Policy Inference is allowed only when it is strongly supported by available evidence. Never fabricate information. Every inferred fact must be logically justified by one or more evidence sources. Whenever confidence is low, explicitly report missing context instead of inventing an answer.",
      "",
      "# Forbidden Assumptions Never infer the following unless explicit evidence exists. - database technology - authentication mechanism - deployment platform - cloud provider - messaging systems - infrastructure topology - monitoring stack - CI/CD platform - architectural patterns - external integrations If evidence is insufficient, report uncertainty instead.",
      "",
      "# Output Phases",
      "Your JSON must support three derived outputs without a second AI pass:",
      "A. Architecture Insights: architecture style, technologies, modules, risks, constraints, recommendations, confidence, and evidence. Following the structure shown in the Output Contract.",
      "B. Business Context Output: business summary, goals, domains, target users, and product intent.",
      // compatible with business-context.json.',
      "C. Domain Context Output: flat canonical domain names, simple module alignment, and cross-references.",
      // compatible with domain-context.json.',
      "",
      "# 7. Inference Rules",
      "- Scanner facts are the source of truth for technical reality.",
      "- The human overview is the source of truth for business intent.",
      "- Business domains must originate from business intent. Technical domains must originate from scanner evidence whenever available.",
      "- Existing business and domain context should be preserved and enriched when supported by evidence.",
      "- If overview and scanner conflict on technical facts, scanner facts win.",
      "- If something cannot be confidently inferred, report it as missing context.",
      "- Do not invent unsupported facts or certainty.",
      "- Use canonical English domain names where possible and keep matching domain names stable across business and domain context.",
      "",
      "# Output Quality The output must be: - internally consistent - technically accurate - concise - evidence-based - deterministic - machine-readable - free of conversational text Do not include explanations outside the JSON.",
      "# 10. Fallback Behavior",
      " Fallback Behavior Whenever evidence is missing: - keep required fields - use empty arrays when appropriate - use empty strings when appropriate - report uncertainty in Missing Context - never fabricate information A partially complete but correct JSON is always preferred over a complete but speculative one."
    ].join("\n");
  }
  buildUserPrompt(input) {
    const compactContext = this.buildCompactContext(input.contextBundle);
    const decisionLogSection = compactContext.decisionLog ? ["", "## Decision Log", this.renderJsonBlock(compactContext.decisionLog)].join("\n") : "";
    return [
      "# 3. Project Identity",
      this.renderJsonBlock(compactContext.projectIdentity),
      "",
      "# 4. Scanner Facts",
      this.renderJsonBlock(compactContext.scannerFacts),
      "",
      //'# 5. Existing Project DNA Knowledge',
      //'## Business Context',
      //this.renderJsonBlock(compactContext.businessContext),
      //'',
      //'## Domain Context',
      //this.renderJsonBlock(compactContext.domainContext),
      //'',
      //'## Architecture Summary',
      //this.renderJsonBlock(compactContext.architectureContext),
      //'',
      //'## Dependency Summary',
      //this.renderJsonBlock(compactContext.dependencyContext),
      //'',
      "## Dependency",
      "Infer which dependencies to use if expressed widely in the overview",
      "What you infered as dependency must be stored in the dependencyIntent inside the Output Contract.",
      "Infer only direct dependencies never indirect",
      "## Coding, Security, and API Rules",
      this.renderJsonBlock(compactContext.rulesContext),
      decisionLogSection,
      "NOTE: Probably the above Coding, Security, and API Rules has its fields empty. If yes or not you must infer from the overview which are the Coding, Security, and API Rules widely expressed and fill them in the right inside the Output Contract",
      "",
      "# 6. Human Project Overview",
      input.overview,
      "",
      "# 8. Output Contract",
      this.renderJsonBlock(this.buildArchitectureInsightsContract()),
      "",
      "# 9. Quality Rules",
      "- Return JSON only. Do not wrap the response in markdown.",
      "- Keep the result concise and evidence-based.",
      "- Include architecture insights, business meaning, and domain interpretation in the schema fields.",
      "- Business context must be derivable from businessIntent and businessDomains.",
      "- Domain context must be derivable from businessDomains, technicalDomains, importantModules, and projectStructure.",
      "- Cross-check scanner signals, overview signals, and derived signals in the evidence section."
    ].filter(Boolean).join("\n");
  }
  buildCompactContext(contextBundle) {
    const scannerFacts = this.asObject(contextBundle.scannerFacts);
    const architectureContext = this.asObject(contextBundle.architectureContext);
    const dependencyContext = this.asObject(contextBundle.dependencyContext);
    const codingRules = this.asObject(contextBundle.codingRules);
    const securityRules = this.asObject(contextBundle.securityRules);
    const apiConventions = this.asObject(contextBundle.apiConventions);
    return {
      projectIdentity: {
        name: this.pickString(scannerFacts, ["projectName", "packageName"]) ?? this.pickString(architectureContext, ["projectName"]),
        packageName: this.pickString(scannerFacts, ["packageName"]),
        packageVersion: this.pickString(scannerFacts, ["packageVersion"]),
        generatedAt: this.pickString(scannerFacts, ["generatedAt"])
      },
      scannerFacts: {
        frameworkDetection: scannerFacts.frameworkDetection ?? scannerFacts.detectedFrameworks,
        technologyDetection: this.takeArray(scannerFacts.technologyDetection ?? scannerFacts.technologies, 20),
        dependencies: this.takeArray(scannerFacts.dependencies, 25),
        devDependencies: this.takeArray(scannerFacts.devDependencies, 15),
        scripts: this.takeArray(scannerFacts.scripts, 15),
        sourceDirectories: this.takeArray(scannerFacts.sourceDirectories, 20),
        configFiles: this.takeArray(scannerFacts.configFiles, 20)
      },
      //businessContext: contextBundle.businessContext,
      //domainContext: contextBundle.domainContext,
      //architectureContext: {
      //  architectureStyle: architectureContext.architectureStyle ?? architectureContext.identity,
      //  layers: architectureContext.layers,
      //  summary: architectureContext.summary,
      //  rules: this.takeArray(architectureContext.rules, 15),
      //},
      //dependencyContext: {
      //  dependencyIntent: dependencyContext.dependencyIntent,
      //  dependencies: this.takeArray(dependencyContext.dependencies, 25),
      //  devDependencies: this.takeArray(dependencyContext.devDependencies, 15),
      //  detectedTechnologies: this.takeArray(dependencyContext.detectedTechnologies, 20),
      //},
      rulesContext: {
        coding: {
          conventions: this.takeArray(codingRules.conventions, 20),
          formatting: this.takeArray(codingRules.formatting, 10),
          linting: this.takeArray(codingRules.linting, 10)
        },
        security: {
          concerns: this.takeArray(securityRules.concerns, 20),
          policies: this.takeArray(securityRules.policies, 20),
          restrictions: this.takeArray(securityRules.restrictions, 20),
          rules: this.takeArray(securityRules.rules, 20)
        },
        api: {
          conventions: this.takeArray(apiConventions.conventions, 20),
          patterns: this.takeArray(apiConventions.patterns, 20),
          naming: this.takeArray(apiConventions.naming, 20),
          responseShapes: this.takeArray(apiConventions.responseShapes, 20)
        }
      },
      decisionLog: this.compactDecisionLog(contextBundle.decisionLog)
    };
  }
  buildArchitectureInsightsContract() {
    return {
      schemaVersion: "1.0",
      generatedAt: "ISO-8601 string",
      generator: {
        provider: "fireworks",
        model: "string",
        projectDnaVersion: "string"
      },
      source: {
        overviewProvided: "boolean",
        scannerReportVersion: "string",
        architectureVersion: "string optional"
      },
      summary: "string",
      project: {
        name: "string",
        language: "string",
        packageManager: "string",
        framework: {
          name: "string",
          version: "string optional",
          confidence: "number 0..1",
          evidence: ["string"]
        }
      },
      architectureStyle: {
        primary: "string",
        secondary: ["string"],
        reasoning: "string"
      },
      projectStructure: {
        layers: [{ name: "string", description: "string", folders: ["string"] }],
        modules: [{ name: "string", responsibility: "string", dependencies: ["string"] }],
        boundaries: [{ from: "string", to: "string", rule: "string" }],
        importantFolders: ["string"],
        importantFiles: ["string"]
      },
      businessDomains: [{ name: "string", description: "string" }],
      technicalDomains: [{ name: "string", description: "string" }],
      relevantTechnologies: [{ name: "string", version: "string optional", category: TECHNOLOGY_CATEGORIES.join(" | ") }],
      dependencyIntent: {
        approved: ["string"],
        discouraged: ["string"],
        forbidden: ["string"],
        reasoning: "string"
      },
      businessIntent: {
        overview: "string",
        targetUsers: ["string"],
        goals: ["string"],
        coreValue: "string"
      },
      codingConventions: {
        patterns: ["string"],
        naming: ["string"],
        style: ["string"],
        architectureRules: ["string"]
      },
      securityConcerns: [{ title: "string", description: "string", severity: "low | medium | high | critical" }],
      riskAreas: [{ area: "string", reason: "string", impact: "low | medium | high | critical" }],
      missingContext: [{ topic: "string", reason: "string" }],
      recommendedConstraints: ["string"],
      importantModules: [{ name: "string", reason: "string" }],
      reasoningSummary: "string",
      architecturalRecommendations: [{ priority: "low | medium | high | critical", title: "string", description: "string", rationale: "string" }],
      confidence: {
        score: "number 0..1",
        notes: ["string"]
      },
      evidence: {
        scannerSignals: ["string"],
        overviewSignals: ["string"],
        derivedSignals: ["string"]
      }
    };
  }
  compactDecisionLog(value) {
    const decisionLog = this.asObject(value);
    const decisions = this.takeArray(decisionLog.decisions, 20);
    if (decisions.length === 0) {
      return void 0;
    }
    return {
      decisions,
      generatedAt: decisionLog.generatedAt ?? decisionLog.createdAt
    };
  }
  summarizeOverview(overview) {
    const normalized = overview.replace(/\s+/g, " ").trim();
    if (normalized.length <= 180) {
      return normalized;
    }
    return `${normalized.slice(0, 177)}...`;
  }
  renderJsonBlock(value) {
    return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
  }
  asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  pickString(source, keys) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return void 0;
  }
  takeArray(value, limit) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, limit);
  }
};

// src/prompt/prompt-builder.ts
var TECHNOLOGY_LIMIT = 20;
var DEPENDENCY_LIMIT = 24;
var PromptBuilder = class {
  build(input) {
    const compactContext = this.buildCompactContext(input);
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, compactContext);
    return {
      systemPrompt,
      userPrompt,
      markdown: `${systemPrompt}

${userPrompt}`,
      summary: this.summarize(input.request),
      metadata: {
        mode: input.mode,
        includeSecurity: input.includeSecurity,
        outputSchema: "prompt-enrichment.json@1.0",
        contextPacking: "project-dna-prompt-enrichment"
      }
    };
  }
  buildSystemPrompt() {
    return [
      "# 1. System Role",
      "You are the Project DNA Prompt Enrichment Agent running through Fireworks.",
      "You are not a code generator and you are not a generic chat assistant.",
      "Think like an architecture analyst whose output will guide a separate AI coding assistant.",
      "Your job is to transform the user request into a project-aware, architecture-aware, domain-aware prompt that reduces hallucination and preserves Project DNA constraints.",
      "",
      "# 2. Mission",
      "Analyze the user request, select only relevant Project DNA evidence, and use that evidence to enrich the original request into a final Markdown prompt.",
      "Return structured JSON only. The final enriched prompt must be inside enrichedPrompt.markdown.",
      "",
      "# 3. Reasoning Protocol",
      "Before producing the JSON, perform this reasoning internally and reflect the important conclusions in the JSON fields:",
      "1. Intent analysis: determine what the user wants, the software concern involved, the modification type, and the likely technical area affected.",
      "2. Evidence inventory: separate Facts, Inference, and Missing Context from the supplied artifacts.",
      "3. Artifact selection: decide which Project DNA artifacts are relevant for this request before selecting domains or dependencies.",
      "4. Domain selection: select only domains that are directly relevant to the request and supported by evidence.",
      "5. Evidence ranking: prefer high-confidence evidence, report conflicts, and lower confidence when evidence is weak or ambiguous.",
      "6. Prompt synthesis: convert selected project knowledge into actionable implementation guidance for another AI coding assistant.",
      "",
      "# 4. Evidence Rules",
      "- A Fact is directly present in the supplied Project DNA artifacts.",
      "- An Inference is derived from multiple facts. Never present an inference as a confirmed fact.",
      "- Missing Context is information that cannot be safely inferred from the supplied artifacts.",
      "- Every important conclusion must be traceable to supplied artifacts.",
      "- Do not invent domains, dependencies, modules, architecture styles, project conventions, file names, technologies, APIs, or storage locations.",
      "- If evidence is insufficient, say so explicitly in enrichedPrompt.missingContext and confidence.notes.",
      "- If two artifacts conflict, report the conflict in enrichedPrompt.warnings and confidence.notes instead of silently resolving it.",
      "",
      "# 5. Evidence Priority",
      "- Architecture rules and architecture-insights.json are first-class evidence and outrank generic programming knowledge.",
      "- coding-rules.json, api-conventions.json, security-rules.json, and architecture-insights.json constrain every implementation recommendation.",
      "- Use scanner facts for technical reality: detected technologies, dependencies, source directories, scripts, and configuration files.",
      "- Use business-context.json for product goals, users, and business meaning.",
      "- Use domain-context.json for canonical domain names and domain concepts.",
      "- Use dependencies.json and scanner dependency facts only for dependencies that actually appear in the artifacts.",
      "- Use decision-log.json for prior architectural decisions when relevant to the request.",
      "",
      "# 6. Domain Selection Rules",
      "- Do not copy all available domains.",
      "- Select a domain only when the request meaning and artifact evidence both support it.",
      "- For each selectedDomains item, reason must include why it was selected and a confidence label: high, medium, or low.",
      "- For each selectedDomains item, evidence must cite the supporting artifact names and concise evidence statements.",
      "- Ignore domains that are plausible in general but unsupported by the current request and artifacts.",
      "",
      "# 7. Conservative Assumptions",
      "- When the request is ambiguous, explain the ambiguity.",
      "- Choose the most likely interpretation only when evidence supports it.",
      "- Report credible alternative interpretations in enrichedPrompt.missingContext or enrichedPrompt.warnings.",
      "- Reduce confidence when relying on inference or when artifacts are sparse.",
      "",
      "# 8. Non-Goals",
      "- Do not write implementation code.",
      "- Do not output shell commands.",
      "- Do not redesign Project DNA.",
      "- Do not emit markdown outside the required JSON object.",
      "",
      "# 9. Output Philosophy",
      "The enriched prompt must not merely repeat project information.",
      "Every section must turn relevant evidence into useful guidance for another coding model.",
      "Avoid redundancy, generic explanations, and unsupported recommendations."
    ].join("\n");
  }
  buildUserPrompt(input, compactContext) {
    return [
      "# User Request",
      input.request,
      "",
      "# Prompt Mode",
      input.mode,
      "",
      "# Prompt Size Targets",
      this.renderJsonBlock(input.size),
      "",
      "# Included Security Rules",
      String(input.includeSecurity),
      "",
      "# Required Internal Reasoning",
      "Perform the following analysis before writing the JSON response:",
      "- Intent Analysis: identify the user goal, software concern, requested modification type, and affected technical area.",
      "- Artifact Relevance: decide which supplied artifacts matter for this request and ignore unrelated artifacts.",
      "- Fact / Inference / Missing Context Separation: keep direct evidence separate from derived conclusions and uncertainty.",
      "- Domain Selection: choose only relevant domains, each with evidence and a confidence label embedded in the reason.",
      "- Evidence Ranking: prefer direct, current, architecture-specific evidence over weak or generic evidence.",
      "- Constraint Application: ensure all recommendations obey architecture insights, coding rules, API conventions, and security rules when included.",
      "",
      "# Project DNA Context Package",
      this.renderJsonBlock(compactContext),
      "",
      "# Output Contract",
      this.renderJsonBlock(this.buildOutputContract(input)),
      "",
      "# Output Field Guidance",
      '- selectedDomains[].reason must include "Confidence: high|medium|low" plus why the domain is relevant to this request.',
      '- selectedDomains[].evidence must contain concise artifact-backed evidence, for example "domain-context.json: <fact>".',
      "- relevantContext arrays must include only context that influenced the final prompt; leave unrelated categories empty.",
      "- enrichedPrompt.warnings must include evidence conflicts, risky assumptions, and ambiguous interpretations.",
      "- enrichedPrompt.missingContext must include facts needed for safer implementation but absent from the artifacts.",
      "- confidence.notes must summarize evidence strength, inference strength, conflicts, and ambiguity.",
      "",
      "# Final Prompt Requirements",
      "- enrichedPrompt.markdown must be formal English.",
      "- enrichedPrompt.markdown must include: Task, Relevant Project Context, Relevant Domains, Architecture Notes, Technologies / Dependencies, Coding Constraints, API / Structural Constraints, Expected Outcome, Missing Context.",
      "- Include Security Constraints only when securityIncluded is true and security evidence exists.",
      "- Respect minChars, maxChars, and softOverage as practical character targets for enrichedPrompt.markdown.",
      "- The Relevant Project Context section must distinguish confirmed facts from inference when both are used.",
      "- The Relevant Domains section must include only selected domains and explain why each matters.",
      "- The Architecture Notes section must prioritize architecture-insights.json over generic engineering advice.",
      "- The Technologies / Dependencies section must mention only technologies and dependencies present in the supplied artifacts.",
      "- The Coding Constraints and API / Structural Constraints sections must be constraints, not generic best practices.",
      "- Do not include unsupported file names, module names, dependencies, commands, or architecture patterns."
    ].join("\n");
  }
  buildCompactContext(input) {
    const scannerReport = this.asObject(input.knowledgeBase.scannerReport);
    const architectureInsights = this.asObject(input.knowledgeBase.architectureInsights);
    const dependencies = this.asObject(input.knowledgeBase.dependencies);
    return {
      artifactManifest: {
        purpose: "Use this manifest to select relevant evidence. Do not treat every artifact as relevant.",
        availableArtifacts: [
          "business-context.json",
          "domain-context.json",
          "architecture-insights.json",
          "scanner-report.json",
          "dependencies.json",
          "coding-rules.json",
          "api-conventions.json",
          input.includeSecurity ? "security-rules.json" : "security-rules.json omitted",
          "decision-log.json"
        ]
      },
      businessContext: input.knowledgeBase.businessContext,
      domainContext: input.knowledgeBase.domainContext,
      architectureInsights: {
        summary: architectureInsights.summary,
        architectureStyle: architectureInsights.architectureStyle,
        businessDomains: architectureInsights.businessDomains,
        technicalDomains: architectureInsights.technicalDomains,
        businessIntent: architectureInsights.businessIntent,
        relevantTechnologies: this.takeArray(architectureInsights.relevantTechnologies, TECHNOLOGY_LIMIT),
        dependencyIntent: architectureInsights.dependencyIntent,
        codingConventions: architectureInsights.codingConventions,
        riskAreas: architectureInsights.riskAreas,
        securityConcerns: architectureInsights.securityConcerns,
        missingContext: architectureInsights.missingContext,
        recommendedConstraints: architectureInsights.recommendedConstraints,
        importantModules: this.takeArray(architectureInsights.importantModules, 16),
        architecturalRecommendations: this.takeArray(architectureInsights.architecturalRecommendations, 12),
        evidence: architectureInsights.evidence,
        confidence: architectureInsights.confidence
      },
      scannerFacts: {
        projectName: scannerReport.projectName,
        packageName: scannerReport.packageName,
        packageVersion: scannerReport.packageVersion,
        technologies: this.takeArray(scannerReport.technologies, TECHNOLOGY_LIMIT),
        detectedFrameworks: this.takeArray(scannerReport.detectedFrameworks, 8),
        frameworkDetection: scannerReport.frameworkDetection,
        technologyDetection: this.takeArray(scannerReport.technologyDetection, TECHNOLOGY_LIMIT),
        sourceDirectories: this.takeArray(scannerReport.sourceDirectories, 20),
        configFiles: this.takeArray(scannerReport.configFiles, 12)
      },
      dependencies: {
        dependencies: this.takeArray(scannerReport.dependencies ?? dependencies.dependencies, DEPENDENCY_LIMIT),
        devDependencies: this.takeArray(scannerReport.devDependencies ?? dependencies.devDependencies, 16),
        dependencyIntent: dependencies.dependencyIntent,
        scripts: this.takeArray(scannerReport.scripts ?? dependencies.scripts, 16)
      },
      codingRules: input.knowledgeBase.codingRules,
      apiConventions: input.knowledgeBase.apiConventions,
      securityRules: input.includeSecurity ? input.knowledgeBase.securityRules ?? {} : { omitted: true },
      decisionLog: this.compactDecisionLog(input.knowledgeBase.decisionLog)
    };
  }
  buildOutputContract(input) {
    return {
      schemaVersion: "1.0",
      generatedAt: "ISO-8601 string",
      generator: {
        provider: "fireworks",
        model: "string",
        projectDnaVersion: "string"
      },
      source: {
        userRequest: input.request,
        mode: input.mode,
        includedArtifacts: ["business-context.json", "domain-context.json", "architecture-insights.json", "scanner-report.json", "dependencies.json", "coding-rules.json", "api-conventions.json", input.includeSecurity ? "security-rules.json" : null].filter(Boolean),
        securityIncluded: input.includeSecurity
      },
      selectedDomains: [{ name: "string", reason: "string", evidence: ["string"] }],
      relevantContext: {
        business: ["string"],
        domain: ["string"],
        architecture: ["string"],
        codingRules: ["string"],
        apiConventions: ["string"],
        securityRules: ["string"],
        dependencies: ["string"]
      },
      enrichedPrompt: {
        title: "string",
        markdown: "string",
        expectedOutcome: ["string"],
        warnings: ["string"],
        missingContext: ["string"]
      },
      confidence: {
        score: "number 0..1",
        notes: ["string"]
      }
    };
  }
  compactDecisionLog(value) {
    const decisionLog = this.asObject(value);
    return {
      decisions: this.takeArray(decisionLog.decisions, 12),
      generatedAt: decisionLog.generatedAt ?? decisionLog.createdAt
    };
  }
  renderJsonBlock(value) {
    return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
  }
  summarize(value) {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}...`;
  }
  asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  takeArray(value, limit) {
    return Array.isArray(value) ? value.slice(0, limit) : [];
  }
};

// src/prompt/prompt-enrichment.schema.ts
import { z as z3 } from "zod";

// src/prompt/prompt-types.ts
var PROMPT_MODES = ["fix", "feature", "refactor", "explain"];

// src/prompt/prompt-enrichment.schema.ts
var PromptEnrichmentSchema = z3.object({
  schemaVersion: z3.literal("1.0"),
  generatedAt: z3.string(),
  generator: z3.object({
    provider: z3.literal("fireworks"),
    model: z3.string(),
    projectDnaVersion: z3.string()
  }),
  source: z3.object({
    userRequest: z3.string(),
    mode: z3.enum(PROMPT_MODES),
    includedArtifacts: z3.array(z3.string()),
    securityIncluded: z3.boolean()
  }),
  selectedDomains: z3.array(
    z3.object({
      name: z3.string(),
      reason: z3.string(),
      evidence: z3.array(z3.string())
    })
  ),
  relevantContext: z3.object({
    business: z3.array(z3.string()),
    domain: z3.array(z3.string()),
    architecture: z3.array(z3.string()),
    codingRules: z3.array(z3.string()),
    apiConventions: z3.array(z3.string()),
    securityRules: z3.array(z3.string()),
    dependencies: z3.array(z3.string())
  }),
  enrichedPrompt: z3.object({
    title: z3.string(),
    markdown: z3.string().min(120),
    expectedOutcome: z3.array(z3.string()),
    warnings: z3.array(z3.string()),
    missingContext: z3.array(z3.string())
  }),
  confidence: z3.object({
    score: z3.number().min(0).max(1),
    notes: z3.array(z3.string())
  })
});

// src/ai/pdna-ai.service.ts
var AIProviderValidationError = class extends Error {
  providerId;
  payload;
  issues;
  promptPackage;
  constructor(providerId, payload, issues, promptPackage) {
    super(`Provider ${providerId} returned an invalid structured payload.`);
    this.name = "AIProviderValidationError";
    this.providerId = providerId;
    this.payload = payload;
    this.issues = issues;
    this.promptPackage = promptPackage;
  }
};
var PDNAAIService = class {
  constructor(activeProvider, overviewPromptBuilder = new OverviewPromptBuilder(), promptEnrichmentPromptBuilder = new PromptBuilder()) {
    this.activeProvider = activeProvider;
    this.overviewPromptBuilder = overviewPromptBuilder;
    this.promptEnrichmentPromptBuilder = promptEnrichmentPromptBuilder;
  }
  activeProvider;
  overviewPromptBuilder;
  promptEnrichmentPromptBuilder;
  setActiveProvider(provider) {
    this.activeProvider = provider;
  }
  getActiveProviderInfo() {
    return {
      providerId: this.activeProvider.providerId,
      displayName: this.activeProvider.displayName,
      capabilities: this.activeProvider.getCapabilities()
    };
  }
  async getActiveProviderStatus() {
    return this.activeProvider.getStatus();
  }
  async analyzeProjectOverview(request) {
    const capabilities = this.activeProvider.getCapabilities();
    if (!capabilities.supportsStructuredOutput || !capabilities.supportedModes.includes("overview-analysis")) {
      throw new AIProviderExecutionError(
        this.activeProvider.providerId,
        `Provider ${this.activeProvider.displayName} does not support structured project overview analysis.`
      );
    }
    const promptPackage = request.promptPackage ?? this.overviewPromptBuilder.build({
      overview: request.overview,
      contextBundle: request.contextBundle,
      metadata: request.metadata
    });
    const rawResult = await this.activeProvider.executeStructuredAnalysis({
      ...request,
      mode: "overview-analysis",
      promptPackage
    });
    const parsed = ArchitectureInsightsSchema.safeParse(rawResult);
    if (!parsed.success) {
      throw new AIProviderValidationError(this.activeProvider.providerId, rawResult, parsed.error.issues, promptPackage);
    }
    return parsed.data;
  }
  async enrichPrompt(input) {
    const capabilities = this.activeProvider.getCapabilities();
    if (!capabilities.supportsStructuredOutput || !capabilities.supportedModes.includes("prompt-enrichment")) {
      throw new AIProviderExecutionError(
        this.activeProvider.providerId,
        `Provider ${this.activeProvider.displayName} does not support structured prompt enrichment.`
      );
    }
    const promptPackage = input.promptPackage ?? this.promptEnrichmentPromptBuilder.build(input);
    const rawResult = await this.activeProvider.executeStructuredAnalysis({
      mode: "prompt-enrichment",
      overview: input.request,
      contextBundle: {
        scannerFacts: input.knowledgeBase.scannerReport,
        architectureContext: input.knowledgeBase.architectureInsights,
        dependencyContext: input.knowledgeBase.dependencies,
        businessContext: input.knowledgeBase.businessContext,
        domainContext: input.knowledgeBase.domainContext,
        codingRules: input.knowledgeBase.codingRules,
        securityRules: input.knowledgeBase.securityRules ?? {},
        apiConventions: input.knowledgeBase.apiConventions,
        decisionLog: input.knowledgeBase.decisionLog
      },
      promptPackage,
      metadata: input.metadata
    });
    const parsed = PromptEnrichmentSchema.safeParse(rawResult);
    if (!parsed.success) {
      throw new AIProviderValidationError(this.activeProvider.providerId, rawResult, parsed.error.issues, promptPackage);
    }
    return parsed.data;
  }
};

// src/application/project-overview.use-case.ts
var REQUIRED_PROJECT_DNA_FILES = [
  "architecture.json",
  "dependencies.json",
  "business-context.json",
  "domain-context.json",
  "coding-rules.json",
  "security-rules.json",
  "api-conventions.json",
  "decision-log.json",
  "scanner-report.json"
];
var ProjectOverviewUseCase = class {
  constructor(validationService = new ProjectValidationService(), aiService = new PDNAAIService(new FireworksService()), promptBuilder = new OverviewPromptBuilder()) {
    this.validationService = validationService;
    this.aiService = aiService;
    this.promptBuilder = promptBuilder;
  }
  validationService;
  aiService;
  promptBuilder;
  async execute(projectRoot) {
    const absoluteRoot = path10.resolve(projectRoot);
    await this.validationService.validateWorkspace(absoluteRoot);
    const pdnaDir = path10.join(absoluteRoot, ".pdna");
    await this.ensureProjectDnaInitialized(pdnaDir);
    const contextBundle = await this.loadContextBundle(pdnaDir);
    const overviewPath = path10.join(pdnaDir, "project-overview.md");
    const insightsPath = path10.join(pdnaDir, "architecture-insights.json");
    const businessContextPath = path10.join(pdnaDir, "business-context.json");
    const domainContextPath = path10.join(pdnaDir, "domain-context.json");
    const existingContent = await fs6.pathExists(overviewPath) ? await fs6.readFile(overviewPath, "utf8") : "";
    const answer = await this.promptForOverview(existingContent);
    if (answer.trim().length === 0) {
      return { status: "skipped", overviewPath, insightsPath };
    }
    await fs6.writeFile(overviewPath, answer, "utf8");
    const metadata = {
      projectRoot: absoluteRoot,
      projectDnaDir: pdnaDir
    };
    const promptPackage = this.promptBuilder.build({
      overview: answer,
      contextBundle,
      metadata
    });
    const providerInfo = this.aiService.getActiveProviderInfo();
    try {
      const insights = await this.aiService.analyzeProjectOverview({
        overview: answer,
        contextBundle,
        promptPackage,
        metadata
      });
      const businessContext = this.deriveBusinessContext(contextBundle.businessContext, insights);
      const domainContext = this.deriveDomainContext(contextBundle.domainContext, insights);
      await writeJsonFile(insightsPath, insights);
      await writeJsonFile(businessContextPath, businessContext);
      await writeJsonFile(domainContextPath, domainContext);
      const logPath = await this.writeMarkdownLog(pdnaDir, {
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        overviewSummary: promptPackage.summary,
        promptPackage,
        provider: providerInfo.displayName,
        providerId: providerInfo.providerId,
        rawResponseSummary: this.summarizeJson(insights),
        validationResult: "success",
        savedFiles: [overviewPath, insightsPath, businessContextPath, domainContextPath]
      });
      return {
        status: "updated",
        overviewPath,
        insightsPath,
        businessContextPath,
        domainContextPath,
        logPath,
        providerId: providerInfo.providerId
      };
    } catch (error) {
      if (error instanceof AIProviderValidationError) {
        const fallbackPath2 = path10.join(pdnaDir, "architecture-insights.failed.json");
        await writeJsonFile(fallbackPath2, {
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          providerId: error.providerId,
          validationIssues: error.issues,
          payload: error.payload
        });
        const logPath2 = await this.writeMarkdownLog(pdnaDir, {
          startedAt: (/* @__PURE__ */ new Date()).toISOString(),
          overviewSummary: promptPackage.summary,
          promptPackage,
          provider: providerInfo.displayName,
          providerId: providerInfo.providerId,
          rawResponseSummary: this.summarizeJson(error.payload),
          validationResult: "failure",
          savedFiles: [overviewPath, fallbackPath2],
          failureDetails: error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        });
        return {
          status: "failed",
          overviewPath,
          insightsPath,
          fallbackPath: fallbackPath2,
          logPath: logPath2,
          providerId: providerInfo.providerId
        };
      }
      const fallbackPath = path10.join(pdnaDir, "architecture-insights.error.json");
      await writeJsonFile(fallbackPath, {
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        providerId: providerInfo.providerId,
        error: error instanceof Error ? error.message : "Unknown project overview analysis error."
      });
      const logPath = await this.writeMarkdownLog(pdnaDir, {
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        overviewSummary: promptPackage.summary,
        promptPackage,
        provider: providerInfo.displayName,
        providerId: providerInfo.providerId,
        rawResponseSummary: "No valid JSON response was captured.",
        validationResult: "error",
        savedFiles: [overviewPath, fallbackPath],
        failureDetails: [error instanceof Error ? error.message : "Unknown project overview analysis error."]
      });
      throw new ProjectDnaError(`Project overview analysis failed. Fallback saved to ${fallbackPath}. Log saved to ${logPath}.`);
    }
  }
  async promptForOverview(existingContent) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const prompt = existingContent.trim().length > 0 ? "Project overview already exists. Type a new overview, or press Enter to skip AI analysis:\n" : "Enter the project overview (business and technical description). Press Enter to skip.\n";
      const answer = await rl.question(prompt);
      return answer;
    } finally {
      rl.close();
    }
  }
  async ensureProjectDnaInitialized(pdnaDir) {
    if (!await fs6.pathExists(pdnaDir)) {
      throw new ProjectDnaError("Project DNA has not been initialized. Run `pdna init` before adding a project overview.");
    }
    const missingFiles = [];
    for (const fileName of REQUIRED_PROJECT_DNA_FILES) {
      if (!await fs6.pathExists(path10.join(pdnaDir, fileName))) {
        missingFiles.push(fileName);
      }
    }
    if (missingFiles.length > 0) {
      throw new ProjectDnaError(
        `Project DNA initialization is incomplete. Run \`pdna init\` before adding a project overview. Missing: ${missingFiles.join(", ")}`
      );
    }
  }
  async loadContextBundle(pdnaDir) {
    const scannerFacts = await this.readRequiredJson(pdnaDir, "scanner-report.json");
    return {
      scannerFacts,
      frameworkDetectionResults: scannerFacts.frameworkDetection ?? scannerFacts.detectedFrameworks,
      technologyDetectionResults: scannerFacts.technologyDetection ?? scannerFacts.technologies,
      architectureContext: await this.readRequiredJson(pdnaDir, "architecture.json"),
      dependencyContext: await this.readRequiredJson(pdnaDir, "dependencies.json"),
      businessContext: await this.readRequiredJson(pdnaDir, "business-context.json"),
      domainContext: await this.readRequiredJson(pdnaDir, "domain-context.json"),
      codingRules: await this.readRequiredJson(pdnaDir, "coding-rules.json"),
      securityRules: await this.readRequiredJson(pdnaDir, "security-rules.json"),
      apiConventions: await this.readRequiredJson(pdnaDir, "api-conventions.json"),
      decisionLog: await this.readRequiredJson(pdnaDir, "decision-log.json")
    };
  }
  async readRequiredJson(pdnaDir, fileName) {
    try {
      const value = await fs6.readJson(path10.join(pdnaDir, fileName));
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
      }
      throw new ProjectDnaError(`Invalid ${fileName}: expected a JSON object.`);
    } catch (error) {
      if (error instanceof ProjectDnaError) {
        throw error;
      }
      throw new ProjectDnaError(`Unable to load ${fileName}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  deriveBusinessContext(current, insights) {
    const next = { ...this.asObject(current) };
    const businessDomains = this.unique(insights.businessDomains.map((domain) => domain.name));
    if ("projectName" in next || !("domain" in next)) {
      next.projectName = this.nonEmptyString(next.projectName) ?? insights.project.name;
    }
    if ("summary" in next || !("domain" in next)) {
      next.summary = insights.businessIntent.overview || insights.summary;
    }
    if ("domain" in next) {
      next.domain = businessDomains[0] ?? this.nonEmptyString(next.domain) ?? "Unknown";
    }
    if ("goals" in next) {
      next.goals = insights.businessIntent.goals;
    }
    if ("domains" in next || !("domain" in next)) {
      next.domains = businessDomains;
    }
    if ("generatedAt" in next) {
      next.generatedAt = insights.generatedAt;
    }
    if ("createdAt" in next) {
      next.createdAt = insights.generatedAt;
    }
    return next;
  }
  deriveDomainContext(current, insights) {
    const next = { ...this.asObject(current) };
    const domainNames = this.unique([
      ...insights.businessDomains.map((domain) => domain.name),
      ...insights.technicalDomains.map((domain) => domain.name)
    ]);
    if ("projectName" in next) {
      next.projectName = this.nonEmptyString(next.projectName) ?? insights.project.name;
    }
    if ("domains" in next || Object.keys(next).length === 0) {
      next.domains = domainNames;
    }
    if ("concepts" in next) {
      next.concepts = this.buildDomainConcepts(insights);
    }
    if ("modules" in next && Array.isArray(next.modules) && next.modules.length === 0) {
      next.modules = insights.importantModules.map((module) => ({ name: module.name, reason: module.reason }));
    }
    if ("generatedAt" in next) {
      next.generatedAt = insights.generatedAt;
    }
    if ("createdAt" in next) {
      next.createdAt = insights.generatedAt;
    }
    return next;
  }
  buildDomainConcepts(insights) {
    return [...insights.businessDomains, ...insights.technicalDomains].map((domain) => ({
      name: domain.name,
      description: domain.description
    }));
  }
  async writeMarkdownLog(pdnaDir, input) {
    const logsDir = path10.join(pdnaDir, "logs", "project-overview");
    await fs6.ensureDir(logsDir);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const fileName = `${timestamp.replace(/[:.]/g, "-")}.md`;
    const logPath = path10.join(logsDir, fileName);
    const failureSection = input.failureDetails?.length ? ["## Failure Details", ...input.failureDetails.map((detail) => `- ${detail}`), ""].join("\n") : "";
    const markdown = [
      "# Project Overview Intelligence Run",
      "",
      `- Workflow start: ${input.startedAt}`,
      `- Log written: ${timestamp}`,
      `- Provider: ${input.provider} (${input.providerId})`,
      `- Validation result: ${input.validationResult}`,
      "",
      "## Input Overview Summary",
      input.overviewSummary || "(empty overview summary)",
      "",
      "## Condensed Prompt Sent to Fireworks",
      "````markdown",
      this.truncate(input.promptPackage.markdown, 12e3),
      "````",
      "",
      "## Raw Response Summary",
      "```json",
      this.truncate(input.rawResponseSummary, 8e3),
      "```",
      "",
      "## Saved Files",
      ...input.savedFiles.map((filePath) => `- ${filePath}`),
      "",
      failureSection
    ].join("\n");
    await fs6.writeFile(logPath, markdown, "utf8");
    return logPath;
  }
  summarizeJson(value) {
    return JSON.stringify(value, null, 2);
  }
  truncate(value, maxLength) {
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength - 32)}
...truncated for markdown log...`;
  }
  asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  nonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value : void 0;
  }
  unique(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
};

// src/application/prompt.use-case.ts
import fs8 from "fs-extra";
import path12 from "path";
import readline2 from "readline/promises";

// src/prompt/prompt-persistence.service.ts
import fs7 from "fs-extra";
import path11 from "path";
var PromptPersistenceService = class {
  async save(pdnaDir, result, promptPackage, size) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const fileStamp = timestamp.replace(/[:.]/g, "-");
    const promptsDir = path11.join(pdnaDir, "prompts");
    const logsDir = path11.join(pdnaDir, "logs", "prompt");
    await fs7.ensureDir(promptsDir);
    await fs7.ensureDir(logsDir);
    const promptPath = path11.join(promptsDir, `${fileStamp}-${result.source.mode}.md`);
    const jsonPath = path11.join(promptsDir, `${fileStamp}-${result.source.mode}.json`);
    const logPath = path11.join(logsDir, `${fileStamp}-${result.source.mode}.md`);
    await fs7.writeFile(promptPath, result.enrichedPrompt.markdown, "utf8");
    await fs7.writeJson(jsonPath, result, { spaces: 2 });
    await fs7.writeFile(logPath, this.renderLog(timestamp, result, promptPath, jsonPath, promptPackage, size), "utf8");
    return { promptPath, logPath, jsonPath };
  }
  async saveFailure(pdnaDir, input) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const fileStamp = timestamp.replace(/[:.]/g, "-");
    const promptsDir = path11.join(pdnaDir, "prompts");
    const logsDir = path11.join(pdnaDir, "logs", "prompt");
    await fs7.ensureDir(promptsDir);
    await fs7.ensureDir(logsDir);
    const fallbackPath = path11.join(promptsDir, `${fileStamp}-${input.mode}.failed.json`);
    const logPath = path11.join(logsDir, `${fileStamp}-${input.mode}.failed.md`);
    await fs7.writeJson(fallbackPath, {
      generatedAt: timestamp,
      providerId: input.providerId,
      userRequest: input.request,
      validationIssues: input.issues,
      payload: input.payload
    }, { spaces: 2 });
    await fs7.writeFile(logPath, this.renderFailureLog(timestamp, input, fallbackPath), "utf8");
    return { fallbackPath, logPath };
  }
  renderLog(timestamp, result, promptPath, jsonPath, promptPackage, size) {
    return [
      "# Project DNA Prompt Run",
      "",
      `- Workflow start: ${timestamp}`,
      `- Provider: ${result.generator.provider}`,
      `- Model: ${result.generator.model}`,
      `- Mode: ${result.source.mode}`,
      `- User request summary: ${this.summarize(result.source.userRequest)}`,
      `- Selected domains: ${result.selectedDomains.length > 0 ? result.selectedDomains.map((domain) => domain.name).join(", ") : "(none)"}`,
      `- Selected artifacts: ${result.source.includedArtifacts.join(", ")}`,
      `- Security included: ${result.source.securityIncluded}`,
      `- Prompt size target: min ${size.minChars}, max ${size.maxChars}, soft overage ${size.softOverage}`,
      `- Generated output location: ${promptPath}`,
      `- Generated JSON location: ${jsonPath}`,
      `- Generated characters: ${result.enrichedPrompt.markdown.length}`,
      "",
      "## Condensed Prompt Sent to Fireworks",
      "````markdown",
      this.truncate(promptPackage.markdown, 12e3),
      "````",
      "",
      "## Missing Context",
      ...result.enrichedPrompt.missingContext.length > 0 ? result.enrichedPrompt.missingContext.map((item) => `- ${item}`) : ["- None detected."],
      "",
      "## Warnings",
      ...result.enrichedPrompt.warnings.length > 0 ? result.enrichedPrompt.warnings.map((item) => `- ${item}`) : ["- None."],
      ""
    ].join("\n");
  }
  renderFailureLog(timestamp, input, fallbackPath) {
    return [
      "# Project DNA Prompt Run Failed",
      "",
      `- Workflow start: ${timestamp}`,
      `- Provider: ${input.providerId}`,
      `- Mode: ${input.mode}`,
      `- User request summary: ${this.summarize(input.request)}`,
      `- Prompt size target: min ${input.size.minChars}, max ${input.size.maxChars}, soft overage ${input.size.softOverage}`,
      `- Fallback output location: ${fallbackPath}`,
      "",
      "## Validation Issues",
      ...input.issues.length > 0 ? input.issues.map((issue) => `- ${issue}`) : ["- Unknown validation issue."],
      "",
      "## Condensed Prompt Sent to Fireworks",
      "````markdown",
      this.truncate(input.promptPackage.markdown, 12e3),
      "````",
      ""
    ].join("\n");
  }
  summarize(value) {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}...`;
  }
  truncate(value, maxLength) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 32)}
...truncated for markdown log...`;
  }
};

// src/application/prompt.use-case.ts
var REQUIRED_PROMPT_FILES = [
  "dependencies.json",
  "business-context.json",
  "domain-context.json",
  "coding-rules.json",
  "api-conventions.json",
  "decision-log.json",
  "scanner-report.json",
  "architecture-insights.json"
];
var DEFAULT_SIZE = {
  minChars: 1400,
  maxChars: 5e3,
  softOverage: 600
};
var PromptUseCase = class {
  constructor(validationService = new ProjectValidationService(), aiService = new PDNAAIService(new FireworksService()), promptBuilder = new PromptBuilder(), persistenceService = new PromptPersistenceService()) {
    this.validationService = validationService;
    this.aiService = aiService;
    this.promptBuilder = promptBuilder;
    this.persistenceService = persistenceService;
  }
  validationService;
  aiService;
  promptBuilder;
  persistenceService;
  async execute(projectRoot, options = {}) {
    const absoluteRoot = path12.resolve(projectRoot);
    await this.validationService.validateWorkspace(absoluteRoot);
    const pdnaDir = path12.join(absoluteRoot, ".pdna");
    await this.ensureProjectDnaInitialized(pdnaDir, Boolean(options.includeSecurity));
    const request = await this.resolveRequest(options.request);
    if (request.trim().length === 0) {
      throw new ProjectDnaError("No prompt request was provided.");
    }
    const mode = this.resolveMode(options.mode);
    const size = this.resolveSize(options);
    const includeSecurity = Boolean(options.includeSecurity);
    const knowledgeBase = await this.loadKnowledgeBase(pdnaDir, includeSecurity);
    const buildInput = {
      knowledgeBase,
      request,
      mode,
      size,
      includeSecurity,
      metadata: {
        projectRoot: absoluteRoot,
        projectDnaDir: pdnaDir
      }
    };
    const promptPackage = this.promptBuilder.build(buildInput);
    try {
      const enrichment = await this.aiService.enrichPrompt({
        ...buildInput,
        promptPackage
      });
      const persistence = await this.persistenceService.save(pdnaDir, enrichment, promptPackage, size);
      return {
        promptPath: persistence.promptPath,
        logPath: persistence.logPath,
        jsonPath: persistence.jsonPath,
        mode,
        charCount: enrichment.enrichedPrompt.markdown.length,
        selectedDomains: enrichment.selectedDomains.map((domain) => domain.name),
        status: "updated"
      };
    } catch (error) {
      if (error instanceof AIProviderValidationError) {
        const failure = await this.persistenceService.saveFailure(pdnaDir, {
          mode,
          request,
          providerId: error.providerId,
          payload: error.payload,
          issues: error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
          promptPackage,
          size
        });
        return {
          promptPath: failure.fallbackPath,
          logPath: failure.logPath,
          mode,
          charCount: 0,
          selectedDomains: [],
          status: "failed"
        };
      }
      throw error;
    }
  }
  async resolveRequest(request) {
    if (typeof request === "string" && request.trim().length > 0) {
      return request.trim();
    }
    const rl = readline2.createInterface({ input: process.stdin, output: process.stdout });
    try {
      return (await rl.question("Describe the request to turn into a Project DNA prompt:\n")).trim();
    } finally {
      rl.close();
    }
  }
  resolveMode(mode) {
    if (!mode) return "feature";
    if (PROMPT_MODES.includes(mode)) return mode;
    throw new ProjectDnaError(`Invalid prompt mode "${mode}". Expected one of: ${PROMPT_MODES.join(", ")}.`);
  }
  resolveSize(options) {
    const minChars = this.positiveInteger(options.minChars, DEFAULT_SIZE.minChars);
    const maxChars = this.positiveInteger(options.maxChars, DEFAULT_SIZE.maxChars);
    const softOverage = this.nonNegativeInteger(options.softOverage, DEFAULT_SIZE.softOverage);
    if (maxChars < minChars) {
      throw new ProjectDnaError("Invalid prompt size options: --max-chars must be greater than or equal to --min-chars.");
    }
    return { minChars, maxChars, softOverage };
  }
  async ensureProjectDnaInitialized(pdnaDir, includeSecurity) {
    if (!await fs8.pathExists(pdnaDir)) {
      throw new ProjectDnaError("Project DNA has not been initialized. Run `pdna init` before generating prompts.");
    }
    const missingFiles = [];
    for (const fileName of REQUIRED_PROMPT_FILES) {
      if (!await fs8.pathExists(path12.join(pdnaDir, fileName))) {
        missingFiles.push(fileName);
      }
    }
    if (includeSecurity && !await fs8.pathExists(path12.join(pdnaDir, "security-rules.json"))) {
      missingFiles.push("security-rules.json");
    }
    if (missingFiles.length > 0) {
      throw new ProjectDnaError(
        `Project DNA initialization is incomplete. Run \`pdna init\` before generating prompts. Missing: ${missingFiles.join(", ")}`
      );
    }
  }
  async loadKnowledgeBase(pdnaDir, includeSecurity) {
    return {
      dependencies: await this.readRequiredJson(pdnaDir, "dependencies.json"),
      businessContext: await this.readRequiredJson(pdnaDir, "business-context.json"),
      domainContext: await this.readRequiredJson(pdnaDir, "domain-context.json"),
      codingRules: await this.readRequiredJson(pdnaDir, "coding-rules.json"),
      securityRules: includeSecurity ? await this.readRequiredJson(pdnaDir, "security-rules.json") : {},
      apiConventions: await this.readRequiredJson(pdnaDir, "api-conventions.json"),
      decisionLog: await this.readRequiredJson(pdnaDir, "decision-log.json"),
      scannerReport: await this.readRequiredJson(pdnaDir, "scanner-report.json"),
      architectureInsights: await this.readRequiredJson(pdnaDir, "architecture-insights.json")
    };
  }
  async readRequiredJson(pdnaDir, fileName) {
    try {
      const value = await fs8.readJson(path12.join(pdnaDir, fileName));
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
      }
      throw new ProjectDnaError(`Invalid ${fileName}: expected a JSON object.`);
    } catch (error) {
      if (error instanceof ProjectDnaError) {
        throw error;
      }
      throw new ProjectDnaError(`Unable to load ${fileName}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  positiveInteger(value, fallback) {
    if (value === void 0) return fallback;
    if (Number.isInteger(value) && value > 0) return value;
    throw new ProjectDnaError("Prompt size options must be positive integers.");
  }
  nonNegativeInteger(value, fallback) {
    if (value === void 0) return fallback;
    if (Number.isInteger(value) && value >= 0) return value;
    throw new ProjectDnaError("Prompt soft overage must be a non-negative integer.");
  }
};

// src/core/project-dna-service.ts
var ProjectDnaService = class {
  constructor(initializeProjectUseCase = new InitializeProjectUseCase(), askContextUseCase = new AskContextUseCase(), validateOutputUseCase = new ValidateOutputUseCase(), projectOverviewUseCase = new ProjectOverviewUseCase(), promptUseCase = new PromptUseCase(), logger = new Logger()) {
    this.initializeProjectUseCase = initializeProjectUseCase;
    this.askContextUseCase = askContextUseCase;
    this.validateOutputUseCase = validateOutputUseCase;
    this.projectOverviewUseCase = projectOverviewUseCase;
    this.promptUseCase = promptUseCase;
    this.logger = logger;
  }
  initializeProjectUseCase;
  askContextUseCase;
  validateOutputUseCase;
  projectOverviewUseCase;
  promptUseCase;
  logger;
  async initialize(projectRoot) {
    this.logger.info("Initializing Project DNA...");
    return this.initializeProjectUseCase.execute(projectRoot);
  }
  async ask(projectRoot) {
    this.logger.info(`Asking Project DNA for context in ${projectRoot}`);
    return this.askContextUseCase.execute(projectRoot);
  }
  async validate(projectRoot) {
    this.logger.info(`Validating Project DNA state in ${projectRoot}`);
    const result = await this.validateOutputUseCase.execute(projectRoot);
    return result.summary;
  }
  async projectOverview(projectRoot) {
    this.logger.info(`Collecting project overview for ${projectRoot}`);
    const result = await this.projectOverviewUseCase.execute(projectRoot);
    if (result.status === "skipped") {
      return "Project overview skipped. No Fireworks request was sent.";
    }
    if (result.status === "failed") {
      return "Project overview stored, but Fireworks response failed validation. Fallback and markdown log were saved.";
    }
    return "Project overview stored and architecture insights updated successfully.";
  }
  async prompt(projectRoot, options) {
    this.logger.info(`Building Project DNA prompt for ${projectRoot}`);
    const result = await this.promptUseCase.execute(projectRoot, options);
    const domains = result.selectedDomains.length > 0 ? result.selectedDomains.join(", ") : "no specific domain selected";
    return `Prompt generated successfully at ${result.promptPath}. Log saved at ${result.logPath}. Mode: ${result.mode}. Domains: ${domains}. Characters: ${result.charCount}.`;
  }
};

// src/commands/ask.ts
async function runAskCommand(projectRoot) {
  const service = new ProjectDnaService();
  return service.ask(projectRoot);
}

// src/commands/init.ts
async function runInitCommand(projectRoot) {
  const service = new ProjectDnaService();
  await service.initialize(projectRoot);
}

// src/commands/project-overview.ts
async function runProjectOverviewCommand(projectRoot) {
  const service = new ProjectDnaService();
  return service.projectOverview(projectRoot);
}

// src/commands/prompt.ts
async function runPromptCommand(projectRoot, options) {
  const service = new ProjectDnaService();
  return service.prompt(projectRoot, options);
}

// src/commands/validate.ts
async function runValidateCommand(projectRoot) {
  const service = new ProjectDnaService();
  return service.validate(projectRoot);
}

// src/cli/program.ts
function parseIntegerOption(value) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Expected an integer option value, received: ${value}`);
  }
  return Number.parseInt(value, 10);
}
function createProgram() {
  const program2 = new Command();
  const logger = new Logger();
  program2.name("pdna").description("Project DNA CLI foundation for architecture governance").version("0.1.0");
  program2.command("init").description("Initialize Project DNA memory files in the current project").action(async () => {
    try {
      await runInitCommand(process.cwd());
      logger.success("Project DNA initialization complete.");
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Failed to initialize Project DNA");
      process.exitCode = 1;
    }
  });
  program2.command("ask").description("Ask Project DNA for architectural context").action(async () => {
    try {
      const response = await runAskCommand(process.cwd());
      logger.info(response);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Failed to ask Project DNA");
      process.exitCode = 1;
    }
  });
  program2.command("validate").description("Validate current Project DNA state").action(async () => {
    try {
      const response = await runValidateCommand(process.cwd());
      logger.info(response);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Failed to validate Project DNA");
      process.exitCode = 1;
    }
  });
  program2.command("prompt").description("Generate a project-aware prompt for an external AI coding assistant").argument("[request...]", "Natural language request to enrich with Project DNA context").option("--mode <mode>", "Prompt mode: fix, feature, refactor, or explain", "feature").option("--min-chars <number>", "Minimum target character count", parseIntegerOption).option("--max-chars <number>", "Maximum target character count", parseIntegerOption).option("--soft-overage <number>", "Allowed character overflow beyond max-chars", parseIntegerOption).action(async (requestParts, options) => {
    try {
      const response = await runPromptCommand(process.cwd(), {
        request: requestParts.join(" "),
        mode: options.mode,
        minChars: options.minChars,
        maxChars: options.maxChars,
        softOverage: options.softOverage
      });
      logger.success(response);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Failed to generate Project DNA prompt");
      process.exitCode = 1;
    }
  });
  const projectCommand = program2.command("project").description("Manage Project DNA project knowledge");
  projectCommand.command("overview").description("Capture a product or technical overview and enrich Project DNA intelligence").action(async () => {
    try {
      const response = await runProjectOverviewCommand(process.cwd());
      logger.success(response);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Failed to collect project overview");
      process.exitCode = 1;
    }
  });
  return program2;
}

// src/index.ts
var program = createProgram();
program.parseAsync(process.argv);
//# sourceMappingURL=index.js.map