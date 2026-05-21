import { injectable, inject } from 'inversify';
import { 
  QueryDefinition, 
  TemplateContext
} from '../domain/interfaces/template.interface.js';
import { DatabaseConnector, TableMetadata } from '../domain/interfaces/database.interface.js';
import { SQLParser } from '../domain/interfaces/sql.interface.js';
import { TypeInferer } from '../../utils/type-inferer.js';
import { QueryAnalyzerService } from './query-analyzer.service.js';
import { UIService } from '../../cli/ui/ui.service.js';

@injectable()
export class ContextBuilderService {
  constructor(
    @inject('DatabaseConnector') private dbConnector: DatabaseConnector,
    @inject('SQLParser') private sqlParser: SQLParser,
    @inject(TypeInferer) private typeInferer: TypeInferer,
    @inject(QueryAnalyzerService) private queryAnalyzer: QueryAnalyzerService,
    @inject(UIService) private ui: UIService
  ) {}

  async buildContext(queries: QueryDefinition[]): Promise<TemplateContext> {
    const timestamp = new Date().toISOString();
    
    // 1. Extract and fetch table metadata
    const tableNames = this.getUniqueTableNames(queries);
    const tableMetadata = await this.fetchTableMetadata(tableNames);
    
    // 2. Enrich queries with database information
    const { enrichedQueries, customInterfaces } = await this.enrichQueries(queries);

    // 3. Assemble the context
    return {
      timestamp,
      tables: tableMetadata.map(metadata => ({
        tableName: metadata.name,
        interfaceName: this.formatInterfaceName(metadata.name),
        fields: metadata.columns.map(col => ({
          name: col.name,
          type: this.typeInferer.mapSqlTypeToTs(col.type),
          nullable: col.nullable,
        })),
      })),
      queries: enrichedQueries,
      customInterfaces: customInterfaces.length > 0 ? customInterfaces : undefined,
    };
  }

  private getUniqueTableNames(queries: QueryDefinition[]): string[] {
    const tableNames = new Set<string>();
    for (const query of queries) {
      const tables = this.sqlParser.extractTableNames(query.sql);
      tables.forEach(t => tableNames.add(t));
    }
    return Array.from(tableNames);
  }

  private async fetchTableMetadata(tableNames: string[]): Promise<TableMetadata[]> {
    const tableMetadata: TableMetadata[] = [];
    let current = 0;
    const total = tableNames.length;

    for (const tableName of tableNames) {
      try {
        this.ui.updateSpinner(`Analyzing table ${tableName} (${++current}/${total})...`);
        const metadata = await this.dbConnector.describeTable(tableName);
        tableMetadata.push(metadata);
      } catch (error) {
        this.ui.warning(`Could not obtain metadata for table ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return tableMetadata;
  }

  private async enrichQueries(queries: QueryDefinition[]): Promise<{ enrichedQueries: QueryDefinition[], customInterfaces: string[] }> {
    const enrichedQueries: QueryDefinition[] = [];
    const customInterfaces: string[] = [];

    for (const query of queries) {
      this.ui.updateSpinner(`Processing query ${query.name}...`);
      try {
        const enriched = await this.queryAnalyzer.analyzeQueryWithFields(query);
        enrichedQueries.push(enriched);
        
        if (enriched.customTypes) {
          for (const customType of enriched.customTypes) {
            if (!customInterfaces.includes(customType)) {
              customInterfaces.push(customType);
            }
          }
        }
      } catch (error) {
        this.ui.warning(`Error analyzing query ${query.name}: ${error instanceof Error ? error.message : String(error)}`);
        enrichedQueries.push(query);
      }
    }

    return { enrichedQueries, customInterfaces };
  }

  private formatInterfaceName(tableName: string): string {
    const singular = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
    return singular
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
