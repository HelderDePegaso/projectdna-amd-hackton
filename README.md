# Project DNA

Project DNA (`pdna`) is a TypeScript CLI for AI-assisted architectural governance. It scans a software project, builds a local architectural memory inside `.pdna`, enriches that memory with Fireworks AI, and generates project-aware prompts for external AI coding assistants.

Its purpose is to preserve the architectural DNA of a codebase and reduce hallucinations in AI-assisted development workflows. Instead of sending isolated requests to an AI model, Project DNA first builds a local knowledge base containing architecture, dependencies, business context, domains, coding rules, API conventions, decisions, and risks.

## What Project DNA Does

* Scans the current project structure and metadata.
* Creates a local knowledge base in `.pdna`.
* Stores technical and business context for the project.
* Sends consolidated context to Fireworks AI for reasoning.
* Updates structured architectural insights, business context, and domain context.
* Generates enriched prompts for new features, bug fixes, refactors, and explanations.
* Saves prompts, structured responses, and logs locally for traceability.

## Requirements

* Node.js `>=22`
* npm
* A Fireworks API key
* The Fireworks base URL
* The Fireworks model to use

Project DNA reads configuration from a `.env` file in the current project root or directly from system environment variables.

Prefer the `PDNA_` prefix:

```env
PDNA_FIREWORKS_API_KEY="your_fireworks_api_key"
PDNA_FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1"
PDNA_FIREWORKS_MODEL="accounts/fireworks/models/glm-5p2"
```

Legacy names are also supported by the current environment service:

```env
FIREWORKS_API_KEY="your_fireworks_api_key"
FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1"
FIREWORKS_MODEL="accounts/fireworks/models/glm-5p2"
```

Optional configuration:

```env
PDNA_FIREWORKS_TIMEOUT_MS="60000"
PDNA_FIREWORKS_TEMPERATURE="0.2"
```

Never commit a real API key to the repository.

## Installation

Install dependencies and build the CLI:

```bash
npm install
npm run build
```

Run locally after building:

```bash
node dist/index.js --help
```

To use the `pdna` command directly during development:

```bash
npm link
pdna --help
```

## Main Workflow

Run Project DNA from the root of the project you want to analyze.

### 1. Initialize Project DNA

```bash
pdna init
```

This command scans the current project and creates the `.pdna` folder. It generates the initial memory files used by the rest of the workflow:

* `.pdna/architecture.json`
* `.pdna/dependencies.json`
* `.pdna/business-context.json`
* `.pdna/domain-context.json`
* `.pdna/coding-rules.json`
* `.pdna/security-rules.json`
* `.pdna/api-conventions.json`
* `.pdna/decision-log.json`
* `.pdna/scanner-report.json`
* `.pdna/architecture-insights.json`
* `.pdna/project-overview.md`

After this step, the project already has a local architectural memory. The richer intelligence comes from the project overview and prompt workflows.

### 2. Register the Project Overview

```bash
pdna project overview
```

This command asks for a technical and business overview of the project. The overview should explain what the project does, which problems it solves, which modules matter most, which architectural decisions are important, and any relevant domain context.

After receiving the overview, Project DNA:

* saves the text to `.pdna/project-overview.md`;
* combines that text with the existing `.pdna` files;
* sends the context package to Fireworks AI;
* validates the structured AI response;
* updates the enriched context files.

Files updated by this workflow:

* `.pdna/architecture-insights.json`
* `.pdna/business-context.json`
* `.pdna/domain-context.json`

Processing logs are saved in:

```text
.pdna/logs/project-overview/
```

This step is important because `pdna prompt` uses `architecture-insights.json` to generate richer architecture-aware prompts.

### 3. Generate a Project-Aware Prompt

```bash
pdna prompt "Add authentication to the API using the existing architecture"
```

The `prompt` command accepts a natural-language request, consults the memory stored in `.pdna`, selects the most relevant domains and artifacts, sends a condensed context package to Fireworks AI, and saves a final prompt ready to use in another AI coding assistant.

Generated results are saved in:

```text
.pdna/prompts/
.pdna/logs/prompt/
```

Available modes:

```bash
pdna prompt --mode feature "Add a new billing module"
pdna prompt --mode fix "Fix token refresh failures"
pdna prompt --mode refactor "Refactor the scanner into smaller services"
pdna prompt --mode explain "Explain how the architecture is organized"
```

Mode behavior:

* `feature`: creates a prompt focused on adding new functionality.
* `fix`: creates a prompt focused on bug fixes or incorrect behavior.
* `refactor`: creates a prompt focused on restructuring or improving existing code without changing functional intent.
* `explain`: creates a prompt focused on explaining architecture, modules, dependencies, or project decisions.

You can also control the expected size of the generated prompt:

```bash
pdna prompt --min-chars 1400 --max-chars 5000 --soft-overage 600 "Improve validation errors"
```

If the request is not passed as a command-line argument, the CLI will ask interactively what should be turned into a prompt.

## Other Commands

```bash
pdna ask
```

Returns a short summary of the initialized project context.

```bash
pdna validate
```

Checks whether Project DNA has been initialized and returns the current validation summary.

```bash
pdna --help
pdna <command> --help
```

Shows available commands and the options supported by each one.

## Docker

The project includes a `Dockerfile`, so it can also be used as a containerized CLI. If you are using a published Docker image, replace `projectdna:local` with the image name or registry reference.

Build a local image:

```bash
docker build -t projectdna:local .
```

Run `pdna init` against the current directory using environment variables:

```bash
docker run --rm -it \
  -v "$PWD:/project" \
  -w /project \
  -e PDNA_FIREWORKS_API_KEY="your_fireworks_api_key" \
  -e PDNA_FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1" \
  -e PDNA_FIREWORKS_MODEL="accounts/fireworks/models/glm-5p2" \
  --entrypoint node \
  projectdna:local \
  /app/dist/index.js init
```

You can also use a `.env` file:

```bash
docker run --rm -it \
  -v "$PWD:/project" \
  -w /project \
  --env-file .env \
  --entrypoint node \
  projectdna:local \
  /app/dist/index.js project overview
```

```bash
docker run --rm -it \
  -v "$PWD:/project" \
  -w /project \
  --env-file .env \
  --entrypoint node \
  projectdna:local \
  /app/dist/index.js prompt --mode feature "Add a new command"
```

The image keeps the CLI at `/app/dist/index.js`. Because of that, when you mount another project at `/project`, the examples above use `--entrypoint node` and call `/app/dist/index.js` explicitly.

## Development

Run in development mode:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run type checking:

```bash
npm run typecheck
```

## Project Memory

The `.pdna` folder is the local memory of the project. It is designed to be readable and versionable when that makes sense for the team.

Typical workflow:

1. Run `pdna init` when adding Project DNA to a project.
2. Run `pdna project overview` to record or update the technical and business context.
3. Run `pdna prompt` whenever you need a high-quality prompt for an AI coding assistant.
4. Review outputs in `.pdna/prompts` and logs in `.pdna/logs`.
