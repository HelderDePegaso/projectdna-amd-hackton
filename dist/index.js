#!/usr/bin/env node

// src/cli/program.ts
import { Command } from "commander";

// src/memory/memory-service.ts
import path2 from "path";

// src/utils/files.ts
import fs from "fs-extra";
import path from "path";
async function ensureProjectDnaDirectory(projectRoot) {
  const targetDir = path.join(projectRoot, ".project-dna");
  await fs.ensureDir(targetDir);
  return targetDir;
}
async function writeJsonFile(filePath, data) {
  await fs.writeJson(filePath, data, { spaces: 2 });
}

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

// src/memory/memory-service.ts
var MemoryService = class {
  constructor(logger = new Logger()) {
    this.logger = logger;
  }
  logger;
  async initialize(projectRoot) {
    const projectDnaDir = await ensureProjectDnaDirectory(projectRoot);
    const snapshot = {
      version: "1.0.0",
      projectName: path2.basename(projectRoot),
      architecture: {
        summary: "Architecture metadata placeholder for future governance workflows.",
        layers: ["cli", "core", "memory", "context", "providers", "validators"]
      },
      dependencies: ["commander", "zod", "fs-extra"],
      businessContext: {
        domain: "Architecture governance",
        goals: ["Preserve architectural context", "Support future AI integrations"]
      }
    };
    const files = {
      architecture: path2.join(projectDnaDir, "architecture.json"),
      dependencies: path2.join(projectDnaDir, "dependencies.json"),
      businessContext: path2.join(projectDnaDir, "business-context.json")
    };
    await writeJsonFile(files.architecture, snapshot);
    await writeJsonFile(files.dependencies, { dependencies: snapshot.dependencies });
    await writeJsonFile(files.businessContext, snapshot.businessContext);
    this.logger.success(`Initialized Project DNA at ${projectDnaDir}`);
    return files;
  }
};

// src/core/project-dna-service.ts
var ProjectDnaService = class {
  constructor(memoryService = new MemoryService(), logger = new Logger()) {
    this.memoryService = memoryService;
    this.logger = logger;
  }
  memoryService;
  logger;
  async initialize(projectRoot) {
    this.logger.info("Initializing Project DNA...");
    return this.memoryService.initialize(projectRoot);
  }
  async ask(projectRoot) {
    this.logger.info(`Asking Project DNA for context in ${projectRoot}`);
    return "Project DNA placeholder response. Future AI context injection will be implemented here.";
  }
  async validate(projectRoot) {
    this.logger.info(`Validating Project DNA state in ${projectRoot}`);
    return "Project DNA validation placeholder. Future validators will be implemented here.";
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

// src/commands/validate.ts
async function runValidateCommand(projectRoot) {
  const service = new ProjectDnaService();
  return service.validate(projectRoot);
}

// src/cli/program.ts
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
  return program2;
}

// src/index.ts
var program = createProgram();
program.parseAsync(process.argv);
//# sourceMappingURL=index.js.map