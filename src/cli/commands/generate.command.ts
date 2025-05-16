import { injectable, inject } from 'inversify';
import path from 'path';
import fs from 'fs/promises';
import * as glob from 'glob';
import { UIService } from '../ui/ui.service';
import { ConfigService } from '@core/services/config.service.js';
import { CodeGeneratorService } from '@core/services/code-generator.service.js';
import { DatabaseConnector } from '@core/domain/interfaces/database.interface.js';
import { SQLParser } from '@core/domain/interfaces/sql.interface.js';
import { AppConfig } from '@core/domain/models/config.model.js';

export interface GenerateCommandOptions {
  config: string;
  output?: string;
  templates?: string;
}

@injectable()
export class GenerateCommand {
  constructor(
    @inject(UIService) private ui: UIService,
    @inject(ConfigService) private configService: ConfigService,
    @inject(CodeGeneratorService) private codeGenerator: CodeGeneratorService,
    @inject('DatabaseConnector') private dbConnector: DatabaseConnector,
    @inject('SQLParser') private sqlParser: SQLParser
  ) {}

  async execute(options: GenerateCommandOptions): Promise<void> {
    try {
      this.ui.showBanner();
      this.ui.info(`Carregando configuração de ${options.config}...`);

      const config = await this.configService.loadConfig(options.config);

      if (options.output) {
        config.outputDir = options.output;
      }

      await this.dbConnector.connect();
      this.ui.success('Conectado ao banco de dados');

      await this.processQueryDirectories(config, options.templates);

      await this.dbConnector.disconnect();
      this.ui.success('Geração de tipos concluída com sucesso!');
    } catch (error) {
      this.ui.error(`Erro ao gerar tipos: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async processQueryDirectories(
    config: AppConfig,
    templatesDir?: string
  ): Promise<void> {
    const templateDir = templatesDir || path.join(process.cwd(), 'templates');

    try {
      await fs.access(templateDir);
    } catch (error) {
      this.ui.error(`Diretório de templates não encontrado: ${templateDir}`);
      this.ui.info('Você pode especificar um diretório de templates usando a opção --templates');
      process.exit(1);
    }

    let totalFiles = 0;
    let processedFiles = 0;

    for (const queryDir of config.queryDirs) {
      const sqlFiles = glob.sync(path.join(queryDir, '**/*.sql'));
      totalFiles += sqlFiles.length;

      if (sqlFiles.length === 0) {
        this.ui.warning(`Nenhum arquivo SQL encontrado em ${queryDir}`);
        continue;
      }

      for (const sqlFile of sqlFiles) {
        this.ui.info(`Processando: ${sqlFile}`);

        try {
          const sqlContent = await fs.readFile(sqlFile, 'utf-8');
          const queries = this.sqlParser.parseFile(sqlContent);

          if (queries.length === 0) {
            this.ui.warning(`Nenhuma consulta encontrada em: ${sqlFile}`);
            continue;
          }

          const outputFile = this.generateOutputPath(queryDir, sqlFile, config.outputDir);

          await this.codeGenerator.generateTypesForQueries(
            queries,
            outputFile,
            templateDir,
            config.customTypes
          );

          this.ui.success(`Tipos gerados em: ${outputFile}`);
          processedFiles++;
        } catch (error) {
          this.ui.error(`Erro ao processar arquivo ${sqlFile}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    if (processedFiles === 0) {
      this.ui.warning('Nenhum arquivo foi processado.');
    } else {
      this.ui.showBox('Resumo', `Arquivos processados: ${processedFiles}/${totalFiles}`);
    }
  }

  private generateOutputPath(queryDir: string, sqlFile: string, outputDir: string): string {
    const fileName = path.basename(sqlFile).replace(/\.sql$/, '.ts');
    return path.join(outputDir, fileName);
  }
}
