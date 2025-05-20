import {injectable, inject} from 'inversify';
import {SQLParser, SQLParserOptions} from '../core/domain/interfaces/sql.interface.js';
import {QueryDefinition, QueryParameter, ReturnField} from '../core/domain/interfaces/template.interface.js';
import {SQLFormatter} from './sql-formatter.js';

@injectable()
export class SQLParserImpl implements SQLParser {
  constructor(
    @inject(SQLFormatter) private sqlFormatter: SQLFormatter,
    private options: SQLParserOptions = {}
  ) {
    this.options = {
      commentPrefix: '--',
      ...options
    };
  }

  parseFile(content: string): QueryDefinition[] {
    console.log("Analisando conteúdo SQL:");
    console.log(content.substring(0, 200) + "...");

    const queries: QueryDefinition[] = [];

    const nameRegex = /--\s*@name(?:\s*:)?\s+([^\r\n]+)/g;
    let nameMatch;
    let lastIndex = 0;
    let blocks = [];

    while ((nameMatch = nameRegex.exec(content)) !== null) {
      blocks.push({
        name: nameMatch[1].trim(),
        startIndex: nameMatch.index
      });
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const nextBlock = blocks[i + 1];
      const blockContent = nextBlock
        ? content.substring(block.startIndex, nextBlock.startIndex)
        : content.substring(block.startIndex);

      const queryDef = this.parseQueryBlock(block.name, blockContent);
      if (queryDef) {
        queries.push(queryDef);
      }
    }

    console.log(`Total de consultas encontradas: ${queries.length}`);
    return queries;
  }

  private parseQueryBlock(name: string, blockContent: string): QueryDefinition | null {
    console.log(`Processando bloco para consulta: ${name}`);

    const lines = blockContent.split('\n');

    let description = '';
    let returnType = 'any';
    let returnSingle = true;
    const params: QueryParameter[] = [];
    const returnFields: ReturnField[] = [];
    const sqlLines: string[] = [];

    let foundSql = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      if (!line.startsWith('--')) {
        foundSql = true;
        sqlLines.push(lines[i]);
        continue;
      }


      if (foundSql) {
        if (line.match(/--\s*@name(?:\s*:)?/)) {
          break;
        }
      }

      const matchers = [
        {matcher: /--\s*@description(?:\s*:)?/, action: () => {description = line.replace(/--\s*@description(?:\s*:)?\s*/, '').trim()}},
        {matcher: /--\s*@param(?:\s*:)?/, action: () => {
          const paramPart = line.replace(/--\s*@param(?:\s*:)?\s*/, '').trim();
          const [paramName, paramType] = paramPart.split(':');

          params.push({
            name: paramName.trim(),
            type: paramType ? paramType.trim() : 'any'
          });
        }},
        {
          matcher: /--\s*@returnType(?:\s*:)?/,
          action: () => {returnType = line.replace(/--\s*@returnType(?:\s*:)?\s*/, '').trim()}
        },
        {
          matcher: /--\s*@returnSingle(?:\s*:)?/,
          action: () => {
            const value = line.replace(/--\s*@returnSingle(?:\s*:)?\s*/, '').trim();
            returnSingle = value.toLowerCase() === 'true';
          }
        },
        {
          matcher: /--\s*@return(?:\s*:)?/,
          action: () => {
            const fieldInfo = line.replace(/--\s*@return(?:\s*:)?\s*/, '').trim();
            this.parseReturnField(fieldInfo, returnFields);
          }
        },
        {
          matcher: /--\s*@returnFunction(?:\s*:)?/,
          action: () => {
            const fieldInfo = line.replace(/--\s*@returnFunction(?:\s*:)?\s*/, '').trim();
            this.parseReturnFunction(fieldInfo, returnFields);
          }
        }

      ];

      for (const matcher of matchers) {
        if (line.match(matcher.matcher)) {
          matcher.action();
          break;
        }
      }
    }

