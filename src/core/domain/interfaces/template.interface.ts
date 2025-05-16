export interface Field {
  name: string;
  type: string;
  nullable: boolean;
}

export interface QueryParameter {
  name: string;
  type: string;
}

export interface QueryDefinition {
  name: string;
  description?: string;
  sql: string;
  params: QueryParameter[];
  returnType: string;
  returnSingle: boolean;
}

export interface TemplateContext {
  tableName?: string;
  interfaceName?: string;
  fields?: Field[];
  query?: QueryDefinition;
  queries?: QueryDefinition[];
  timestamp?: string;
  author?: string;
  inSingleFile?: boolean;
}

export interface TemplateEngine {
  registerPartial(name: string, template: string): void;
  registerHelper(name: string, fn: Function): void;
  compile(template: string, context: TemplateContext): string;
  renderFromFile(templatePath: string, context: TemplateContext): Promise<string>;
}