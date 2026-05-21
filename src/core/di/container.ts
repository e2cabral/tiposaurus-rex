import {Container} from 'inversify';
import 'reflect-metadata';

import {DatabaseConnector} from '../domain/interfaces/database.interface.js';
import {TemplateEngine} from '../domain/interfaces/template.interface.js';
import {SQLParser} from '../domain/interfaces/sql.interface.js';
import {LoggerService} from '../domain/interfaces/logger.interface.js';

import {ConfigService} from '../services/config.service.js';
import {CodeGeneratorService} from '../services/code-generator.service.js';
import {QueryAnalyzerService} from '../services/query-analyzer.service.js';
import {ContextBuilderService} from '../services/context-builder.service.js';
import {TemplateService} from '../services/template.service.js';
import {MySQLConnector} from "../../infra/adapters/mysql.adapter.js";
import {HandlebarsTemplateEngine} from "../../infra/templates/handlebars.template.js";
import {SQLParserImpl} from "../../utils/sql.parser.js";
import {UIService} from "../../cli/ui/ui.service.js";
import {GenerateCommand} from "../../cli/commands/generate.command.js";
import {InitCommand} from "../../cli/commands/init.command.js";
import {SQLFormatter} from "../../utils/sql-formatter.js";
import {TypeInferer} from "../../utils/type-inferer.js";
import {ParameterMatcher} from "../../utils/parameter.matcher.js";
import {FileSystemInterface} from "../domain/interfaces/file-system.interface.js";
import {NodeFileSystemAdapter} from "../../infra/adapters/node-fs.adapter.js";
import {ConsoleLoggerAdapter} from "../../infra/logging/console-logger.adapter.js";

const container = new Container();

container.bind<DatabaseConnector>('DatabaseConnector').to(MySQLConnector).inRequestScope();
container.bind<TemplateEngine>('TemplateEngine').to(HandlebarsTemplateEngine).inSingletonScope();
container.bind<SQLParser>('SQLParser').to(SQLParserImpl).inSingletonScope();
container.bind<FileSystemInterface>('FileSystem').to(NodeFileSystemAdapter).inSingletonScope();
container.bind<LoggerService>('Logger').to(ConsoleLoggerAdapter).inSingletonScope();

container.bind<ConfigService>(ConfigService).toSelf().inSingletonScope();
container.bind<CodeGeneratorService>(CodeGeneratorService).toSelf().inRequestScope();
container.bind<QueryAnalyzerService>(QueryAnalyzerService).toSelf().inRequestScope();
container.bind<ContextBuilderService>(ContextBuilderService).toSelf().inRequestScope();
container.bind<TemplateService>(TemplateService).toSelf().inSingletonScope();

container.bind<UIService>(UIService).toSelf().inSingletonScope();
container.bind<GenerateCommand>(GenerateCommand).toSelf().inRequestScope();
container.bind<InitCommand>(InitCommand).toSelf().inRequestScope();
container.bind<SQLFormatter>(SQLFormatter).toSelf().inSingletonScope();
container.bind<TypeInferer>(TypeInferer).toSelf().inSingletonScope();
container.bind<ParameterMatcher>(ParameterMatcher).toSelf().inSingletonScope();

export {container};