    if (sqlLines.length === 0) {
      console.log(`Nenhum SQL encontrado para a consulta ${name}`);
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
      returnFields: returnFields.length > 0 ? returnFields : undefined
    };
  }
  
private parseReturnField(fieldInfo: string, returnFields: ReturnField[]): void {
  console.log(`Processando campo: ${fieldInfo}`);

  const typeParts = fieldInfo.split(':');
  let mainPart = typeParts[0].trim();
  let type = typeParts.length > 1 ? typeParts[1].trim() : undefined;

  const aliasParts = mainPart.split(' as ');
  let fieldPart = aliasParts[0].trim();
  let alias = aliasParts.length > 1 ? aliasParts[1].trim() : undefined;
  
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
    } else {
      sourceField = fieldPart;
    }

    if (!type) {
      if (sourceField === 'id' || sourceField.endsWith('_id') || sourceField.includes('Id')) {
        type = 'number';
      } else if (sourceField.includes('date') || sourceField.includes('time') || sourceField.includes('Date')) {
        type = 'Date';
      } else if (sourceField.includes('is_') || sourceField.includes('has_')) {
        type = 'boolean';
      } else {
        type = 'string';
      }
    }
  }

  console.log(`Campo processado: campo=${sourceField}, tabela=${sourceTable}, alias=${alias}, tipo=${type}, isFunction=${isSqlFunction}`);

  returnFields.push({
    sourceField,
    sourceTable,
    alias: alias || sourceField,
    type,
    isFunction: isSqlFunction 
  });
}

private parseReturnFunction(fieldInfo: string, returnFields: ReturnField[]): void {
  console.log(`Processando função SQL personalizada: ${fieldInfo}`);

  let alias: string | undefined;
  let expression: string;
  let type: string | undefined;

  const [left, right] = fieldInfo.split(':');
  if (!right) {
    console.warn(`Formato inválido para @returnFunction: ${fieldInfo}`);
    return;
  }

  alias = left.trim();
  expression = right.trim();
  
  if (this.sqlFormatter.isSqlFunction(expression)) {
    type = this.sqlFormatter.determineSqlExpressionType(expression);
  }

  if (!type) {
    if (alias.toLowerCase().includes('id')) type = 'number';
    else if (alias.toLowerCase().includes('date') || alias.toLowerCase().includes('time')) type = 'Date';
    else if (alias.toLowerCase().includes('is_') || alias.toLowerCase().includes('has_')) type = 'boolean';
    else type = 'string';
  }

  returnFields.push({
    sourceField: expression,
    sourceTable: undefined,
    alias,
    type,
    isFunction: true
  });

  console.log(`Função processada: alias=${alias}, expr=${expression}, tipo=${type}`);
}

  parseQuery(sql: string, metadata: Record<string, string> = {}): QueryDefinition | null {
    const name = metadata.name;
    if (!name) return null;

    const formattedSql = this.sqlFormatter.processQueryForTypeScript(sql);

    return {
      name,
      description: metadata.description,
      sql: formattedSql,
      params: (metadata.params || '').split(',')
        .filter(Boolean)
        .map(param => {
          const [name, type] = param.trim().split(':');
          return {name, type: type || 'any'};
        }),
      returnType: metadata.returns || 'any',
      returnSingle: metadata.returns ? !metadata.returns.endsWith('[]') : true
    };
  }

  extractTableNames(sql: string): string[] {
    const tableNames = new Set<string>();

    const patterns = [
      /FROM\s+(\w+)/gi,
      /JOIN\s+(\w+)/gi,
      /INSERT\s+INTO\s+(\w+)/gi,
      /UPDATE\s+(\w+)/gi,
      /DELETE\s+FROM\s+(\w+)/gi
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
      /\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?|\s+)(\w+)(?=\s+|$|\n|WHERE|JOIN|ON|ORDER|GROUP|HAVING|LIMIT)/gi
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

}