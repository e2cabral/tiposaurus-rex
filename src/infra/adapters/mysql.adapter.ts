import { injectable, inject } from 'inversify';
import mysql from 'mysql2/promise';
import {
  DatabaseConnector,
  DatabaseConfig,
  TableMetadata,
  QueryResult,
  ColumnMetadata,
} from '../../core/domain/interfaces/database.interface.js';
import { ReturnField } from '../../core/domain/interfaces/template.interface.js';
import { DatabaseError } from '../../core/domain/errors/app-error.js';

@injectable()
export class MySQLConnector implements DatabaseConnector {
  private connection: mysql.Connection | null = null;

  constructor(@inject('DatabaseConfig') private config: DatabaseConfig) {}

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    try {
      this.connection = (await mysql.createConnection({
        host: this.config.host,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        port: this.config.port || 3306,
      })) as mysql.Connection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to connect to MySQL: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      await this.connection.end();
    } finally {
      this.connection = null;
    }
  }

  async updateConfig(config: DatabaseConfig): Promise<void> {
    await this.disconnect();
    this.config = {
      ...config,
      port: config.port || 3306,
    };
  }

  getConnection(): mysql.Connection {
    if (!this.connection) {
      throw new DatabaseError('Connection not initialized. Call connect() first.');
    }

    return this.connection;
  }

  async describeTable(tableName: string): Promise<TableMetadata> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const [rows] = await this.connection!.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
        [tableName]
      );

      const castedRows = rows as Array<{
        COLUMN_NAME: string;
        DATA_TYPE: string;
        IS_NULLABLE: string;
        COLUMN_TYPE?: string;
      }>;

      if (castedRows.length === 0) {
        throw new DatabaseError(`Table '${tableName}' not found in the current database.`);
      }

      const columns: ColumnMetadata[] = castedRows.map((row) => ({
        name: row.COLUMN_NAME,
        type: row.COLUMN_TYPE || row.DATA_TYPE,
        nullable: row.IS_NULLABLE === 'YES',
      }));

      return { name: tableName, columns };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        `Error describing table ${tableName}: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async analyzeQuery(_query: string): Promise<QueryResult> {
    return { fields: [], rows: [] };
  }

  async execute<T>(query: string, params: any[] = []): Promise<T[]> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const [rows] = await this.connection!.query(query, params);
      return rows as T[];
    } catch (error) {
      throw new DatabaseError(
        `Error executing query: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async getQueryMetadata(query: string, params: any[] = []): Promise<ColumnMetadata[]> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      let metadataQuery = query.trim();
      if (
        metadataQuery.toUpperCase().startsWith('SELECT') &&
        !metadataQuery.toUpperCase().includes('LIMIT')
      ) {
        metadataQuery = `${metadataQuery} LIMIT 0`;
      }

      const [, fields] = await this.connection!.execute(metadataQuery, params);

      if (!fields) {
        return [];
      }

      return fields.map((field: any) => ({
        name: field.name,
        type: this.getSqlTypeName(field.type),
        nullable: !(field.flags & 1),
      }));
    } catch {
      try {
        const [, fields] = await this.connection!.execute(query, params);
        if (!fields) {
          return [];
        }

        return fields.map((field: any) => ({
          name: field.name,
          type: this.getSqlTypeName(field.type),
          nullable: !(field.flags & 1),
        }));
      } catch {
        return [];
      }
    }
  }

  private getSqlTypeName(type: number): string {
    const types: Record<number, string> = {
      0: 'DECIMAL',
      1: 'TINY',
      2: 'SHORT',
      3: 'LONG',
      4: 'FLOAT',
      5: 'DOUBLE',
      7: 'TIMESTAMP',
      8: 'LONGLONG',
      9: 'INT24',
      10: 'DATE',
      11: 'TIME',
      12: 'DATETIME',
      13: 'YEAR',
      15: 'VARCHAR',
      16: 'BIT',
      245: 'JSON',
      246: 'NEWDECIMAL',
      247: 'ENUM',
      248: 'SET',
      249: 'TINY_BLOB',
      250: 'MEDIUM_BLOB',
      251: 'LONG_BLOB',
      252: 'BLOB',
      253: 'VAR_STRING',
      254: 'STRING',
      255: 'GEOMETRY',
    };

    return types[type] || 'UNKNOWN';
  }

  async analyzeQueryWithFields(_query: string, _fields: ReturnField[]): Promise<QueryResult> {
    return { fields: [], rows: [] };
  }
}
