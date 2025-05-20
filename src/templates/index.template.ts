export const interfaceTemplate = `/**
 * Interface gerada para a tabela: {{tableName}}
 * @generated Este arquivo foi gerado automaticamente - NÃO EDITAR
 * @timestamp {{timestamp}}
 */
export interface {{pascalCase interfaceName}} {
{{#each fields}}
  {{name}}{{#if nullable}}?{{/if}}: {{type}};
{{/each}}
}
`;

export const queryTemplate = `/**
* {{query.name}}
* {{#if query.description}}{{query.description}}{{/if}}
* @generated Este arquivo foi gerado automaticamente - NÃO EDITAR
* @timestamp {{timestamp}}
*/
import { getConnection, DatabaseConnection } from '../connection/db-connection';

{{#if query.returnFields}}
export interface {{pascalCase query.returnType}} {
{{#each query.returnFields}}
  {{camelCase alias}}{{#if nullable}}?{{/if}}: {{type}}; {{#if isFunction}}// Função SQL{{/if}}
{{/each}}
}
{{/if}}
export interface {{pascalCase query.name}}Params {
{{#each query.params}}
    {{name}}: {{type}};
{{/each}}
}

export type {{pascalCase query.name}}Result = {{#if query.returnSingle}}{{query.returnType}}{{else}}{{query.returnType}}[]{{/if}};

export const {{camelCase query.name}}Query = \`{{query.sql}}\`;

/**
* Executa a consulta {{query.name}}
* @param params Parâmetros da consulta
* @param db Conexão opcional com o banco de dados, se não fornecida será obtida automaticamente
* @returns Resultado da consulta
*/
export async function {{camelCase query.name}}(
params: {{pascalCase query.name}}Params
): Promise<{{pascalCase query.name}}Result{{#unless query.returnSingle}}[]{{/unless}}> {
const connection = await getConnection();
return connection.execute<{{pascalCase query.name}}Result{{#unless query.returnSingle}}[]{{/unless}}>(
{{camelCase query.name}}Query,
Object.values(params)
);
}
`;

export const indexTemplate = `/**
 * @generated Este arquivo foi gerado automaticamente - NÃO EDITAR
 * @timestamp {{timestamp}}
 */

export const queryExecutors = {
{{#each queries}}
  {{camelCase name}},
{{/each}}
};
`;

export const dbConnectionTemplate = `/**
 * Conexão com o banco de dados
 * @generated Este arquivo foi gerado automaticamente - NÃO EDITAR
 * @timestamp {{timestamp}}
 */
import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';

/**
 * Configuração do banco de dados
 */
export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

/**
 * Configuração completa da aplicação
 */
export interface AppConfig {
  db: DatabaseConfig;
  [key: string]: any;
}

/**
 * Conexão com o banco de dados
 */
export interface DatabaseConnection {
  execute<T>(query: string, params?: any[]): Promise<T>;
}

// Singleton da conexão com o banco de dados
let dbConnection: DatabaseConnection | null = null;

/**
 * Carrega o arquivo de configuração tiposaurus.config.json
 * @returns Configuração da aplicação
 */
async function loadConfig(): Promise<AppConfig> {
  try {
    const configPath = path.resolve(process.cwd(), 'tiposaurus.config.json');
    const configFile = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configFile);
  } catch (error) {
    if (error instanceof Error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error('Arquivo tiposaurus.config.json não encontrado. Execute "tiposaurus init" para criá-lo.');
      }
      throw new Error('Erro ao carregar configuração: ' + error.message);
    }
    throw new Error('Erro desconhecido ao carregar configuração');
  }
}

/**
 * Cria uma conexão com o banco de dados
 * @returns Conexão com o banco de dados
 */
export async function createDatabaseConnection(): Promise<DatabaseConnection> {
  const config = await loadConfig();
  
  if (!config.db) {
    throw new Error('Configuração de banco de dados não encontrada no arquivo tiposaurus.config.json');
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
 * Obtém a conexão atual com o banco de dados ou cria uma nova se não existir
 * @returns Conexão com o banco de dados
 */
export async function getConnection(): Promise<DatabaseConnection> {
  if (!dbConnection) {
    dbConnection = await createDatabaseConnection();
  }
  return dbConnection;
}`;