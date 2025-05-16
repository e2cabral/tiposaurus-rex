import 'reflect-metadata';
import { Command } from 'commander';
import { container } from './core/di/container';
import { GenerateCommand } from './cli/commands/generate.command';
import { InitCommand } from './cli/commands/init.command';
import { UIService } from './cli/ui/ui.service';
import { DatabaseConfig } from './core/domain/interfaces/database.interface';

function setupDatabaseConfig(config: any): void {
  container.bind<DatabaseConfig>('DatabaseConfig').toConstantValue({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port
  });
}

async function main(): Promise<void> {
  const program = new Command();
  const ui = container.get<UIService>(UIService);

  try {
    program
      .name('tiposaurus-rex')
      .description('Gerador de tipos para consultas SQL em MySQL')
      .version('0.1.0');

    program
      .command('generate')
      .description('Gera tipos TypeScript a partir de arquivos SQL')
      .requiredOption('-c, --config <path>', 'Caminho para o arquivo de configuração', 'tiposaurus.config.json')
      .option('-o, --output <dir>', 'Diretório de saída para os arquivos gerados')
      .option('-t, --templates <dir>', 'Diretório com templates de geração', 'templates')
      .action(async (options) => {
        try {
          const configService = container.get(ConfigService);
          const config = await configService.loadConfig(options.config);

          setupDatabaseConfig(config);

          const generateCommand = container.get<GenerateCommand>(GenerateCommand);
          await generateCommand.execute(options);
        } catch (error) {
          ui.error(`Erro: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });

    program
      .command('init')
      .description('Inicializa um novo projeto Tiposaurus Rex')
      .option('-c, --config <path>', 'Caminho para salvar o arquivo de configuração', 'tiposaurus.config.json')
      .action(async (options) => {
        try {
          const initCommand = container.get<InitCommand>(InitCommand);
          await initCommand.execute(options.config);
        } catch (error) {
          ui.error(`Erro: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });

    await program.parseAsync();
  } catch (error) {
    ui.error(`Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

import { ConfigService } from './core/services/config.service';

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});