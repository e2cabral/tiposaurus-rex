import 'reflect-metadata';
import { SQLFormatter } from '../../src/utils/sql-formatter.js';

describe('SQLFormatter', () => {
  let sqlFormatter: SQLFormatter;

  beforeEach(() => {
    sqlFormatter = new SQLFormatter();
  });

  describe('isSqlFunction', () => {
    it('should identify basic functions', () => {
      expect(sqlFormatter.isSqlFunction('COUNT(*)')).toBe(true);
      expect(sqlFormatter.isSqlFunction('SUM(total)')).toBe(true);
      expect(sqlFormatter.isSqlFunction('LOWER(name)')).toBe(true);
    });

    it('should identify nested functions', () => {
      expect(sqlFormatter.isSqlFunction('COALESCE(SUM(total), 0)')).toBe(true);
      expect(sqlFormatter.isSqlFunction('DATE_FORMAT(NOW(), "%Y-%m-%d")')).toBe(true);
    });

    it('should not identify regular fields as functions', () => {
      expect(sqlFormatter.isSqlFunction('id')).toBe(false);
      expect(sqlFormatter.isSqlFunction('u.name')).toBe(false);
      expect(sqlFormatter.isSqlFunction('users.email')).toBe(false);
    });
  });

  describe('determineSqlExpressionType', () => {
    it('should return number for aggregate functions', () => {
      expect(sqlFormatter.determineSqlExpressionType('COUNT(*)')).toBe('number');
      expect(sqlFormatter.determineSqlExpressionType('SUM(price)')).toBe('number');
      expect(sqlFormatter.determineSqlExpressionType('AVG(rating)')).toBe('number');
    });

    it('should return string for string manipulation functions', () => {
      expect(sqlFormatter.determineSqlExpressionType('CONCAT(first_name, " ", last_name)')).toBe('string');
      expect(sqlFormatter.determineSqlExpressionType('LOWER(email)')).toBe('string');
    });

    it('should return Date for date functions', () => {
      expect(sqlFormatter.determineSqlExpressionType('NOW()')).toBe('Date');
      expect(sqlFormatter.determineSqlExpressionType('DATE(created_at)')).toBe('Date');
    });
  });

  describe('processQueryForTypeScript', () => {
    it('should strip @name annotations from SQL', () => {
      const sql = '-- @name testQuery\nSELECT * FROM users';
      const result = sqlFormatter.processQueryForTypeScript(sql);
      expect(result).not.toContain('@name');
      expect(result).toContain('SELECT * FROM users');
    });

    it('should strip JSDoc style @name annotations', () => {
      const sql = '/* @name testQuery */\nSELECT * FROM users';
      const result = sqlFormatter.processQueryForTypeScript(sql);
      expect(result).not.toContain('@name');
      expect(result).toContain('SELECT * FROM users');
    });
  });

  describe('extractTableAliases', () => {
    it('should extract simple aliases', () => {
      const sql = 'SELECT u.name FROM users u';
      const aliases = sqlFormatter.extractTableAliases(sql);
      expect(aliases.get('u')).toBe('users');
    });

    it('should extract aliases with AS keyword', () => {
      const sql = 'SELECT u.name FROM users AS u JOIN profiles AS p ON u.id = p.user_id';
      const aliases = sqlFormatter.extractTableAliases(sql);
      expect(aliases.get('u')).toBe('users');
      expect(aliases.get('p')).toBe('profiles');
    });

    it('should handle complex joins', () => {
      const sql = `
        SELECT u.name, o.total 
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
        LEFT JOIN payments p ON o.id = p.order_id
      `;
      const aliases = sqlFormatter.extractTableAliases(sql);
      expect(aliases.get('u')).toBe('users');
      expect(aliases.get('o')).toBe('orders');
      expect(aliases.get('p')).toBe('payments');
    });
  });

  describe('formatSqlAliases', () => {
    it('should convert snake_case aliases to camelCase', () => {
      const sql = 'SELECT u.first_name user_first_name FROM users u';
      const result = sqlFormatter.formatSqlAliases(sql);
      expect(result).toContain('u.first_name AS userFirstName');
    });

    it('should not add AS to reserved words', () => {
      const sql = 'SELECT id FROM users WHERE active = 1';
      const result = sqlFormatter.formatSqlAliases(sql);
      expect(result).toBe(sql);
    });
  });

  describe('addMissingAliasesToFunctions', () => {
    it('should add property aliases to functions without alias', () => {
      const sql = 'SELECT COUNT(*), SUM(total) FROM orders';
      const result = sqlFormatter.applyReturnFieldAliases(sql, undefined);
      expect(result).toContain('COUNT(*) AS property1');
      expect(result).toContain('SUM(total) AS property2');
    });

    it('should not add alias if already present', () => {
      const sql = 'SELECT COUNT(*) AS total_count FROM orders';
      const result = sqlFormatter.applyReturnFieldAliases(sql, undefined);
      expect(result).toContain('COUNT(*) AS total_count');
      expect(result).not.toContain('property1');
    });
  });

  describe('fixInvalidSQLSyntax', () => {
    it('should remove aliases from WHERE clause', () => {
      const sql = 'SELECT u.id AS userId FROM users u WHERE u.id AS userId = 1';
      const result = sqlFormatter.fixInvalidSQLSyntax(sql);
      expect(result).toBe('SELECT u.id AS userId FROM users u WHERE u.id = 1');
    });

    it('should remove aliases from ON clause', () => {
      const sql = 'SELECT * FROM users u JOIN orders o ON u.id AS userId = o.user_id';
      const result = sqlFormatter.fixInvalidSQLSyntax(sql);
      expect(result).toBe('SELECT * FROM users u JOIN orders o ON u.id = o.user_id');
    });
  });
});
