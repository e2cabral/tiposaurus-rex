import { injectable } from 'inversify';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';

@injectable()
export class UIService {
  private spinner: Ora | null = null;

  showBanner(): void {
    console.log('\n' + chalk.cyan(figlet.textSync('Tiposaurus Rex', { font: 'Standard' })));
    console.log(chalk.blue(' Gerador de tipos TypeScript para consultas SQL em MySQL'));
    console.log(chalk.blue(' Versão 0.1.22') + '\n');
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✖'), message);
  }

  startSpinner(message: string): void {
    this.spinner = ora({
      text: message,
      color: 'cyan'
    }).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success = true, message?: string): void {
    if (!this.spinner) return;

    if (success) {
      this.spinner.succeed(message);
    } else {
      this.spinner.fail(message);
    }
    this.spinner = null;
  }

  showBox(title: string, message: string): void {
    console.log(boxen(message, {
      title,
      padding: 1,
      margin: 1,
      borderColor: 'blue',
      borderStyle: 'round'
    }));
  }

  showProgress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));

    process.stdout.write(`\r${chalk.cyan(message)} [${bar}] ${percentage}% (${current}/${total})`);

    if (current === total) {
      process.stdout.write('\n');
    }
  }
}