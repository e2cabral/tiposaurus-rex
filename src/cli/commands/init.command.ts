
import { injectable, inject } from 'inversify';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { UIService } from '../ui/ui.service.js';
import {ConfigService} from "../../core/services/config.service.js";
import {AppConfig} from "../../core/domain/models/config.model.js";
import {dbConnectionTemplate, indexTemplate, interfaceTemplate, queryTemplate} from "../../templates/index.template.js";

@injectable()
export class InitCommand {
  constructor(
    @inject(UIService) private ui: UIService,
    @inject(ConfigService) private configService: ConfigService
  ) {}

  async execute(configPath: string = 'tiposaurus.config.json'): Promise<void> {
    try {
      this.ui.showBanner();
      this.ui.info('Vamos configurar seu projeto Tiposaurus Rex');

      const defaultConfig = await this.checkExistingConfig(configPath);

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'dbHost',
          message: 'Host do banco de dados:',
          default: defaultConfig?.db.host || 'localhost'
        },
        {
          type: 'input',
          name: 'dbUser',
          message: 'Usuário do banco de dados:',
          default: defaultConfig?.db.user || ''
        },
        {
          type: 'password',
          name: 'dbPassword',
          message: 'Senha do banco de dados:',
          default: defaultConfig?.db.password || ''
        },
        {
          type: 'input',
          name: 'dbName',
          message: 'Nome do banco de dados:',
          default: defaultConfig?.db.database || ''
        },
        {
          type: 'input',
          name: 'queryDirs',
          message: 'Diretórios de consultas SQL (separados por vírgula):',
          default: defaultConfig?.queryDirs.join(',') || 'src/queries'
        },
        {
          type: 'input',
          name: 'outputDir',
          message: 'Diretório de saída para os tipos gerados:',
          default: defaultConfig?.outputDir || 'src/generated'
        },
        {
          type: 'confirm',
          name: 'createTemplates',
          message: 'Deseja criar templates padrão?',
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
        queryDirs: answers.queryDirs.split(',').map((dir: string) => dir.trim()),
        outputDir: answers.outputDir
      };
      
      await this.configService.saveConfig(configPath, config);
      this.ui.success(`Arquivo de configuração gerado: ${configPath}`);
      
      if (answers.createTemplates) {
        await this.createDefaultTemplates();
        this.ui.success('Templates padrão criados');
      }
      
      for (const dir of config.queryDirs) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.mkdir(config.outputDir, { recursive: true });

      this.ui.showBox('Próximos Passos',
        `1. Crie seus arquivos SQL em ${config.queryDirs.join(' ou ')}\n` +
        `2. Execute 'tiposaurus generate -c ${configPath} -o ${config.outputDir}'\n` +
        `3. Os tipos gerados estarão disponíveis em ${config.outputDir}`
      );
    } catch (error) {
      this.ui.error(`Erro ao inicializar projeto: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkExistingConfig(configPath: string): Promise<AppConfig | null> {
    try {
      return await this.configService.loadConfig(configPath);
    } catch (error) {
      return null;
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    const templateDir = path.join(process.cwd(), '.templates');
    await fs.mkdir(templateDir, { recursive: true });

    await fs.writeFile(path.join(templateDir, 'interface.hbs'), interfaceTemplate);
    await fs.writeFile(path.join(templateDir, 'query.hbs'), queryTemplate);
    await fs.writeFile(path.join(templateDir, 'index.hbs'), indexTemplate);
    await fs.writeFile(path.join(templateDir, 'db-connection.hbs'), dbConnectionTemplate);
  }
}