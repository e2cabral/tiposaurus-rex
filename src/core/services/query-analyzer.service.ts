import { injectable, inject } from 'inversify';
import { DatabaseConnector } from '../domain/interfaces/database.interface';
import { SQLParser } from '../domain/interfaces/sql.interface';
import { QueryDefinition, ReturnField } from '../domain/interfaces/template.interface';

@injectable()
export class QueryAnalyzerService {
  constructor(
    @inject('DatabaseConnector') private db: DatabaseConnector,
    @inject('SQLParser') private sqlParser: SQLParser
  ) {}

  async analyzeQueryWithFields(query: QueryDefinition): Promise<QueryDefinition> {
    if (!query.returnFields || query.returnFields.length === 0) {
      return query;
    }

    try {
      let enrichedFields: ReturnField[] = [...query.returnFields];

      const customType = this.generateCustomInterface(query.returnType, enrichedFields);
      
      return {
        ...query,
        returnFields: enrichedFields,
        customTypes: [customType]
      };
    } catch (error) {
      console.error('Erro ao analisar consulta:', error);
      const customType = this.generateCustomInterface(query.returnType, query.returnFields);
      
      return {
        ...query,
        customTypes: [customType]
      };
    }
  }

  private generateCustomInterface(typeName: string, fields: ReturnField[]): string {
    const interfaceName = typeName.replace(/\[\]/g, '');

    const fieldDefinitions = fields.map(field => {
      const nullable = field.nullable ? '?' : '';
      return `  ${field.alias}${nullable}: ${field.type || 'any'};`;
    });
    
    return `export interface ${interfaceName} {\n${fieldDefinitions.join('\n')}\n}`;
  }

  private mapSQLTypeToTS(sqlType: string): string {
    const typeMap: Record<string, string> = {
      'int': 'number',
      'smallint': 'number',
      'tinyint': 'number',
      'mediumint': 'number',
      'bigint': 'number',
      'float': 'number',
      'double': 'number',
      'decimal': 'number',
      'varchar': 'string',
      'text': 'string',
      'char': 'string',
      'enum': 'string',
      'date': 'Date',
      'datetime': 'Date',
      'timestamp': 'Date',
      'boolean': 'boolean',
      'tinyint(1)': 'boolean'
    };

    if (!sqlType) return 'any';
    
    const baseType = sqlType.split('(')[0].toLowerCase();
    
    return typeMap[baseType] || typeMap[sqlType] || 'any';
  }
}