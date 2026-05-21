import { inject, injectable } from 'inversify';
import path from 'path';
import prettier from 'prettier';
import {
  QueryDefinition,
} from '../domain/interfaces/template.interface.js';
import { UIService } from '../../cli/ui/ui.service.js';
import { TypeInferer } from '../../utils/type-inferer.js';
import { FileSystemInterface } from '../domain/interfaces/file-system.interface.js';
import { ContextBuilderService } from './context-builder.service.js';
import { TemplateService } from './template.service.js';
import { LoggerService } from '../domain/interfaces/logger.interface.js';
import { GeneratorError } from '../domain/errors/app-error.js';

@injectable()
export class CodeGeneratorService {
  constructor(
    @inject(TemplateService) private templateService: TemplateService,
    @inject(UIService) private ui: UIService,
    @inject(TypeInferer) private typeInferer: TypeInferer,
    @inject('FileSystem') private fs: FileSystemInterface,
    @inject(ContextBuilderService) private contextBuilder: ContextBuilderService,
    @inject('Logger') private logger: LoggerService
  ) {}

  async generateTypesForQueries(
    queries: QueryDefinition[],
    outputPath: string,
    templateDir: string,
    customTypes?: Record<string, string>
  ): Promise<void> {
    try {
      this.logger.info(`Starting type generation for ${queries.length} queries`, { outputPath });
      this.ui.startSpinner(`Generating types for ${queries.length} queries...`);

      if (customTypes) {
        this.typeInferer.setCustomTypes(customTypes);
      }

      const context = await this.contextBuilder.buildContext(queries);

      this.ui.updateSpinner(
        `Generating code for ${queries.length} queries and ${context.tables?.length || 0} tables...`
      );

      const generatedCode = await this.templateService.render(templateDir, context);

      this.ui.updateSpinner('Formatting code...');
      const formattedCode = await prettier.format(generatedCode, {
        parser: 'typescript',
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100,
      });

      await this.fs.mkdir(path.dirname(outputPath), { recursive: true });
      await this.fs.writeFile(outputPath, formattedCode);

      this.logger.debug(`File generated successfully`, { outputPath });
      this.ui.stopSpinner(true, `Types generated at ${outputPath}`);
    } catch (error) {
      this.logger.error(`Error generating types`, error as Error);
      this.ui.stopSpinner(
        false,
        `Error generating types: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new GeneratorError(`Error generating code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
