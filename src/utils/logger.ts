import chalk from 'chalk';

export class Logger {
  public info(message: string): void {
    console.log(chalk.cyan(message));
  }

  public success(message: string): void {
    console.log(chalk.green(message));
  }

  public warn(message: string): void {
    console.log(chalk.yellow(message));
  }

  public error(message: string): void {
    console.error(chalk.red(message));
  }
}
