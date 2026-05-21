import { injectable } from 'inversify';

@injectable()
export class TypeInferer {
  private defaultTypeMap: Record<string, string> = {
    'int': 'number',
    'integer': 'number',
    'smallint': 'number',
    'tinyint': 'number',
    'mediumint': 'number',
    'longlong': 'number',
    'int24': 'number',
    'newdecimal': 'number',
    'short': 'number',
    'tiny': 'number',
    'long': 'number',
    'float': 'number',
    'double': 'number',
    'decimal': 'number',
    'numeric': 'number',
    'varchar': 'string',
    'text': 'string',
    'char': 'string',
    'enum': 'string',
    'set': 'string',
    'blob': 'Buffer',
    'date': 'Date',
    'datetime': 'Date',
    'timestamp': 'Date',
    'time': 'string',
    'year': 'number',
    'boolean': 'boolean',
    'tinyint(1)': 'boolean',
    'json': 'any',
    'bit': 'number',
    'binary': 'Buffer',
    'varbinary': 'Buffer',
    'tinyblob': 'Buffer',
    'mediumblob': 'Buffer',
    'longblob': 'Buffer'
  };

  private customTypeMap: Record<string, string> = {};

  setCustomTypes(customTypes: Record<string, string>): void {
    this.customTypeMap = customTypes;
  }

  mapSqlTypeToTs(sqlType: string): string {
    if (!sqlType) return 'any';
    
    const normalizedType = sqlType.toLowerCase();
    
    // Check custom types first
    if (this.customTypeMap[normalizedType]) {
      return this.customTypeMap[normalizedType];
    }

    // Extract base type for cases like varchar(255)
    const baseType = normalizedType.split('(')[0].trim();
    
    if (this.customTypeMap[baseType]) {
      return this.customTypeMap[baseType];
    }

    return this.defaultTypeMap[normalizedType] || this.defaultTypeMap[baseType] || 'any';
  }

  infer(fieldName: string, currentType?: string): string {
    if (currentType && currentType !== 'any' && currentType !== 'string') {
      return this.mapSqlTypeToTs(currentType);
    }

    const name = fieldName.toLowerCase();
    
    // Check for ID patterns
    if (name === 'id' || name.endsWith('_id') || name.endsWith('id')) {
      return 'number';
    }
    
    // Check for Date/Time patterns
    if (
      name.includes('date') || 
      name.includes('time') || 
      name.endsWith('_at') || 
      name === 'created_at' || 
      name === 'updated_at'
    ) {
      return 'Date';
    }
    
    // Check for Boolean patterns
    if (
      name.startsWith('is_') || 
      name.startsWith('has_') || 
      name.startsWith('should_') ||
      name === 'active' ||
      name === 'enabled'
    ) {
      return 'boolean';
    }
    
    // Check for String patterns
    if (
      name.includes('email') || 
      name.includes('name') || 
      name.includes('description') ||
      name.includes('slug') ||
      name.includes('token')
    ) {
      return 'string';
    }
    
    return 'any';
  }
}
