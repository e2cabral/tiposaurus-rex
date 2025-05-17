import { Container } from 'inversify';
import 'reflect-metadata';

import { DatabaseConnector } from '../domain/interfaces/database.interface';
import { TemplateEngine } from '../domain/interfaces/template.interface';
import { SQLParser } from '../domain/interfaces/sql.interface';

import { MySQLConnector } from '@infra/adapters/mysql.adapter';
import { HandlebarsTemplateEngine } from '@infra/templates/handlebars.template';
import { SQLParserImpl } from '@utils/sql.parser';

import { ConfigService } from '../services/config.service';
import { CodeGeneratorService } from '../services/code-generator.service';
import { QueryAnalyzerService } from '../services/query-analyzer.service';

import { UIService } from '@cli/ui/ui.service';
import { GenerateCommand } from '@cli/commands/generate.command';
import { InitCommand } from '@cli/commands/init.command';

const container = new Container();

container.bind<DatabaseConnector>('DatabaseConnector').to(MySQLConnector).inRequestScope();
container.bind<TemplateEngine>('TemplateEngine').to(HandlebarsTemplateEngine).inSingletonScope();
container.bind<SQLParser>('SQLParser').to(SQLParserImpl).inSingletonScope();

container.bind<ConfigService>(ConfigService).toSelf().inSingletonScope();
container.bind<CodeGeneratorService>(CodeGeneratorService).toSelf().inRequestScope();
container.bind<QueryAnalyzerService>(QueryAnalyzerService).toSelf().inRequestScope();

container.bind<UIService>(UIService).toSelf().inSingletonScope();
container.bind<GenerateCommand>(GenerateCommand).toSelf().inRequestScope();
container.bind<InitCommand>(InitCommand).toSelf().inRequestScope();

export { container };