import { Command } from 'commander';
import { runAskCommand } from '../commands/ask.js';
import { runInitCommand } from '../commands/init.js';
import { runProjectOverviewCommand } from '../commands/project-overview.js';
import { runPromptCommand } from '../commands/prompt.js';
import { runValidateCommand } from '../commands/validate.js';
import { Logger } from '../utils/logger.js';
import type { PromptMode } from '../prompt/prompt-types.js';

function parseIntegerOption(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Expected an integer option value, received: ${value}`);
  }
  return Number.parseInt(value, 10);
}

export function createProgram(): Command {

  const program = new Command();
  const logger = new Logger();

  program
    .name('pdna')
    .description('Project DNA CLI foundation for architecture governance')
    .version('0.1.0');

  program
    .command('init')
    .description('Initialize Project DNA memory files in the current project')
    .action(async () => {
      try {
        await runInitCommand(process.cwd());
        logger.success('Project DNA initialization complete.');
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to initialize Project DNA');
        process.exitCode = 1;
      }
    });

  program
    .command('ask')
    .description('Ask Project DNA for architectural context')
    .action(async () => {
      try {
        const response = await runAskCommand(process.cwd());
        logger.info(response);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to ask Project DNA');
        process.exitCode = 1;
      }
    });

  program
    .command('validate')
    .description('Validate current Project DNA state')
    .action(async () => {
      try {
        const response = await runValidateCommand(process.cwd());
        logger.info(response);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to validate Project DNA');
        process.exitCode = 1;
      }
    });
  program
    .command('prompt')
    .description('Generate a project-aware prompt for an external AI coding assistant')
    .argument('[request...]', 'Natural language request to enrich with Project DNA context')
    .option('--mode <mode>', 'Prompt mode: fix, feature, refactor, or explain', 'feature')
    .option('--min-chars <number>', 'Minimum target character count', parseIntegerOption)
    .option('--max-chars <number>', 'Maximum target character count', parseIntegerOption)
    .option('--soft-overage <number>', 'Allowed character overflow beyond max-chars', parseIntegerOption)
    .action(async (requestParts: string[], options: { mode?: string; minChars?: number; maxChars?: number; softOverage?: number }) => {
      try {
        const response = await runPromptCommand(process.cwd(), {
          request: requestParts.join(' '),
          mode: options.mode as PromptMode,
          minChars: options.minChars,
          maxChars: options.maxChars,
          softOverage: options.softOverage,
        });
        logger.success(response);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to generate Project DNA prompt');
        process.exitCode = 1;
      }
    });
  const projectCommand = program.command('project').description('Manage Project DNA project knowledge');
  projectCommand
    .command('overview')
    .description('Capture a product or technical overview and enrich Project DNA intelligence')
    .action(async () => {
      try {
        const response = await runProjectOverviewCommand(process.cwd());
        logger.success(response);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Failed to collect project overview');
        process.exitCode = 1;
      }
    });

  return program;
}
