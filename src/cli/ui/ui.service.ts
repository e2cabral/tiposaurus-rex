import { injectable } from 'inversify';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';
import { APP_VERSION } from '../../version.js';

@injectable()
export class UIService {
  private spinner: Ora | null = null;

  showBanner(): void {
    console.log('\n' + chalk.cyan(figlet.textSync('Tiposaurus Rex', { font: 'Standard' })));
    console.log(chalk.blue(' TypeScript type generator for MySQL SQL queries'));
    console.log(chalk.blue(` Version ${APP_VERSION}`) + '\n');
  }

  info(message: string): void {
    console.log(chalk.blue('[info]'), message);
  }

  success(message: string): void {
    console.log(chalk.green('[ok]'), message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('[warn]'), message);
  }

  error(message: string): void {
    console.log(chalk.red('[error]'), message);
  }

  startSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
      return;
    }

    this.spinner = ora({
      text: message,
      color: 'cyan',
    }).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success = true, message?: string): void {
    if (!this.spinner) {
      return;
    }

    if (success) {
      this.spinner.succeed(message);
    } else {
      this.spinner.fail(message);
    }

    this.spinner = null;
  }

  showBox(title: string, message: string): void {
    console.log(
      boxen(message, {
        title,
        padding: 1,
        margin: 1,
        borderColor: 'blue',
        borderStyle: 'round',
      })
    );
  }

  showProgress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.floor(percentage / 5);
    const bar = '#'.repeat(filled) + '-'.repeat(20 - filled);

    process.stdout.write(`\r${chalk.cyan(message)} [${bar}] ${percentage}% (${current}/${total})`);

    if (current === total) {
      process.stdout.write('\n');
    }
  }
}
