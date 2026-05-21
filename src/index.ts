import 'reflect-metadata';
import { Command } from 'commander';
import { container } from './core/di/container.js';
import { GenerateCommand } from './cli/commands/generate.command.js';
import { InitCommand } from './cli/commands/init.command.js';
import { UIService } from './cli/ui/ui.service.js';
import { ConfigService } from './core/services/config.service.js';
import { APP_VERSION } from './version.js';
import { bindDatabaseConfig } from './core/di/database-config.js';

async function main(): Promise<void> {
  const program = new Command();
  const ui = container.get<UIService>(UIService);

  try {
    program
      .name('tiposaurus-rex')
      .description('Type generator for MySQL SQL queries')
      .version(APP_VERSION)
      .option('-v, --verbose', 'Show detailed execution logs', false);

    program
      .command('generate')
      .description('Generates TypeScript types from SQL files')
      .requiredOption('-c, --config <path>', 'Path to the configuration file', 'tiposaurus.config.json')
      .option('-o, --output <dir>', 'Output directory for generated files')
      .option('-t, --templates <dir>', 'Directory with generation templates', '.templates')
      .option('-w, --watch', 'Monitors changes in SQL files and generates types automatically', false)
      .action(async (options) => {
        try {
          const configService: ConfigService = container.get(ConfigService);
          const config = await configService.loadConfig(options.config);

          bindDatabaseConfig(config);

          const generateCommand = container.get<GenerateCommand>(GenerateCommand);
          await generateCommand.execute(options);
        } catch (error) {
          ui.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });

    program
      .command('init')
      .description('Initializes a new Tiposaurus Rex project')
      .option('-c, --config <path>', 'Path to save the configuration file', 'tiposaurus.config.json')
      .action(async (options) => {
        try {
          const initCommand = container.get<InitCommand>(InitCommand);
          await initCommand.execute(options.config);
        } catch (error) {
          ui.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });

    await program.parseAsync();
  } catch (error) {
    ui.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
