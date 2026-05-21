import { TypeInferer } from '../../src/utils/type-inferer.js';

describe('TypeInferer', () => {
  let inferer: TypeInferer;

  beforeEach(() => {
    inferer = new TypeInferer();
  });

  test('should map basic SQL types to TS types', () => {
    expect(inferer.mapSqlTypeToTs('varchar(255)')).toBe('string');
    expect(inferer.mapSqlTypeToTs('int')).toBe('number');
    expect(inferer.mapSqlTypeToTs('decimal(10,2)')).toBe('number');
    expect(inferer.mapSqlTypeToTs('datetime')).toBe('Date');
    expect(inferer.mapSqlTypeToTs('boolean')).toBe('boolean');
    expect(inferer.mapSqlTypeToTs('tinyint(1)')).toBe('boolean');
  });

  test('should respect custom types', () => {
    inferer.setCustomTypes({ 'decimal': 'string', 'timestamp': 'Date' });
    expect(inferer.mapSqlTypeToTs('decimal(10,2)')).toBe('string');
    expect(inferer.mapSqlTypeToTs('timestamp')).toBe('Date');
  });

  test('should infer types based on field name if current type is unknown', () => {
    expect(inferer.infer('id', 'any')).toBe('number');
    expect(inferer.infer('email', 'any')).toBe('string');
    expect(inferer.infer('created_at', 'any')).toBe('Date');
    expect(inferer.infer('is_active', 'any')).toBe('boolean');
  });

  test('should return "any" for unknown types', () => {
    expect(inferer.mapSqlTypeToTs('unknown_type')).toBe('any');
  });

  test('should handle binary types', () => {
    expect(inferer.mapSqlTypeToTs('blob')).toBe('Buffer');
    expect(inferer.mapSqlTypeToTs('binary')).toBe('Buffer');
    expect(inferer.mapSqlTypeToTs('varbinary(255)')).toBe('Buffer');
  });

  test('should handle JSON types', () => {
    expect(inferer.mapSqlTypeToTs('json')).toBe('any');
  });

  test('should return "any" if it cannot infer', () => {
    expect(inferer.infer('random_field', 'any')).toBe('any');
  });
});
