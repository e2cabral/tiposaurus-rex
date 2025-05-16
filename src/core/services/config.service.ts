import { injectable } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import { AppConfig, AppConfigSchema } from '@core/domain/models/config.model.js';

@injectable()
export class ConfigService {
  async loadConfig(configPath: string): Promise<AppConfig> {
    try {
      const resolvedPath = path.resolve(process.cwd(), configPath);
      const configFile = await fs.readFile(resolvedPath, 'utf-8');
      const rawConfig = JSON.parse(configFile);

      const result = AppConfigSchema.safeParse(rawConfig);

      if (!result.success) {
        const formattedError = result.error.format();
        throw new Error(
          `Configuração inválida: ${JSON.stringify(formattedError, null, 2)}`
        );
      }

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        if ((error as any).code === 'ENOENT') {
          throw new Error(`Arquivo de configuração não encontrado: ${configPath}`);
        }
        throw new Error(`Erro ao carregar configuração: ${error.message}`);
      }
      throw new Error('Erro desconhecido ao carregar configuração');
    }
  }

  async saveConfig(configPath: string, config: AppConfig): Promise<void> {
    try {
      const resolvedPath = path.resolve(process.cwd(), configPath);
      await fs.writeFile(resolvedPath, JSON.stringify(config, null, 2));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro ao salvar configuração: ${error.message}`);
      }
      throw new Error('Erro desconhecido ao salvar configuração');
    }
  }
}