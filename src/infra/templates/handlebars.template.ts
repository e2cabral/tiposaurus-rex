import {injectable} from 'inversify';
import fs from 'fs/promises';
import {TemplateContext, TemplateEngine} from "../../core/domain/interfaces/template.interface.js";
import Handlebars from "handlebars";

@injectable()
export class HandlebarsTemplateEngine implements TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars;
    this.registerDefaultHelpers();
  }

  registerPartial(name: string, template: string): void {
    this.handlebars.registerPartial(name, template);
  }

  registerHelper(name: string, fn: Function): void {
    this.handlebars.registerHelper(name, fn as any);
  }

  compile(template: string, context: TemplateContext): string {
    const compiledTemplate = this.handlebars.compile(template);
    return compiledTemplate(context);
  }

  async renderFromFile(templatePath: string, context: TemplateContext): Promise<string> {
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      return this.compile(templateContent, context);
    } catch (error) {
      throw new Error(`Erro ao renderizar template ${templatePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private registerDefaultHelpers(): void {
    this.registerStringHelpers();
    this.registerCaseHelpers();
    this.registerTypeHelpers();
  }

  private registerStringHelpers(): void {
    this.handlebars.registerHelper('capitalize', (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    this.handlebars.registerHelper('singular', (str) => {
      if (!str) return '';
      return str.endsWith('s') ? str.slice(0, -1) : str;
    });
  }

  private registerCaseHelpers(): void {
    this.handlebars.registerHelper('pascalCase', (str) => {
      if (!str) return '';
      str = this.normalizeString(str);
      return this.toPascalCase(str);
    });

    this.handlebars.registerHelper('camelCase', (str) => {
      if (!str) return '';
      str = this.normalizeString(str);
      const pascal = this.toPascalCase(str);
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    });
  }

  private registerTypeHelpers(): void {
    this.handlebars.registerHelper('isArray', (str) => {
      return typeof str === 'string' && str.endsWith('[]');
    });

    this.handlebars.registerHelper('baseType', (str) => {
      if (!str || typeof str !== 'string') return str;
      return str.replace('[]', '');
    });
  }

  private normalizeString(str: unknown | string): string {
    if (typeof str !== 'string') {
      str = String(str);
    }
    return (str as string).replace(/\./g, '_');
  }

  private toPascalCase(str: string): string {
    str = str.replace(/([a-z])([A-Z])/g, '$1 $2');

    const commonWords = ['By', 'For', 'From', 'With', 'To', 'In', 'And', 'Or'];

    commonWords.forEach(word => {
      const pattern = new RegExp(`\\b${word}\\b`, 'g');
      str = str.replace(pattern, ` ${word} `);
    });

    return str.split(/[-_\s.]+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  renderFromString(template: string, context: any): Promise<string> {
    try {
      return Promise.resolve(this.compile(template, context));
    } catch (error) {
      return Promise.reject(new Error(`Erro ao renderizar template: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}