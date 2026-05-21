import { jest } from '@jest/globals';
import { ContextBuilderService } from '../../../src/core/services/context-builder.service.js';
import { DatabaseConnector } from '../../../src/core/domain/interfaces/database.interface.js';
import { SQLParser } from '../../../src/core/domain/interfaces/sql.interface.js';
import { TypeInferer } from '../../../src/utils/type-inferer.js';
import { QueryAnalyzerService } from '../../../src/core/services/query-analyzer.service.js';
import { UIService } from '../../../src/cli/ui/ui.service.js';

describe('ContextBuilderService', () => {
  let contextBuilder: ContextBuilderService;
  let dbConnector: jest.Mocked<DatabaseConnector>;
  let sqlParser: jest.Mocked<SQLParser>;
  let typeInferer: TypeInferer;
  let queryAnalyzer: jest.Mocked<QueryAnalyzerService>;
  let ui: jest.Mocked<UIService>;

  beforeEach(() => {
    dbConnector = {
      describeTable: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    sqlParser = {
      extractTableNames: jest.fn(),
    } as any;

    typeInferer = new TypeInferer();

    queryAnalyzer = {
      analyzeQueryWithFields: jest.fn(q => Promise.resolve(q)),
    } as any;

    ui = {
      updateSpinner: jest.fn(),
      warning: jest.fn(),
    } as any;

    contextBuilder = new ContextBuilderService(
      dbConnector,
      sqlParser,
      typeInferer,
      queryAnalyzer,
      ui
    );
  });

  it('should build context with table metadata and enriched queries', async () => {
    const queries = [
      { name: 'getUsers', sql: 'SELECT * FROM users', params: [], returnType: 'User', returnSingle: false }
    ];

    sqlParser.extractTableNames.mockReturnValue(['users']);
    dbConnector.describeTable.mockResolvedValue({
      name: 'users',
      columns: [
        { name: 'id', type: 'int', nullable: false },
        { name: 'name', type: 'varchar', nullable: true }
      ]
    });

    const context = await contextBuilder.buildContext(queries);

    expect(context.tables).toHaveLength(1);
    expect(context.tables![0].tableName).toBe('users');
    expect(context.tables![0].interfaceName).toBe('User');
    expect(context.tables![0].fields).toContainEqual({ name: 'id', type: 'number', nullable: false });
    
    expect(context.queries).toHaveLength(1);
    expect(context.queries![0].name).toBe('getUsers');
  });

  it('should handle missing table metadata gracefully', async () => {
    const queries = [
      { name: 'getUsers', sql: 'SELECT * FROM unknown_table', params: [], returnType: 'any', returnSingle: false }
    ];

    sqlParser.extractTableNames.mockReturnValue(['unknown_table']);
    dbConnector.describeTable.mockRejectedValue(new Error('Table not found'));

    const context = await contextBuilder.buildContext(queries);

    expect(context.tables).toHaveLength(0);
    expect(ui.warning).toHaveBeenCalled();
  });
});
