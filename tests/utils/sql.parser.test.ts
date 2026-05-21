import { jest } from '@jest/globals';
import { SQLParserImpl } from '../../src/utils/sql.parser.js';
import { SQLFormatter } from '../../src/utils/sql-formatter.js';

import { TypeInferer } from '../../src/utils/type-inferer.js';
import { ParameterMatcher } from '../../src/utils/parameter.matcher.js';

describe('SQLParserImpl', () => {
  let sqlParser: SQLParserImpl;
  let sqlFormatter: jest.Mocked<SQLFormatter>;
  let typeInferer: TypeInferer;
  let parameterMatcher: ParameterMatcher;

  beforeEach(() => {
    sqlFormatter = {
      processQueryForTypeScript: jest.fn(sql => sql),
      applyReturnFieldAliases: jest.fn((sql, _fields) => sql),
      isSqlFunction: jest.fn(() => false),
      determineSqlExpressionType: jest.fn(() => 'string'),
    } as any;

    typeInferer = new TypeInferer();
    parameterMatcher = new ParameterMatcher();

    sqlParser = new SQLParserImpl(sqlFormatter, typeInferer, parameterMatcher);
  });

  describe('parseFile', () => {
    it('should parse a simple SQL block with annotations', () => {
      const content = `
-- @name getUserById
-- @description Get user by its ID
-- @param id: number
-- @returnType User
SELECT * FROM users WHERE id = ?;
      `;

      const result = sqlParser.parseFile(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'getUserById',
        description: 'Get user by its ID',
        params: [{ name: 'id', type: 'number' }],
        returnType: 'User',
      });
    });

    it('should parse multiple SQL blocks', () => {
      const content = `
-- @name getOne
SELECT 1;

-- @name getTwo
SELECT 2;
      `;

      const result = sqlParser.parseFile(content);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('getOne');
      expect(result[1].name).toBe('getTwo');
    });

    it('should parse annotations in block comments', () => {
      const content = `
/* 
   @name getWithBlock 
   @description Description in block
*/
SELECT 1;
      `;

      const result = sqlParser.parseFile(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'getWithBlock',
        description: 'Description in block',
      });
    });

    it('should resolve table aliases in return fields', () => {
      const content = `
-- @name getUserAlias
-- @return u.name to userName
SELECT u.name FROM users u;
      `;

      const result = sqlParser.parseFile(content);

      expect(result).toHaveLength(1);
      expect(result[0].returnFields).toBeDefined();
      expect(result[0].returnFields![0]).toMatchObject({
        sourceTable: 'users',
        sourceField: 'name',
        alias: 'userName'
      });
    });
  });

  describe('extractTableNames', () => {
    it('should extract table names from simple query', () => {
      const sql = 'SELECT * FROM users JOIN orders ON users.id = orders.user_id';
      const tables = sqlParser.extractTableNames(sql);
      expect(tables).toContain('users');
      expect(tables).toContain('orders');
    });
  });
});
