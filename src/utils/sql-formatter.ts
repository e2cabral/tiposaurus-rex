import {ReturnField} from '../core/domain/interfaces/template.interface.js';
import {MYSQL_FUNCTIONS} from "./constants/mysql";

export class SQLFormatter {
  private readonly SQL_RESERVED_WORDS = new Set([
    'select', 'from', 'where', 'and', 'or', 'join', 'inner', 'outer', 'left', 'right',
    'on', 'group', 'order', 'by', 'having', 'limit', 'offset', 'union', 'all', 'insert',
    'update', 'delete', 'create', 'alter', 'drop', 'table', 'index', 'view', 'procedure',
    'function', 'trigger', 'case', 'when', 'then', 'else', 'end', 'as', 'distinct', 'between',
    'in', 'like', 'is', 'null', 'not', 'default', 'values', 'set', 'into'
  ]);

  private readonly SQL_OPERATORS = ['=', '<>', '!=', '>', '<', '>=', '<=', 'IS', 'LIKE', 'IN', 'BETWEEN'];

  formatSqlAliases(sql: string): string {
    return sql.replace(
      /(\w+(?:\.\w+)?\s+as\s+)(\w+)_(\w+)(?=[\s,)])/gi,
      (_, prefix, first, second) => `${prefix}${first}${this.capitalize(second)}`
    );
  }

  fixInvalidSQLSyntax(sql: string): string {
    const cleanupAlias = (conditions: string) => conditions.replace(/\b(\w+\.\w+)\s+as\s+\w+\b/gi, '$1');

    let result = sql.replace(
      /\b(ON|on)\b\s+(.*?)(?=\s+(?:WHERE|where|GROUP|group|ORDER|order|LIMIT|limit|HAVING|having|LEFT|left|RIGHT|right|INNER|inner|JOIN|join|\)|\s*$))/gis,
      (_, onKeyword, conditions) => `${onKeyword} ${cleanupAlias(conditions)}`
    );

    result = result.replace(
      /\b(WHERE|where)\b\s+(.*?)(?=\s+(?:GROUP|group|ORDER|order|LIMIT|limit|HAVING|having|\)|\s*$))/gis,
      (_, whereKeyword, conditions) => `${whereKeyword} ${cleanupAlias(conditions)}`
    );

    return this.cleanupOperatorAliases(result);
  }

  private cleanupOperatorAliases(sql: string): string {
    let result = sql;

    for (const op of this.SQL_OPERATORS) {
      result = result
        .replace(new RegExp(`(\\w+\\.\\w+)\\s+as\\s+\\w+\\s*${op}`, 'gi'), `$1 ${op}`)
        .replace(new RegExp(`${op}\\s*(\\w+\\.\\w+)\\s+as\\s+\\w+`, 'gi'), `${op} $1`);
    }

    return result.replace(/(\w+\.\w+)\s+as\s+\w+\s*=\s*\?/gi, '$1 = ?');
  }

  replaceTablesWithAliases(sql: string): string {
    const tableAliases = this.getTableAliasesFromSql(sql);

    if (tableAliases.length === 0) {
      return sql;
    }

    return this.replaceTableReferencesInSelect(sql, tableAliases);
  }

  private getTableAliasesFromSql(sql: string): Array<{ table: string, alias: string }> {
    const tableAliases = [];
    const aliasPattern = /\b(FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?|\s+)(\w+)(?=\s|$|\n)/gi;
    let match;

    while ((match = aliasPattern.exec(sql)) !== null) {
      const [, , tableName, alias] = match;

      if (this.isValidTableAlias(tableName.trim(), alias.trim())) {
        tableAliases.push({ table: tableName.trim(), alias: alias.trim() });
      }
    }

    return tableAliases;
  }

  private isValidTableAlias(tableName: string, alias: string): boolean {
    return Boolean(
      tableName &&
      alias &&
      tableName !== alias &&
      !this.SQL_RESERVED_WORDS.has(tableName.toLowerCase()) &&
      !this.SQL_RESERVED_WORDS.has(alias.toLowerCase())
    );
  }

  private replaceTableReferencesInSelect(sql: string, tableAliases: Array<{ table: string, alias: string }>): string {
    return sql.replace(/\bSELECT\b(.*?)(?=\bFROM\b)/gis, (_, selectColumns) => {
      let newSelectColumns = selectColumns;

      for (const [tableName, alias] of tableAliases.entries()) {
        newSelectColumns = newSelectColumns.replace(
          new RegExp(`\\b${tableName}\\.`, 'gi'),
          `${alias}.`
        );
      }

      return `SELECT${newSelectColumns}`;
    });
  }

  processQueryForTypeScript(sql: string): string {
    return this.fixInvalidSQLSyntax(
      this.formatSqlAliases(
        this.addMissingAliasesToFunctions(
          this.replaceTablesWithAliases(sql)
        )
      )
    );
  }

  applyReturnFieldAliases(sql: string, returnFields: ReturnField[] | undefined): string {
    if (!returnFields?.length) {
      return this.processQueryForTypeScript(sql);
    }

    const tableAliases = this.getTableAliasesFromSql(sql);
    const fieldsWithAliases = this.buildFieldsWithAliases(returnFields, tableAliases);
    const fromClause = this.extractFromClause(sql);

    return `SELECT ${fieldsWithAliases.join(', ')} ${fromClause}`;
  }

  private buildFieldsWithAliases(
    returnFields: ReturnField[],
    tableAliases: Array<{ table: string, alias: string }>
  ): string[] {
    return returnFields.map(field => {
      if (!field.sourceField) {
        throw new Error(`Missing source field in return field: ${JSON.stringify(field)}`);
      }

      let tableAlias: string | undefined;

      if (field.sourceTable) {
        const foundAlias = tableAliases.find(entry => entry.table === field.sourceTable);
        tableAlias = foundAlias ? foundAlias.alias : field.sourceTable;
      }

      const isFunction = /\w+\s*\(.*\)/.test(field.sourceField);
      const fieldExpression = isFunction
        ? field.sourceField
        : `${tableAlias ? `${tableAlias}.` : ''}${field.sourceField}`;

      const aliasPart = field.alias ? ` AS ${field.alias}` : '';
      return `${fieldExpression}${aliasPart}`;
    });
  }

  private extractFromClause(sql: string): string {
    const fromIndex = sql.toUpperCase().indexOf('FROM');
    return fromIndex !== -1 ? sql.slice(fromIndex).trim() : '';
  }

  private addMissingAliasesToFunctions(sql: string): string {
    return sql.replace(/\bSELECT\b(.*?)(?=\bFROM\b)/is, (match, selectPart) => {
      const columns = [];
      let buffer = '';
      let parenCount = 0;

      for (let i = 0; i < selectPart.length; i++) {
        const char = selectPart[i];

        if (char === ',' && parenCount === 0) {
          columns.push(buffer.trim());
          buffer = '';
        } else {
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
          buffer += char;
        }
      }
      if (buffer) columns.push(buffer.trim());

      const processed = columns.map((col, index) => {
        if (/AS\s+\w+$/i.test(col)) return col;

        const functionMatch = col.match(/^(\w+)\s*\(/i);
        if (!functionMatch) return col;

        const funcName = functionMatch[1].toUpperCase();
        if (!MYSQL_FUNCTIONS.has(funcName)) return col;

        return `${col} AS property${index + 1}`;
      });

      return `SELECT ${processed.join(', ')} `;
    });
  }


  extractTableAliases(sql: string): Map<string, string> {
    const tableAliasMap = new Map<string, string>();
    const aliasPattern = /\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?|\s+)(\w+)(?=\s+|$|\n|WHERE|JOIN|ON|ORDER|GROUP|HAVING|LIMIT)/gi;

    let match;
    while ((match = aliasPattern.exec(sql)) !== null) {
      const [, tableName, alias] = match;
      if (tableName?.trim() && alias?.trim() && tableName !== alias) {
        tableAliasMap.set(alias.trim(), tableName.trim());
      }
    }

    return tableAliasMap;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }
}