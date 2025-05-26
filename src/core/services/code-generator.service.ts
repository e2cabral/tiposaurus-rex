import { inject, injectable } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import prettier from 'prettier';
import {
  QueryDefinition,
  TemplateContext,
  TemplateEngine,
} from '../domain/interfaces/template.interface.js';
import { DatabaseConnector, TableMetadata } from '../domain/interfaces/database.interface.js';
import { SQLParser } from '../domain/interfaces/sql.interface.js';
import { UIService } from '../../cli/ui/ui.service.js';
import { QueryAnalyzerService } from './query-analyzer.service.js';
import { SQLFormatter } from '../../utils/sql-formatter.js';

@injectable()
export class CodeGeneratorService {
  private typeMap: Record<string, string> = {
    int: 'number',
    smallint: 'number',
    tinyint: 'number',
    mediumint: 'number',
    bigint: 'number',
    float: 'number',
    double: 'number',
    decimal: 'number',
    varchar: 'string',
    text: 'string',
    char: 'string',
    enum: 'string',
    date: 'Date',
    datetime: 'Date',
    timestamp: 'Date',
    boolean: 'boolean',
    'tinyint(1)': 'boolean',
  };

  constructor(
    @inject('TemplateEngine') private templateEngine: TemplateEngine,
    @inject('DatabaseConnector') private dbConnector: DatabaseConnector,
    @inject('SQLParser') private sqlParser: SQLParser,
    @inject(UIService) private ui: UIService,
    @inject(QueryAnalyzerService) private queryAnalyzer: QueryAnalyzerService,
    @inject(SQLFormatter) private sqlFormatter: SQLFormatter
  ) {}

  async generateTypesForQueries(
    queries: QueryDefinition[],
    outputPath: string,
    templateDir: string,
    customTypes?: Record<string, string>
  ): Promise<void> {
    try {
      this.ui.startSpinner(`Gerando tipos para ${queries.length} consultas...`);

      if (customTypes) {
        this.typeMap = { ...this.typeMap, ...customTypes };
      }

      const timestamp = new Date().toISOString();

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

      this.ui.updateSpinner(
        `Gerando código para ${queries.length} consultas e ${tableMetadata.length} tabelas...`
      );

      const formattedQueries = queries.map(query => ({
        ...query,
        sql: this.sqlFormatter.processQueryForTypeScript(query.sql),
      }));

      const enrichedQueries: QueryDefinition[] = [];
      const customInterfaces: string[] = [];

      for (const query of formattedQueries) {
        this.ui.updateSpinner(`Processando consulta ${query.name}...`);

        try {
          if (query.returnFields && query.returnFields.length > 0) {
            const interfaceName = query.returnType.replace(/\[\]/g, '');
            const interfaceContent = this.generateCustomInterface(
              interfaceName,
              query.returnFields
            );

            console.log(`Interface gerada para ${interfaceName}:`, interfaceContent);

            if (!customInterfaces.includes(interfaceContent)) {
              customInterfaces.push(interfaceContent);
            }

            enrichedQueries.push(query);
          } else {
            enrichedQueries.push(query);
          }
        } catch (error) {
          this.ui.warning(
            `Erro ao processar consulta ${query.name}: ${error instanceof Error ? error.message : String(error)}`
          );
          enrichedQueries.push(query);
        }
      }

      const context = {
        timestamp,
        tables: tableMetadata.map(metadata => ({
          tableName: metadata.name,
          interfaceName: this.formatInterfaceName(metadata.name),
          fields: metadata.columns.map(col => ({
            name: col.name,
            type: this.mapDBTypeToTS(col.type),
            nullable: col.nullable,
          })),
        })),
        queries: enrichedQueries.map(query => ({
          name: query.name,
          description: query.description,
          sql: query.sql,
          params: query.params,
          returnType: query.returnType,
          returnSingle: query.returnSingle,
          returnFields: query.returnFields,
        })),
        customInterfaces: customInterfaces.length > 0 ? customInterfaces : undefined,
      };

      console.log(
        'Contexto para renderização:',
        JSON.stringify({
          tablesCount: context.tables.length,
          queriesCount: context.queries.length,
          customInterfacesCount: context.customInterfaces?.length || 0,
        })
      );

      let generatedCode: string;
      try {
        const unifiedTemplatePath = path.join(templateDir, 'unified.hbs');
        await fs.access(unifiedTemplatePath);

        this.ui.updateSpinner('Usando template unificado...');
        generatedCode = await this.templateEngine.renderFromFile(unifiedTemplatePath, context);
      } catch {
        this.ui.updateSpinner('Template unificado não encontrado, gerando código em partes...');
        const contentParts = [];

        for (const table of context.tables) {
          const rendered = await this.templateEngine.renderFromFile(
            path.join(templateDir, 'interface.hbs'),
            {
              tableName: table.tableName,
              interfaceName: table.interfaceName,
              fields: table.fields,
              timestamp,
            }
          );
          contentParts.push(rendered);
        }

        if (customInterfaces.length > 0) {
          contentParts.push(
            '/**\n * Interfaces personalizadas\n * @generated Este arquivo foi gerado automaticamente - NÃO EDITAR\n * @timestamp ' +
              timestamp +
              '\n */'
          );
          contentParts.push(...customInterfaces);
        }

        for (const query of context.queries) {
          const queryContext: TemplateContext = {
            query: {
              ...query,
              sql: query.sql,
            },
            timestamp,
          };

          const rendered = await this.templateEngine.renderFromFile(
            path.join(templateDir, 'query.hbs'),
            queryContext
          );
          contentParts.push(rendered);
        }

        const modifiedIndexContext: TemplateContext = {
          queries: context.queries,
          inSingleFile: true,
          timestamp,
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
        printWidth: 100,
      });

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, formattedCode);

      this.ui.stopSpinner(true, `Tipos gerados em ${outputPath}`);
    } catch (error) {
      this.ui.stopSpinner(
        false,
        `Erro ao gerar tipos: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private formatInterfaceName(tableName: string): string {
    const singular = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
    return singular
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private mapDBTypeToTS(dbType: string): string {
    const baseType = dbType.toLowerCase().replace(/\(\d+\)/, '');
    return this.typeMap[baseType] || this.typeMap[dbType] || 'any';
  }

  private generateCustomInterface(interfaceName: string, fields: any[]): string {
    const fieldDefinitions = fields
      .map(field => {
        const fieldName = field.alias || field.sourceField;
        const fieldType = field.type || 'any';
        const nullable = field.nullable ? '?' : '';

        return `  ${fieldName}${nullable}: ${fieldType};`;
      })
      .join('\n');

    return `export interface ${interfaceName} {\n${fieldDefinitions}\n}`;
  }
}
