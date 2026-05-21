import { injectable, inject } from 'inversify';
import path from 'path';
import * as glob from 'glob';
import {UIService} from "../ui/ui.service.js";
import {ConfigService} from "../../core/services/config.service.js";
import {CodeGeneratorService} from "../../core/services/code-generator.service.js";
import {DatabaseConnector} from "../../core/domain/interfaces/database.interface.js";
import {SQLParser} from "../../core/domain/interfaces/sql.interface.js";
import {AppConfig} from "../../core/domain/models/config.model.js";
import { FileSystemInterface } from '../../core/domain/interfaces/file-system.interface.js';
import { AppError } from '../../core/domain/errors/app-error.js';
import { LoggerService } from '../../core/domain/interfaces/logger.interface.js';
import chokidar from 'chokidar';

@injectable()
export class GenerateCommand {
  constructor(
    @inject(UIService) private ui: UIService,
    @inject(ConfigService) private configService: ConfigService,
    @inject(CodeGeneratorService) private codeGenerator: CodeGeneratorService,
    @inject('DatabaseConnector') private dbConnector: DatabaseConnector,
    @inject('SQLParser') private sqlParser: SQLParser,
    @inject('FileSystem') private fs: FileSystemInterface,
    @inject('Logger') private logger: LoggerService
  ) {}

  async execute(options: any): Promise<void> {
    try {
      this.ui.showBanner();
      this.logger.info('Starting type generation', { options });
      this.ui.info(`Loading configuration from ${options.config}...`);

      const config = await this.configService.loadConfig(options.config);
      if (options.output) {
        config.outputDir = options.output;
      }

      await this.dbConnector.connect();
      this.ui.success('Connected to database');

      await this.processQueryDirectories(config, options.templates);

      if (options.watch) {
        await this.startWatchMode(config, options);
      } else {
        this.ui.success('Type generation completed successfully!');
      }
    } catch (error) {
      this.logger.error('Error executing generate command', error as Error);
      if (error instanceof AppError) {
        this.ui.error(`${error.message}`);
      } else {
        this.ui.error(`Unexpected error while generating types: ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exit(1);
    } finally {
      await this.dbConnector.disconnect();
    }
  }

  async processQueryDirectories(config: AppConfig, templatesDir?: string): Promise<void> {
    const templateDir = templatesDir
      ? path.normalize(templatesDir)
      : config.templateDir
        ? path.normalize(config.templateDir)
        : path.join(process.cwd(), '.templates');

    let totalFiles = 0;
    const allSqlFiles: { filePath: string, dir: string }[] = [];

    for (const dir of config.queryDirs) {
      const normalizedDir = path.normalize(dir);
      const pattern = path.posix.join(normalizedDir.replace(/\\/g, '/'), '**', '*.sql');
      const sqlFiles = glob.sync(pattern).map(file => path.normalize(file));

      if (sqlFiles.length === 0) {
        this.ui.warning(`No SQL files found in ${dir}`);
        continue;
      }

      sqlFiles.forEach(f => allSqlFiles.push({ filePath: f, dir }));
    }

    totalFiles = allSqlFiles.length;
    let processedFiles = 0;

    if (totalFiles === 0) {
      this.ui.warning('No files were found for processing.');
      return;
    }

    this.ui.info(`Found ${totalFiles} SQL files.`);

    for (const { filePath, dir } of allSqlFiles) {
      processedFiles++;
      this.ui.showProgress(processedFiles, totalFiles, `Processing: ${path.basename(filePath)}`);
      this.logger.debug(`Processing SQL file`, { filePath, dir });

      try {
        const content = await this.fs.readFile(filePath, 'utf-8');
        const queries = this.sqlParser.parseFile(content);

        if (queries.length === 0) {
          this.logger.warn(`No queries found in file`, { filePath });
          continue;
        }

        const outputPath = this.generateOutputPath(dir, filePath, config.outputDir);
        this.logger.debug(`Generating code for`, { outputPath });

        await this.codeGenerator.generateTypesForQueries(
          queries,
          outputPath,
          templateDir,
          config.customTypes
        );
      } catch (error) {
        this.logger.error(`Error processing SQL file`, error as Error, { filePath });
        this.ui.error(`\nError processing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.ui.showBox('Summary', `Files processed: ${processedFiles}/${totalFiles}`);
  }

  private generateOutputPath(sourceDir: string, filePath: string, outputDir: string): string {
    const relativePath = path.relative(path.resolve(sourceDir), path.resolve(filePath));
    return path.join(outputDir, relativePath).replace(/\.sql$/i, '.ts');
  }

  private async startWatchMode(config: AppConfig, options: any): Promise<void> {
    this.ui.info('\nWatch Mode activated. Monitoring changes...');
    
    const watcher = chokidar.watch([...config.queryDirs, options.config], {
      ignored: /(^|[/\\])\../,
      persistent: true
    });

    watcher.on('change', async (changedPath) => {
      this.ui.info(`\nChange detected in: ${changedPath}`);
      
      try {
        if (changedPath === path.normalize(options.config)) {
          this.ui.info('Configuration changed, reloading...');
          const newConfig = await this.configService.loadConfig(options.config);
          await this.dbConnector.updateConfig(newConfig.db);
          Object.assign(config, newConfig);
        }
        
        await this.processQueryDirectories(config, options.templates);
        this.ui.success('Generation updated successfully!');
      } catch (error) {
        this.logger.error('Error during update in watch mode', error as Error);
        this.ui.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Manter o processo vivo
    return new Promise(() => {});
  }
}
