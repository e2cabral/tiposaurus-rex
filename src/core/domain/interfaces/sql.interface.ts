import { QueryDefinition, QueryParameter, ReturnField } from './template.interface.js';

export interface SQLParserOptions {
  commentPrefix?: string;
  paramPattern?: RegExp;
}

export interface SQLParser {
  parseFile(content: string): QueryDefinition[];
  parseQuery(sql: string, metadata?: Record<string, string>): QueryDefinition | null;
  extractTableNames(sql: string): string[];
  extractTableAliases(sql: string): Map<string, string>;
}