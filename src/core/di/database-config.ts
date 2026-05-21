import { container } from './container.js';
import { DatabaseConfig } from '../domain/interfaces/database.interface.js';

type AppConfigWithDatabase = {
  db: DatabaseConfig;
};

export function bindDatabaseConfig(config: AppConfigWithDatabase): void {
  if (container.isBound('DatabaseConfig')) {
    container.unbindSync('DatabaseConfig');
  }

  container.bind<DatabaseConfig>('DatabaseConfig').toConstantValue({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
  });
}
