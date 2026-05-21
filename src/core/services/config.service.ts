import { inject, injectable } from 'inversify';
import path from 'path';
import {AppConfig, AppConfigSchema} from "../domain/models/config.model.js";
import { FileSystemInterface } from '../domain/interfaces/file-system.interface.js';
import { ConfigError } from '../domain/errors/app-error.js';

@injectable()
export class ConfigService {
  constructor(
    @inject('FileSystem') private fs: FileSystemInterface
  ) {}

  async loadConfig(configPath: string): Promise<AppConfig> {
    try {
      const resolvedPath = path.resolve(process.cwd(), configPath);
      const configFile = await this.fs.readFile(resolvedPath, 'utf-8');
      const rawConfig = JSON.parse(configFile);

      const result = AppConfigSchema.safeParse(rawConfig);

      if (!result.success) {
        const formattedError = result.error.format();
        throw new ConfigError(
          `Invalid configuration: ${JSON.stringify(formattedError, null, 2)}`
        );
      }

      return result.data;
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      
      if (error instanceof Error) {
        if ((error as any).code === 'ENOENT') {
          throw new ConfigError(`Configuration file not found: ${configPath}`);
        }
        throw new ConfigError(`Error loading configuration: ${error.message}`);
      }
      throw new ConfigError('Unknown error while loading configuration');
    }
  }

  async saveConfig(configPath: string, config: AppConfig): Promise<void> {
    try {
      const resolvedPath = path.resolve(process.cwd(), configPath);
      await this.fs.writeFile(resolvedPath, JSON.stringify(config, null, 2));
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigError(`Error saving configuration: ${error.message}`);
      }
      throw new ConfigError('Unknown error while saving configuration');
    }
  }
}