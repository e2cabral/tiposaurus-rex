import { inject, injectable } from 'inversify';
import path from 'path';
import { TemplateEngine, TemplateContext } from '../domain/interfaces/template.interface.js';
import { FileSystemInterface } from '../domain/interfaces/file-system.interface.js';
import { LoggerService } from '../domain/interfaces/logger.interface.js';
import * as defaultTemplates from '../../templates/index.template.js';

@injectable()
export class TemplateService {
  constructor(
    @inject('TemplateEngine') private templateEngine: TemplateEngine,
    @inject('FileSystem') private fs: FileSystemInterface,
    @inject('Logger') private logger: LoggerService
  ) {}

  async render(templateDir: string, context: TemplateContext): Promise<string> {
    try {
      const unifiedTemplatePath = path.join(templateDir, 'unified.hbs');
      
      if (await this.fs.exists(unifiedTemplatePath)) {
        this.logger.debug('Using unified template', { path: unifiedTemplatePath });
        return await this.templateEngine.renderFromFile(unifiedTemplatePath, context);
      }

      this.logger.debug('Unified template not found, rendering in parts', { templateDir });
      return await this.renderParts(templateDir, context);
    } catch (error) {
      this.logger.error('Error rendering templates', error as Error);
      throw error;
    }
  }

  private async renderParts(templateDir: string, context: TemplateContext): Promise<string> {
    const contentParts: string[] = [];

    if (context.tables) {
      for (const table of context.tables) {
        const rendered = await this.renderTemplate(
          path.join(templateDir, 'interface.hbs'),
          defaultTemplates.interfaceTemplate,
          {
            ...table,
            timestamp: context.timestamp,
          }
        );
        contentParts.push(rendered);
      }
    }

    if (context.customInterfaces && context.customInterfaces.length > 0) {
      contentParts.push(
        `/**\n * Custom interfaces\n * @generated This file was automatically generated - DO NOT EDIT\n * @timestamp ${context.timestamp}\n */`
      );
      contentParts.push(...context.customInterfaces);
    }

    if (context.queries) {
      for (const query of context.queries) {
        const rendered = await this.renderTemplate(
          path.join(templateDir, 'query.hbs'),
          defaultTemplates.queryTemplate,
          {
            query,
            timestamp: context.timestamp,
          }
        );
        contentParts.push(rendered);
      }
    }

    const indexContent = await this.renderTemplate(
      path.join(templateDir, 'index.hbs'),
      defaultTemplates.indexTemplate,
      {
        queries: context.queries,
        inSingleFile: true,
        timestamp: context.timestamp,
      }
    );
    contentParts.push(indexContent);

    return contentParts.join('\n\n');
  }

  private async renderTemplate(filePath: string, defaultContent: string, context: any): Promise<string> {
    if (await this.fs.exists(filePath)) {
      return await this.templateEngine.renderFromFile(filePath, context);
    }
    
    this.logger.debug(`Local template not found, using built-in default`, { filePath });
    return await this.templateEngine.renderFromString(defaultContent, context);
  }
}
