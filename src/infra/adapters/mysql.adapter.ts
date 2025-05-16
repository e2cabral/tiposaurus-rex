import { injectable, inject } from 'inversify';
import mysql from 'mysql2/promise';
import { DatabaseConnector, DatabaseConfig, TableMetadata, QueryResult, ColumnMetadata } from '../../core/domain/interfaces/database.interface';
import {ReturnField} from "@core/domain/interfaces/template.interface.js";

@injectable()
export class MySQLConnector implements DatabaseConnector {
  private connection: mysql.Connection | null = null;
  private typeMap: Record<string, string> = {
    'int': 'number',
    'smallint': 'number',
    'tinyint': 'number',
    'mediumint': 'number',
    'bigint': 'number',
    'float': 'number',
    'double': 'number',
    'decimal': 'number',
    'varchar': 'string',
    'text': 'string',
    'char': 'string',
    'enum': 'string',
    'date': 'Date',
    'datetime': 'Date',
    'timestamp': 'Date',
    'boolean': 'boolean',
    'tinyint(1)': 'boolean'
  };

  constructor(@inject('DatabaseConfig') private config: DatabaseConfig) {}

  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = await mysql.createConnection({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      port: this.config.port || 3306
    }) as mysql.Connection;
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  getConnection(): mysql.Connection {
    if (!this.connection) {
      throw new Error('Conexão não inicializada. Chame connect() primeiro.');
    }
    return this.connection;
  }

  async describeTable(tableName: string): Promise<TableMetadata> {
    if (!this.connection) {
      await this.connect();
    }

    const [rows] = await this.connection!.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
      [tableName]
    );

    const columns: ColumnMetadata[] = (rows as any[]).map(row => ({
      name: row.COLUMN_NAME,
      type: row.COLUMN_TYPE || row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES'
    }));

    return { name: tableName, columns };
  }

  async analyzeQuery(query: string): Promise<QueryResult> {
    if (!this.connection) {
      await this.connect();
    }

    try {      const [rows] = await this.connection!.query(`EXPLAIN ${query}`);
      const tableNames = new Set<string>();

      for (const row of rows as any[]) {
        if (row.table) {
          tableNames.add(row.table);
        }
      }
            const fields: ColumnMetadata[] = [];

      for (const tableName of tableNames) {
        const { columns } = await this.describeTable(tableName);
        fields.push(...columns);
      }

      return { fields, rows: [] };
    } catch (error) {      return { fields: [], rows: [] };
    }
  }

  async execute<T>(query: string, params: any[] = []): Promise<T[]> {
    if (!this.connection) {
      await this.connect();
    }

    const [rows] = await this.connection!.query(query, params);
    return rows as T[];
  }

  async analyzeQueryWithFields(query: string, fields: ReturnField[]): Promise<QueryResult> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const tableAliasMap = new Map<string, string>();
      const aliasPattern = /(?:FROM|JOIN)\s+(\w+)(?:\s+(?:as\s+)?(\w+))?/gi;
      let aliasMatch;
      
      while ((aliasMatch = aliasPattern.exec(query)) !== null) {
        const tableName = aliasMatch[1].trim();
        const alias = aliasMatch[2]?.trim();
        
        if (alias) {
          tableAliasMap.set(alias, tableName);
        }
      }

      const resultFields: ColumnMetadata[] = [];
      
      for (const field of fields) {
        let tableName = field.sourceTable;

        if (tableName && tableAliasMap.has(tableName)) {
          tableName = tableAliasMap.get(tableName)!;
        }

        if (tableName) {
          try {
            const tableMetadata = await this.describeTable(tableName);
            const columnMetadata = tableMetadata.columns.find(col => col.name === field.sourceField);
            
            if (columnMetadata) {
              resultFields.push({
                name: field.alias || field.sourceField,
                type: columnMetadata.type,
                nullable: field.nullable !== undefined ? field.nullable : columnMetadata.nullable
              });
              continue;
            }
          } catch (error) {
            console.warn(`Erro ao obter metadata para ${tableName}.${field.sourceField}`);
          }
        }

        resultFields.push({
          name: field.alias || field.sourceField,
          type: field.type || 'unknown',
          nullable: field.nullable !== undefined ? field.nullable : true
        });
      }
      
      return { fields: resultFields, rows: [] };
    } catch (error) {
      return { fields: [], rows: [] };
    }
  }
}