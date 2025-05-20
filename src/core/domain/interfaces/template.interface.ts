export interface QueryDefinition {
  name: string;
  description?: string;
  sql: string;
  params: QueryParameter[];
  returnType: string;
  returnSingle: boolean;
  returnFields?: ReturnField[];
  customTypes?: string[];
}

export interface QueryParameter {
  name: string;
  type: string;
}

export interface ReturnField {
  sourceField: string;
  alias?: string;
  sourceTable?: string;
  type?: string;
  nullable?: boolean;
  isFunction?: boolean;
  functionInfo?: {
    outerFunctionName?: string;
    returnType?: string;
  };
}

export interface TemplateContext {
  timestamp: string;
  tables?: any[];
  queries?: any[];
  query?: any;
  inSingleFile?: boolean;
  customInterfaces?: string[];
}

export interface TemplateEngine {
  renderFromFile(templatePath: string, context: any): Promise<string>;
  renderFromString(template: string, context: any): Promise<string>;
}