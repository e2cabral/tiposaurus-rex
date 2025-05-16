import { injectable, inject } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import prettier from 'prettier';
import { TemplateEngine, TemplateContext, QueryDefinition } from '@core/domain/interfaces/template.interface.js';
import { DatabaseConnector, TableMetadata } from '@core/domain/interfaces/database.interface.js';
import { UIService } from '../../cli/ui/ui.service';
import { SQLParser } from '@core/domain/interfaces/sql.interface.js';

@injectable()
export class CodeGeneratorService {
  private typeMap: Record<string, string> = {
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

  constructor(
    @inject('TemplateEngine') private templateEngine: TemplateEngine,
    @inject('DatabaseConnector') private dbConnector: DatabaseConnector,
    @inject('SQLParser') private sqlParser: SQLParser,
    @inject(UIService) private ui: UIService
  ) {}

  async generateTypesForQueries(
    queries: QueryDefinition[],
    outputFile: string,
    templateDir: string,
    customTypes?: Record<string, string>
  ): Promise<void> {
    try {
      this.ui.startSpinner(`Gerando tipos para ${queries.length} consultas...`);

      if (customTypes) {
        this.typeMap = { ...this.typeMap, ...customTypes };
      }

      const tableNames = new Set<string>();
      for (const query of queries) {
        const tables = this.sqlParser.extractTableNames(query.sql);
        tables.forEach(t => tableNames.add(t));
      }

      const tableMetadata: TableMetadata[] = [];
      let current = 0;
      const total = tableNames.size;

      for (const tableName of tableNames) {
        try {
          this.ui.updateSpinner(`Analisando tabela ${tableName} (${++current}/${total})...`);
          const metadata = await this.dbConnector.describeTable(tableName);
          tableMetadata.push(metadata);
        } catch (error) {
          this.ui.warning(`Não foi possível obter metadados da tabela ${tableName}`);
        }
      }

      this.ui.updateSpinner(`Gerando código para ${queries.length} consultas e ${tableMetadata.length} tabelas...`);

      const timestamp = new Date().toISOString();

      const unifiedContext = {
        timestamp,
        tables: tableMetadata.map(metadata => ({
          tableName: metadata.name,
          interfaceName: this.formatInterfaceName(metadata.name),
          fields: metadata.columns.map(col => ({
            name: col.name,
            type: this.mapDBTypeToTS(col.type),
            nullable: col.nullable
          }))
        })),
        queries: queries.map(query => ({
          name: query.name,
          description: query.description,
          sql: query.sql,
          params: query.params,
          returnType: query.returnType,
          returnSingle: query.returnSingle
        }))
      };

      let generatedCode: string;
      try {
        const unifiedTemplatePath = path.join(templateDir, 'unified.hbs');
        await fs.access(unifiedTemplatePath);

        this.ui.updateSpinner('Usando template unificado...');
        generatedCode = await this.templateEngine.renderFromFile(
          unifiedTemplatePath,
          unifiedContext
        );
      } catch (error) {
        this.ui.updateSpinner('Template unificado não encontrado, gerando código em partes...');
        let contentParts = [];

        for (const table of unifiedContext.tables) {
          const rendered = await this.templateEngine.renderFromFile(
            path.join(templateDir, 'interface.hbs'),
            {
              tableName: table.tableName,
              interfaceName: table.interfaceName,
              fields: table.fields,
              timestamp
            }
          );
          contentParts.push(rendered);
        }

        for (const query of unifiedContext.queries) {
          const context: TemplateContext = {
            query: {
              ...query,
              sql: query.sql
            },
            timestamp
          };

          const rendered = await this.templateEngine.renderFromFile(
            path.join(templateDir, 'query.hbs'),
            context
          );
          contentParts.push(rendered);
        }

        const modifiedIndexContext: TemplateContext = {
          queries: unifiedContext.queries,
          inSingleFile: true,
          timestamp
        };

        const indexContent = await this.templateEngine.renderFromFile(
          path.join(templateDir, 'index.hbs'),
          modifiedIndexContext
        );
        contentParts.push(indexContent);

        generatedCode = contentParts.join('\n\n');
      }

      this.ui.updateSpinner('Formatando código...');
      const formattedCode = await prettier.format(generatedCode, {
        parser: 'typescript',
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100
      });

      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.writeFile(outputFile, formattedCode);

      this.ui.stopSpinner(true, `Tipos gerados em ${outputFile}`);
    } catch (error) {
      this.ui.stopSpinner(false, `Erro ao gerar tipos: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private formatInterfaceName(tableName: string): string {
    const singular = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
    return singular.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private mapDBTypeToTS(dbType: string): string {
    const baseType = dbType.toLowerCase().replace(/\(\d+\)/, '');
    return this.typeMap[baseType] || this.typeMap[dbType] || 'any';
  }
}