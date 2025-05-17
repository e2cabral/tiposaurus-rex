import { injectable, inject } from 'inversify';
import path from 'path';
import fs from 'fs/promises';
import * as glob from 'glob';
import { UIService } from '@cli/ui/ui.service';
import { ConfigService } from '@core/services/config.service';
import { CodeGeneratorService } from '@core/services/code-generator.service';
import { DatabaseConnector } from '@core/domain/interfaces/database.interface';
import { SQLParser } from '@core/domain/interfaces/sql.interface';
import { AppConfig } from '@core/domain/models/config.model';

@injectable()
export class GenerateCommand {
  constructor(
    @inject(UIService) private ui: UIService,
    @inject(ConfigService) private configService: ConfigService,
    @inject(CodeGeneratorService) private codeGenerator: CodeGeneratorService,
    @inject('DatabaseConnector') private dbConnector: DatabaseConnector,
    @inject('SQLParser') private sqlParser: SQLParser
  ) {}

  async execute(options: any): Promise<void> {
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

  async processQueryDirectories(config: AppConfig, templatesDir?: string): Promise<void> {
    const templateDir = templatesDir || path.join(process.cwd(), '.templates');

    try {
      await fs.access(templateDir);
    } catch {
      this.ui.error(`Diretório de templates não encontrado: ${templateDir}`);
      this.ui.info('Você pode especificar um diretório de templates usando a opção --templates');
      process.exit(1);
    }

    let totalFiles = 0;
    let processedFiles = 0;

    for (const dir of config.queryDirs) {
      const sqlFiles = glob.sync(path.join(dir, '**/*.sql'));

      if (sqlFiles.length === 0) {
        this.ui.warning(`Nenhum arquivo SQL encontrado em ${dir}`);
        continue;
      }

      totalFiles += sqlFiles.length;

      for (const filePath of sqlFiles) {
        this.ui.info(`Processando: ${filePath}`);

        try {
          let content = await fs.readFile(filePath, 'utf-8');

          content = this.normalizeFileContent(content);
          
          this.ui.info(`Analisando consultas em: ${filePath}`);
          const queries = this.sqlParser.parseFile(content);

          if (queries.length === 0) {
            this.ui.warning(`Nenhuma consulta encontrada em: ${filePath}`);
            continue;
          }

          const outputPath = this.generateOutputPath(dir, filePath, config.outputDir);
          await this.codeGenerator.generateTypesForQueries(
            queries,
            outputPath,
            templateDir,
            config.customTypes
          );

          processedFiles++;
        } catch (error) {
          this.ui.error(`Erro ao processar arquivo ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    if (processedFiles === 0) {
      this.ui.warning('Nenhum arquivo foi processado.');
    } else {
      this.ui.showBox('Resumo', `Arquivos processados: ${processedFiles}/${totalFiles}`);
    }
  }

  private normalizeFileContent(content: string): string {
    content = content.replace(/\r\n/g, '\n');
    content = content.replace(/--\s*@name\s*:\s*/g, '-- @name ');
    content = content.replace(/--\s*@description\s*:\s*/g, '-- @description ');
    content = content.replace(/--\s*@param\s*:\s*/g, '-- @param ');
    content = content.replace(/--\s*@returnType\s*:\s*/g, '-- @returnType ');
    content = content.replace(/--\s*@returnSingle\s*:\s*/g, '-- @returnSingle ');
    content = content.replace(/--\s*@return\s*:/g, '-- @return '); // Adicionada esta linha
    
    console.log('Conteúdo normalizado:');
    console.log(content);
    
    return content;
  }

  private generateOutputPath(sourceDir: string, filePath: string, outputDir: string): string {
    const fileName = path.basename(filePath).replace(/\.sql$/, '.ts');
    return path.join(outputDir, fileName);
  }
}