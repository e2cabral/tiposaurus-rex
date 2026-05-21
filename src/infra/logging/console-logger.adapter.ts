import { injectable } from 'inversify';
import { LoggerService } from '../../core/domain/interfaces/logger.interface.js';
import chalk from 'chalk';

@injectable()
export class ConsoleLoggerAdapter implements LoggerService {
  private isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  debug(message: string, context?: Record<string, any>): void {
    if (this.isVerbose) {
      this.log('DEBUG', chalk.gray(message), context);
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('INFO', chalk.blue(message), context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('WARN', chalk.yellow(message), context);
  }

  error(message: string, error?: Error | string, context?: Record<string, any>): void {
    const errorMsg = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    this.log('ERROR', chalk.red(message), {
      ...context,
      error: errorMsg,
      stack
    });
  }

  private log(level: string, message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    
    if (this.isVerbose || level === 'ERROR' || level === 'WARN' || level === 'INFO') {
      if (process.env.NODE_ENV === 'production' && !this.isVerbose && (level === 'DEBUG')) {
          return;
      }
      
      console.log(`[${timestamp}] [${level}] ${message} ${context ? JSON.stringify(context) : ''}`);
    }
  }
}
