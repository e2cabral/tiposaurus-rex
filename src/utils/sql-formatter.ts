import { ReturnField } from '../core/domain/interfaces/template.interface.js';

export class SQLFormatter {
  formatSqlAliases(sql: string): string {
    const snakeCaseAliasRegex = /(\w+(?:\.\w+)?\s+as\s+)(\w+)_(\w+)(?=[\s,)])/gi;

    return sql.replace(snakeCaseAliasRegex, (match, prefix, first, second) => {
      return `${prefix}${first}${second.charAt(0).toUpperCase() + second.slice(1)}`;
    });
  }

  addMissingAliases(sql: string): string {
    const noAliasColumnRegex = /([a-z0-9_]+)\.([a-z0-9_]+)(?!\s+as\s+)(?=[\s,)])/gi;

    return sql.replace(noAliasColumnRegex, (match, table, column) => {
      const camelColumn = column.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
      return `${table}.${column} as ${camelColumn}`;
    });
  }

  processQueryForTypeScript(sql: string): string {
    let formattedSql = this.addMissingAliases(sql);
    formattedSql = this.formatSqlAliases(formattedSql);
    return formattedSql;
  }

  applyReturnFieldAliases(sql: string, returnFields: ReturnField[] | undefined): string {
    if (!returnFields || returnFields.length === 0) {
      return this.processQueryForTypeScript(sql);
    }

    const fromMatch = /\b(FROM|from)\b(.*)$/s.exec(sql);
    if (!fromMatch) {
      return sql;
    }

    const fieldsWithAliases = returnFields.map(field => {
      const source = field.sourceTable
        ? `${field.sourceTable}.${field.sourceField}`
        : field.sourceField;
      return `${source} AS ${field.alias}`;
    }).join(', ');

    return `SELECT ${fieldsWithAliases} ${fromMatch[0]}`;
  }

}