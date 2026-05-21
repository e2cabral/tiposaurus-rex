import { injectable, inject } from 'inversify';
import inquirer from 'inquirer';
import path from 'path';
import { UIService } from '../ui/ui.service.js';
import {ConfigService} from "../../core/services/config.service.js";
import {AppConfig} from "../../core/domain/models/config.model.js";
import {dbConnectionTemplate, indexTemplate, interfaceTemplate, queryTemplate} from "../../templates/index.template.js";
import { FileSystemInterface } from '../../core/domain/interfaces/file-system.interface.js';
import { AppError } from '../../core/domain/errors/app-error.js';
import { LoggerService } from '../../core/domain/interfaces/logger.interface.js';

@injectable()
export class InitCommand {
  constructor(
    @inject(UIService) private ui: UIService,
    @inject(ConfigService) private configService: ConfigService,
    @inject('FileSystem') private fs: FileSystemInterface,
    @inject('Logger') private logger: LoggerService
  ) {}

  async execute(configPath: string = 'tiposaurus.config.json'): Promise<void> {
    try {
      this.ui.showBanner();
      this.logger.info('Initializing init command', { configPath });
      this.ui.info("Let's configure your Tiposaurus Rex project");

      const defaultConfig = await this.checkExistingConfig(configPath);

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'dbHost',
          message: 'Database host:',
          default: defaultConfig?.db.host || 'localhost'
        },
        {
          type: 'input',
          name: 'dbUser',
          message: 'Database user:',
          default: defaultConfig?.db.user || ''
        },
        {
          type: 'password',
          name: 'dbPassword',
          message: 'Database password:',
          default: defaultConfig?.db.password || ''
        },
        {
          type: 'input',
          name: 'dbName',
          message: 'Database name:',
          default: defaultConfig?.db.database || ''
        },
        {
          type: 'input',
          name: 'queryDirs',
          message: 'SQL query directories (comma-separated):',
          default: defaultConfig?.queryDirs.join(',') || 'src/queries'
        },
        {
          type: 'input',
          name: 'outputDir',
          message: 'Output directory for generated types:',
          default: defaultConfig?.outputDir || 'src/generated'
        },
        {
          type: 'confirm',
          name: 'createTemplates',
          message: 'Do you want to create default templates?',
          default: true
        }
      ]);

      const config: AppConfig = {
        db: {
          host: answers.dbHost,
          user: answers.dbUser,
          password: answers.dbPassword,
          database: answers.dbName,
          port: 3306
        },
        queryDirs: answers.queryDirs.split(',').map((dir: string) => path.normalize(dir.trim())),
        outputDir: path.normalize(answers.outputDir)
      };
      
      await this.configService.saveConfig(configPath, config);
      this.ui.success(`Configuration file generated: ${configPath}`);
      await this.ensureConfigIsIgnored(configPath);
      
      if (answers.createTemplates) {
        await this.createDefaultTemplates();
        this.ui.success('Default templates created');
      }
      
      for (const dir of config.queryDirs) {
        await this.fs.mkdir(dir, { recursive: true });
      }
      await this.fs.mkdir(config.outputDir, { recursive: true });

      this.ui.showBox('Next Steps',
        `1. Add '${configPath}' to your .gitignore (IMPORTANT!)\n` +
        `2. Create your SQL files in ${config.queryDirs.join(' or ')}\n` +
        `3. Run 'tiposaurus generate -c ${configPath}'\n` +
        `4. Generated types will be available in ${config.outputDir}`
      );
    } catch (error) {
      this.logger.error('Error executing init command', error as Error);
      if (error instanceof AppError) {
        this.ui.error(`${error.message}`);
      } else {
        this.ui.error(`Unexpected error while initializing project: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async checkExistingConfig(configPath: string): Promise<AppConfig | null> {
    try {
      return await this.configService.loadConfig(configPath);
    } catch {
      return null;
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    const templateDir = path.join(process.cwd(), '.templates');
    await this.fs.mkdir(templateDir, { recursive: true });

    await this.fs.writeFile(path.join(templateDir, 'interface.hbs'), interfaceTemplate);
    await this.fs.writeFile(path.join(templateDir, 'query.hbs'), queryTemplate);
    await this.fs.writeFile(path.join(templateDir, 'index.hbs'), indexTemplate);
    await this.fs.writeFile(path.join(templateDir, 'db-connection.hbs'), dbConnectionTemplate);
  }

  private async ensureConfigIsIgnored(configPath: string): Promise<void> {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const normalizedConfigPath = configPath.replace(/\\/g, '/');

    let existingContent = '';
    if (await this.fs.exists(gitignorePath)) {
      existingContent = await this.fs.readFile(gitignorePath, 'utf-8');
    }

    const entries = new Set(
      existingContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    );

    if (entries.has(normalizedConfigPath)) {
      return;
    }

    const nextContent = existingContent.endsWith('\n') || existingContent.length === 0
      ? `${existingContent}${normalizedConfigPath}\n`
      : `${existingContent}\n${normalizedConfigPath}\n`;

    await this.fs.writeFile(gitignorePath, nextContent);
    this.ui.info(`Added ${normalizedConfigPath} to .gitignore`);
  }
}
