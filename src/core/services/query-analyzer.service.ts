import { injectable, inject } from 'inversify';
import { DatabaseConnector, ColumnMetadata } from '../domain/interfaces/database.interface.js';
import { QueryDefinition, ReturnField } from '../domain/interfaces/template.interface.js';
import { TypeInferer } from '../../utils/type-inferer.js';

@injectable()
export class QueryAnalyzerService {
  constructor(
    @inject('DatabaseConnector') private db: DatabaseConnector,
    @inject(TypeInferer) private typeInferer: TypeInferer
  ) {}

  async analyzeQueryWithFields(query: QueryDefinition): Promise<QueryDefinition> {
    const returnFields = query.returnFields || [];
    const enrichedFields: ReturnField[] = [];

    // 1. Try to get real query metadata (most accurate for functions/expressions)
    let queryMetadata: ColumnMetadata[] = [];
    try {
      // Replace ? parameters with NULL to get metadata without errors
      const paramCount = (query.sql.match(/\?/g) || []).length;
      const dummyParams = new Array(paramCount).fill(null);
      queryMetadata = await this.db.getQueryMetadata(query.sql, dummyParams);
    } catch {
      // Silent fallback
    }

    for (const field of returnFields) {
      const enriched = { ...field };
      
      // Try to find in query metadata first
      const queryMeta = queryMetadata.find(
        m => m.name.toLowerCase() === (enriched.alias || enriched.sourceField).toLowerCase()
      );

      if (queryMeta) {
        enriched.type = this.typeInferer.mapSqlTypeToTs(queryMeta.type);
        enriched.nullable = queryMeta.nullable;
      } 
      // Fallback to describeTable if table/field is available and type is still any
      else if (enriched.sourceTable && enriched.sourceField && (!enriched.type || enriched.type === 'any')) {
        try {
          const tableMeta = await this.db.describeTable(enriched.sourceTable);
          const colMeta = tableMeta.columns.find(c => c.name === enriched.sourceField);
          if (colMeta) {
            enriched.type = this.typeInferer.mapSqlTypeToTs(colMeta.type);
            enriched.nullable = colMeta.nullable;
          }
        } catch {
          // Silent fallback to inference
          enriched.type = this.typeInferer.infer(enriched.sourceField, enriched.type);
        }
      }

      // If still no type, infer
      if (!enriched.type || enriched.type === 'any') {
        enriched.type = this.typeInferer.infer(enriched.sourceField, enriched.type);
      }

      enrichedFields.push(enriched);
    }

    const customType = this.generateCustomInterface(query.returnType, enrichedFields);
    
    return {
      ...query,
      returnFields: enrichedFields,
      customTypes: [customType]
    };
  }

  generateCustomInterface(typeName: string, fields: ReturnField[]): string {
    const interfaceName = typeName.replace(/\[\]/g, '');

    const fieldDefinitions = fields.map(field => {
      const nullable = field.nullable ? '?' : '';
      return `  ${field.alias}${nullable}: ${field.type || 'any'};`;
    });
    
    return `export interface ${interfaceName} {\n${fieldDefinitions.join('\n')}\n}`;
  }
}