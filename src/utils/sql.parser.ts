import { inject, injectable } from 'inversify';
import { SQLParser, SQLParserOptions } from '../core/domain/interfaces/sql.interface.js';
import {
  QueryDefinition,
  QueryParameter,
  ReturnField,
} from '../core/domain/interfaces/template.interface.js';
import { SQLFormatter } from './sql-formatter.js';
import { ParameterMatcher } from './parameter.matcher.js';
import { TypeInferer } from './type-inferer.js';

@injectable()
export class SQLParserImpl implements SQLParser {
  constructor(
    @inject(SQLFormatter) private sqlFormatter: SQLFormatter,
    @inject(TypeInferer) private typeInferer: TypeInferer,
    @inject(ParameterMatcher) private parameterMatcher: ParameterMatcher,
    private options: SQLParserOptions = {}
  ) {
    this.options = {
      commentPrefix: '--',
      ...options,
    };
  }

  parseFile(content: string): QueryDefinition[] {
    const queries: QueryDefinition[] = [];

    const nameRegex = /(?:--|\/\*)\s*@name(?:\s*:)?\s+([^\r\n*/]+)/g;
    let nameMatch;
    const blocks = [];

    while ((nameMatch = nameRegex.exec(content)) !== null) {
      blocks.push({
        name: nameMatch[1].trim(),
        startIndex: nameMatch.index,
      });
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const nextBlock = blocks[i + 1];
      const blockContent = nextBlock
        ? content.substring(block.startIndex, nextBlock.startIndex)
        : content.substring(block.startIndex);

      // Extract aliases for this specific block to resolve them in return fields
      const tableAliases = this.extractTableAliases(blockContent);

      const queryDef = this.parseQueryBlock(block.name, blockContent, tableAliases);
      if (queryDef) {
        queries.push(queryDef);
      }
    }

    return queries;
  }

  parseQuery(sql: string, metadata: Record<string, string> = {}): QueryDefinition | null {
    const name = metadata.name;
    if (!name) return null;

    const formattedSql = this.sqlFormatter.processQueryForTypeScript(sql);

    return {
      name,
      description: metadata.description,
      sql: formattedSql,
      params: (metadata.params || '')
        .split(',')
        .filter(Boolean)
        .map(param => {
          const [name, type] = param.trim().split(':');
          return { name, type: type || 'any' };
        }),
      returnType: metadata.returns || 'any',
      returnSingle: metadata.returns ? !metadata.returns.endsWith('[]') : true,
    };
  }

  extractTableNames(sql: string): string[] {
    const tableNames = new Set<string>();

    const patterns = [
      /FROM\s+(\w+)/gi,
      /JOIN\s+(\w+)/gi,
      /INSERT\s+INTO\s+(\w+)/gi,
      /UPDATE\s+(\w+)/gi,
      /DELETE\s+FROM\s+(\w+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        const tableName = match[1].trim();
        tableNames.add(tableName);
      }
    }

    return Array.from(tableNames);
  }

  extractTableAliases(sql: string): Map<string, string> {
    const tableAliasMap = new Map<string, string>();

    const patterns = [
      /\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?|\s+)(\w+)(?=\s+|$|\n|WHERE|JOIN|ON|ORDER|GROUP|HAVING|LIMIT|;)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        const tableName = match[1].trim();
        const alias = match[2]?.trim();

        if (tableName && alias && tableName !== alias && !tableAliasMap.has(alias)) {
          tableAliasMap.set(alias, tableName);
        }
      }
    }

    return tableAliasMap;
  }

  private parseQueryBlock(
    name: string,
    blockContent: string,
    tableAliases: Map<string, string> = new Map()
  ): QueryDefinition | null {
    const lines = blockContent.split('\n');

    let description = '';
    let returnType = 'any';
    let returnSingle = true;
    const params: QueryParameter[] = [];
    const returnFields: ReturnField[] = [];
    const sqlLines: string[] = [];

    let foundSql = false;
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i];
      const line = originalLine.trim();

      if (!line) continue;

      if (line.startsWith('/*')) {
        inBlockComment = true;
      }

      const isLineComment = line.startsWith('--');
      const isComment = isLineComment || inBlockComment;

      if (!isComment) {
        foundSql = true;
        sqlLines.push(originalLine);
      } else {
        if (foundSql && line.includes('@name')) {
          break;
        }

        const result = this.parameterMatcher.processLine(line, returnFields);

        if (result) {
          if (result.description) {
            description = result.description;
          }
          if (result.param) {
            params.push(result.param);
          }
          if (result.returnType) {
            returnType = result.returnType;
          }
          if (result.returnSingle !== undefined) {
            returnSingle = result.returnSingle;
          }
          if (result.returnField) {
            this.parseReturnField(result.returnField.info, result.returnField.fields, tableAliases);
          }
          if (result.returnFunction) {
            this.parseReturnFunction(result.returnFunction.info, result.returnFunction.fields);
          }
        }
      }

      if (line.includes('*/')) {
        inBlockComment = false;
      }
    }

    if (sqlLines.length === 0) {
      return null;
    }

    const sql = sqlLines.join('\n');

    let formattedSql = sql;
    if (returnFields.length > 0) {
      formattedSql = this.sqlFormatter.applyReturnFieldAliases(sql, returnFields);
    } else {
      formattedSql = this.sqlFormatter.processQueryForTypeScript(sql);
    }

    return {
      name,
      description,
      sql: formattedSql,
      params,
      returnType,
      returnSingle,
      returnFields: returnFields.length > 0 ? returnFields : undefined,
    };
  }

  private parseReturnField(
    fieldInfo: string,
    returnFields: ReturnField[],
    tableAliases: Map<string, string>
  ): void {
    const typeParts = fieldInfo.split(':');
    const mainPart = typeParts[0].trim();
    let type = typeParts.length > 1 ? typeParts[1].trim() : undefined;

    const aliasParts = mainPart.split(' to ');
    const fieldPart = aliasParts[0].trim();
    const alias = aliasParts.length > 1 ? aliasParts[1].trim() : undefined;

    const isSqlFunction = this.sqlFormatter.isSqlFunction(fieldPart);

    let sourceTable: string | undefined;
    let sourceField: string;

    if (isSqlFunction) {
      sourceField = fieldPart;

      if (!type) {
        type = this.sqlFormatter.determineSqlExpressionType(fieldPart);
      }
    } else {
      const fieldParts = fieldPart.split('.');
      if (fieldParts.length > 1) {
        sourceTable = fieldParts[0];
        sourceField = fieldParts[1];

        // Resolve table alias
        if (tableAliases.has(sourceTable)) {
          sourceTable = tableAliases.get(sourceTable);
        }
      } else {
        sourceField = fieldPart;
      }

      type = this.typeInferer.infer(sourceField, type);
    }

    returnFields.push({
      sourceField,
      sourceTable,
      alias: alias || sourceField,
      type,
      isFunction: isSqlFunction,
    });
  }

  private parseReturnFunction(
    fieldInfo: string,
    returnFields: ReturnField[]
  ): void {
    let type: string | undefined;

    const [left, right] = fieldInfo.split(':');
    if (!right) {
      return;
    }

    const alias = left.trim();
    const expression = right.trim();

    if (this.sqlFormatter.isSqlFunction(expression)) {
      type = this.sqlFormatter.determineSqlExpressionType(expression);
    }

    type = this.typeInferer.infer(alias, type);

    returnFields.push({
      sourceField: expression,
      sourceTable: undefined,
      alias,
      type,
      isFunction: true,
    });
  }
}
