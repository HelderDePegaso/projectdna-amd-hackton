import { Command } from 'commander';
import { runAskCommand } from '../commands/ask.js';
import { runInitCommand } from '../commands/init.js';
import { runValidateCommand } from '../commands/validate.js';
import { Logger } from '../utils/logger.js';

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

  return program;
}
