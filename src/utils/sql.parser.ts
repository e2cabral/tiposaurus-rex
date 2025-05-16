import { injectable } from 'inversify';
import { SQLParser, SQLParserOptions } from '../core/domain/interfaces/sql.interface';
import {QueryDefinition, QueryParameter, ReturnField} from '../core/domain/interfaces/template.interface';

@injectable()
export class SQLParserImpl implements SQLParser {
  private readonly QUERY_PATTERN = /--\s*@name\s+([\w.]+)\s*(?:--\s*@param\s+[\w:]+\s*)*(?:--\s*@returnType\s+([\w\[\]<>]+))?\s*(?:--\s*@returnSingle\s+(true|false))?\s*([\s\S]+?)(?=--\s*@name|$)/g;
  private readonly PARAM_PATTERN = /--\s*@param\s+([\w:]+)/g;
  private readonly DESCRIPTION_PATTERN = /--\s*@description\s+(.+?)(?=\n--\s*@|\n\n|$)/;
  private readonly RETURN_SINGLE_PATTERN = /--\s*@returnSingle\s+(true|false)/;
  private readonly RETURN_FIELD_PATTERN = /--\s*@return\s+([\w.]+)(?:\s+as\s+([\w]+))?(?:\s*:\s*([\w\[\]<>]+))?/g;

  constructor(private options: SQLParserOptions = {}) {
    this.options = {
      commentPrefix: '--',
      paramPattern: /--\s*@param\s+([\w:]+)/g,
      ...options
    };
  }

  parseFile(content: string): QueryDefinition[] {
    const queries: QueryDefinition[] = [];
    let match: RegExpExecArray | null;

    this.QUERY_PATTERN.lastIndex = 0;

    while ((match = this.QUERY_PATTERN.exec(content)) !== null) {
      const [fullMatch, name, returnType, returnSingleStr, sql] = match;

      const descMatch = fullMatch.match(this.DESCRIPTION_PATTERN);
      const description = descMatch ? descMatch[1].trim() : undefined;

      const paramMatches = Array.from(fullMatch.matchAll(this.PARAM_PATTERN));
      const params: QueryParameter[] = paramMatches.map(paramMatch => {
        const [paramName, paramType] = paramMatch[1].split(':');
        return {
          name: paramName,
          type: paramType || 'any'
        };
      });

      const returnFieldMatches = Array.from(fullMatch.matchAll(this.RETURN_FIELD_PATTERN));
      const returnFields: ReturnField[] = returnFieldMatches.map(fieldMatch => {
        const [sourceField, alias, type] = [fieldMatch[1], fieldMatch[2], fieldMatch[3]];

        const parts = sourceField.split('.');
        let sourceTable: string | undefined;
        let actualField = sourceField;
        
        if (parts.length > 1) {
          sourceTable = parts[0];
          actualField = parts[1];
        }
        
        return {
          sourceField: actualField,
          sourceTable,
          alias: alias || actualField,
          type: type
        };
      });

      let returnSingleMatch = fullMatch.match(this.RETURN_SINGLE_PATTERN);
      const returnSingle = returnSingleMatch 
        ? returnSingleMatch[1] === 'true'
        : (returnSingleStr === 'true' || (returnType && !returnType.endsWith('[]')));

      queries.push({
        name,
        description,
        sql: sql.trim(),
        params,
        returnType: returnType || 'any',
        returnSingle: !!returnSingle,
        returnFields: returnFields.length > 0 ? returnFields : undefined
      });
    }

    return queries;
  }

  parseQuery(sql: string, metadata: Record<string, string> = {}): QueryDefinition | null {
    const name = metadata.name;
    if (!name) return null;

    return {
      name,
      description: metadata.description,
      sql,
      params: (metadata.params || '').split(',')
        .filter(Boolean)
        .map(param => {
          const [name, type] = param.trim().split(':');
          return { name, type: type || 'any' };
        }),
      returnType: metadata.returns || 'any',
      returnSingle: metadata.returns ? !metadata.returns.endsWith('[]') : true
    };
  }

  extractTableNames(sql: string): string[] {
    const tableNames = new Set<string>();

    const fromPattern = /FROM\s+(\w+)/gi;
    let fromMatch;
    while ((fromMatch = fromPattern.exec(sql)) !== null) {
      const tableName = fromMatch[1].trim();
      tableNames.add(tableName);
    }

    const joinPattern = /JOIN\s+(\w+)/gi;
    let joinMatch;
    while ((joinMatch = joinPattern.exec(sql)) !== null) {
      const tableName = joinMatch[1].trim();
      tableNames.add(tableName);
    }

    const insertPattern = /INSERT\s+INTO\s+(\w+)/gi;
    let insertMatch;
    while ((insertMatch = insertPattern.exec(sql)) !== null) {
      const tableName = insertMatch[1].trim();
      tableNames.add(tableName);
    }

    const updatePattern = /UPDATE\s+(\w+)/gi;
    let updateMatch;
    while ((updateMatch = updatePattern.exec(sql)) !== null) {
      const tableName = updateMatch[1].trim();
      tableNames.add(tableName);
    }

    const deletePattern = /DELETE\s+FROM\s+(\w+)/gi;
    let deleteMatch;
    while ((deleteMatch = deletePattern.exec(sql)) !== null) {
      const tableName = deleteMatch[1].trim();
      tableNames.add(tableName);
    }

    return Array.from(tableNames);
  }
}