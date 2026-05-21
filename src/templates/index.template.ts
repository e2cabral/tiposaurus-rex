export const interfaceTemplate = `/**
 * Interface generated for table: {{tableName}}
 * @generated This file was automatically generated - DO NOT EDIT
 * @timestamp {{timestamp}}
 */
export interface {{pascalCase interfaceName}} {
{{#each fields}}
  {{name}}{{#if nullable}}?{{/if}}: {{type}};
{{/each}}
}
`;

export const queryTemplate = `import mysql from "mysql2/promise";

/**
* {{query.name}}
* {{#if query.description}}{{query.description}}{{/if}}
* @generated This file was automatically generated - DO NOT EDIT
* @timestamp {{timestamp}}
*/

{{#if query.returnFields}}
export interface {{pascalCase query.returnType}} {
{{#each query.returnFields}}
  {{camelCase alias}}{{#if nullable}}?{{/if}}: {{type}}; {{#if isFunction}}// SQL Function{{/if}}
{{/each}}
}
{{/if}}
export interface {{pascalCase query.name}}Params {
{{#each query.params}}
    {{name}}: {{type}};
{{/each}}
}

export type {{pascalCase query.name}}Result = {{#if query.returnSingle}}{{query.returnType}}{{else}}{{query.returnType}}[]{{/if}};

export const {{camelCase query.name}}Query = \`{{{query.sql}}}\`;

/**
* Executes query {{query.name}}
* @param params Query parameters
* @param db mysql2 connection configured with namedPlaceholders: true
* @returns Query result
*/
export async function {{camelCase query.name}}(
db: mysql.Connection,
params: {{pascalCase query.name}}Params
): Promise<{{pascalCase query.name}}Result{{#unless query.returnSingle}}[]{{/unless}}> {
const rows = (await db.execute({{camelCase query.name}}Query, Object.values(params)))[0];
return rows as unknown as {{pascalCase query.name}}Result{{#unless query.returnSingle}}[]{{/unless}};
}
`;

export const indexTemplate = `/**
 * @generated This file was automatically generated - DO NOT EDIT
 * @timestamp {{timestamp}}
 */

export const queryExecutors = {
{{#each queries}}
  {{camelCase name}},
{{/each}}
};
`;

export const dbConnectionTemplate = `/**
 * Database connection
 * @generated This file was automatically generated - DO NOT EDIT
 * @timestamp {{timestamp}}
 */
import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';

/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

/**
 * Full application configuration
 */
export interface AppConfig {
  db: DatabaseConfig;
  [key: string]: any;
}

/**
 * Database connection
 */
export interface DatabaseConnection {
  execute<T>(query: string, params?: any[]): Promise<T>;
}

// Database connection singleton
let dbConnection: DatabaseConnection | null = null;

/**
 * Loads the tiposaurus.config.json configuration file
 * @returns Application configuration
 */
async function loadConfig(): Promise<AppConfig> {
  try {
    const configPath = path.resolve(process.cwd(), 'tiposaurus.config.json');
    const configFile = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configFile);
  } catch (error) {
    if (error instanceof Error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error('tiposaurus.config.json file not found. Run "tiposaurus init" to create it.');
      }
      throw new Error('Error loading configuration: ' + error.message);
    }
    throw new Error('Unknown error while loading configuration');
  }
}

/**
 * Creates a database connection
 * @returns Database connection
 */
export async function createDatabaseConnection(): Promise<DatabaseConnection> {
  const config = await loadConfig();
  
  if (!config.db) {
    throw new Error('Database configuration not found in tiposaurus.config.json file');
  }
  
  const connection = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port || 3306,
  });
  
  return {
    async execute<T>(query: string, params?: any[]): Promise<T> {
      const [rows] = await connection.execute(query, params || []);
      return rows as T;
    }
  };
}

/**
 * Gets the current database connection or creates a new one if it doesn't exist
 * @returns Database connection
 */
export async function getConnection(): Promise<DatabaseConnection> {
  if (!dbConnection) {
    dbConnection = await createDatabaseConnection();
  }
  return dbConnection;
}`;
