import {ReturnField} from '../core/domain/interfaces/template.interface.js';

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

  fixInvalidSQLSyntax(sql: string): string {
    let result = sql.replace(
      /\b(ON|on)\b\s+(.*?)(?=\s+(?:WHERE|where|GROUP|group|ORDER|order|LIMIT|limit|HAVING|having|LEFT|left|RIGHT|right|INNER|inner|JOIN|join|\)|\s*$))/gis,
      (match, onKeyword, conditions) => {
        const cleanedConditions = conditions.replace(/\b(\w+\.\w+)\s+as\s+\w+\b/gi, '$1');
        return `${onKeyword} ${cleanedConditions}`;
      }
    );

    result = result.replace(
      /\b(WHERE|where)\b\s+(.*?)(?=\s+(?:GROUP|group|ORDER|order|LIMIT|limit|HAVING|having|\)|\s*$))/gis,
      (match, whereKeyword, conditions) => {
        const cleanedConditions = conditions.replace(/\b(\w+\.\w+)\s+as\s+\w+\b/gi, '$1');
        return `${whereKeyword} ${cleanedConditions}`;
      }
    );

    const operators = ['=', '<>', '!=', '>', '<', '>=', '<=', 'IS', 'LIKE', 'IN', 'BETWEEN'];

    let finalResult = result;
    for (const op of operators) {
      const leftPattern = new RegExp(`(\\w+\\.\\w+)\\s+as\\s+\\w+\\s*${op}`, 'gi');
      finalResult = finalResult.replace(leftPattern, `$1 ${op}`);

      const rightPattern = new RegExp(`${op}\\s*(\\w+\\.\\w+)\\s+as\\s+\\w+`, 'gi');
      finalResult = finalResult.replace(rightPattern, `${op} $1`);
    }

    finalResult = finalResult.replace(/(\w+\.\w+)\s+as\s+\w+\s*=\s*\?/gi, '$1 = ?');

    return finalResult;
  }

  replaceTablesWithAliases(sql: string): string {
    const tableAliases = new Map<string, string>();
    const aliasPattern = /\b(FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?|\s+)(\w+)(?=\s|$|\n)/gi;
    let match;

    while ((match = aliasPattern.exec(sql)) !== null) {
      const tableName = match[2].trim();
      const alias = match[3].trim();
      if (tableName && alias && tableName !== alias) {
        tableAliases.set(tableName, alias);
      }
    }

    if (tableAliases.size === 0) {
      return sql;
    }

    let processedSql = sql;
    const selectPattern = /\bSELECT\b(.*?)(?=\bFROM\b)/gis;

    processedSql = processedSql.replace(selectPattern, (match, selectColumns) => {
      let newSelectColumns = selectColumns;

      for (const [tableName, alias] of tableAliases.entries()) {
        const tableRefPattern = new RegExp(`\\b${tableName}\\.`, 'gi');
        newSelectColumns = newSelectColumns.replace(tableRefPattern, `${alias}.`);
      }

      return `SELECT${newSelectColumns}`;
    });

    return processedSql;
  }

  processQueryForTypeScript(sql: string): string {
    let newSql = this.replaceTablesWithAliases(sql);

    let formattedSql = this.addMissingAliases(newSql);

    formattedSql = this.formatSqlAliases(formattedSql);

    return this.fixInvalidSQLSyntax(formattedSql);
  }

  applyReturnFieldAliases(sql: string, returnFields: ReturnField[] | undefined): string {
    if (!returnFields || returnFields.length === 0) {
      return this.processQueryForTypeScript(sql);
    }

    const tableAliases = new Map<string, string>();
    const aliasPattern = /\b(FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?|\s+)(\w+)(?=\s|$|\n)/gi;
    let match;

    while ((match = aliasPattern.exec(sql)) !== null) {
      const tableName = match[2].trim();
      const alias = match[3].trim();
      if (tableName && alias && tableName !== alias) {
        tableAliases.set(tableName, alias);
      }
    }

    const fromMatch = /\b(FROM|from)\b(.*)$/s.exec(sql);
    if (!fromMatch) {
      return sql;
    }

    const correctedFromPart = this.fixInvalidSQLSyntax(fromMatch[0]);

    const fieldsWithAliases = returnFields.map(field => {
      if (!field.sourceTable) {
        return `${field.sourceField} AS ${field.alias}`;
      }

      const tableAlias = tableAliases.get(field.sourceTable);
      const tableRef = tableAlias || field.sourceTable;

      return `${tableRef}.${field.sourceField} AS ${field.alias}`;
    }).join(', ');

    return `SELECT ${fieldsWithAliases} ${correctedFromPart}`;
  }
}