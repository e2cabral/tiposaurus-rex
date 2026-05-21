import { jest } from '@jest/globals';
import { QueryAnalyzerService } from '../../../src/core/services/query-analyzer.service.js';
import { TypeInferer } from '../../../src/utils/type-inferer.js';
import { DatabaseConnector } from '../../../src/core/domain/interfaces/database.interface.js';

describe('QueryAnalyzerService', () => {
  let queryAnalyzer: QueryAnalyzerService;
  let mockDb: jest.Mocked<DatabaseConnector>;
  let typeInferer: TypeInferer;

  beforeEach(() => {
    mockDb = {
      describeTable: jest.fn(),
      getQueryMetadata: jest.fn(),
    } as any;
    typeInferer = new TypeInferer();
    queryAnalyzer = new QueryAnalyzerService(mockDb, typeInferer);
  });

  describe('analyzeQueryWithFields', () => {
    it('should enrich fields with query metadata first', async () => {
      const query = {
        name: 'test',
        sql: 'SELECT COUNT(*) as total FROM users',
        returnType: 'CountResult',
        returnSingle: true,
        returnFields: [
          { sourceField: 'COUNT(*)', alias: 'total', isFunction: true }
        ]
      } as any;

      mockDb.getQueryMetadata.mockResolvedValue([
        { name: 'total', type: 'LONGLONG', nullable: false }
      ]);

      const result = await queryAnalyzer.analyzeQueryWithFields(query);

      expect(result.returnFields![0].type).toBe('number');
      expect(result.returnFields![0].nullable).toBe(false);
      expect(result.customTypes![0]).toContain('interface CountResult');
      expect(result.customTypes![0]).toContain('total: number;');
    });

    it('should fallback to describeTable if query metadata is not available', async () => {
      const query = {
        name: 'test',
        sql: 'SELECT u.id, u.name FROM users u',
        returnType: 'User',
        returnSingle: false,
        returnFields: [
          { sourceField: 'id', sourceTable: 'users', alias: 'id' },
          { sourceField: 'name', sourceTable: 'users', alias: 'name' }
        ]
      } as any;

      mockDb.getQueryMetadata.mockResolvedValue([]);
      mockDb.describeTable.mockResolvedValue({
        name: 'users',
        columns: [
          { name: 'id', type: 'int', nullable: false },
          { name: 'name', type: 'varchar(255)', nullable: true }
        ]
      });

      const result = await queryAnalyzer.analyzeQueryWithFields(query);

      expect(result.returnFields![0].type).toBe('number');
      expect(result.returnFields![0].nullable).toBe(false);
      expect(result.returnFields![1].type).toBe('string');
      expect(result.returnFields![1].nullable).toBe(true);
      expect(result.customTypes![0]).toContain('interface User');
      expect(result.customTypes![0]).toContain('id: number;');
      expect(result.customTypes![0]).toContain('name?: string;');
    });
  });
});
