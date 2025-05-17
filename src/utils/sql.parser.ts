import { injectable } from 'inversify';
import { SQLParser, SQLParserOptions } from '../core/domain/interfaces/sql.interface';
import { QueryDefinition, QueryParameter, ReturnField } from '../core/domain/interfaces/template.interface';

@injectable()
export class SQLParserImpl implements SQLParser {
  constructor(private options: SQLParserOptions = {}) {
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

      if (line.match(/--\s*@description(?:\s*:)?/)) {
        description = line.replace(/--\s*@description(?:\s*:)?\s*/, '').trim();
        console.log(`Descrição: ${description}`);
      }
      else if (line.match(/--\s*@param(?:\s*:)?/)) {
        const paramPart = line.replace(/--\s*@param(?:\s*:)?\s*/, '').trim();
        const [paramName, paramType] = paramPart.split(':');
        params.push({
          name: paramName.trim(),
          type: paramType ? paramType.trim() : 'any'
        });
        console.log(`Parâmetro: ${paramName.trim()}:${paramType ? paramType.trim() : 'any'}`);
      }
      else if (line.match(/--\s*@returnType(?:\s*:)?/)) {
        returnType = line.replace(/--\s*@returnType(?:\s*:)?\s*/, '').trim();
        console.log(`Tipo de retorno: ${returnType}`);
      }
      else if (line.match(/--\s*@returnSingle(?:\s*:)?/)) {
        const value = line.replace(/--\s*@returnSingle(?:\s*:)?\s*/, '').trim();
        returnSingle = value.toLowerCase() === 'true';
        console.log(`Retorno único: ${returnSingle}`);
      }
      else if (line.match(/--\s*@return(?:\s*:)?/)) {
        const fieldInfo = line.replace(/--\s*@return(?:\s*:)?\s*/, '').trim();
        console.log(`Campo de retorno: ${fieldInfo}`);

        this.parseReturnField(fieldInfo, returnFields);
      }
    }
    
    if (sqlLines.length === 0) {
      console.log(`Nenhum SQL encontrado para a consulta ${name}`);
      return null;
    }
    
    const sql = sqlLines.join('\n');
    console.log(`SQL encontrado com ${sqlLines.length} linhas`);
    
    return {
      name,
      description,
      sql,
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

    const fieldParts = fieldPart.split('.');
    let sourceTable: string | undefined;
    let sourceField: string;
    
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
      }
    }
    
    console.log(`Campo processado: campo=${sourceField}, tabela=${sourceTable}, alias=${alias}, tipo=${type}`);
    
    returnFields.push({
      sourceField,
      sourceTable,
      alias: alias || sourceField,
      type
    });
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
      /(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?|\s+)(\w+)(?:\s+|$|\n)/gi,
      /(?:FROM|JOIN)\s+(\w+)\s+(\w)(?:\s+|$|\n)/gi
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