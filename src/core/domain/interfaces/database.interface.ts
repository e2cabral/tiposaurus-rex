import {ReturnField} from "./template.interface.js";

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
}

export interface QueryResult {
  fields: ColumnMetadata[];
  rows: any[];
}

export interface DatabaseConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnection(): any;
  describeTable(tableName: string): Promise<TableMetadata>;
  analyzeQuery(query: string): Promise<QueryResult>;
  analyzeQueryWithFields(query: string, fields: ReturnField[]): Promise<QueryResult>;
  execute<T>(query: string, params?: any[]): Promise<T[]>;
}