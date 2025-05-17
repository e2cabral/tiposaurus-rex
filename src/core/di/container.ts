import {Container} from 'inversify';
import 'reflect-metadata';

import {DatabaseConnector} from '../domain/interfaces/database.interface.js';
import {TemplateEngine} from '../domain/interfaces/template.interface.js';
import {SQLParser} from '../domain/interfaces/sql.interface.js';


import {ConfigService} from '../services/config.service.js';
import {CodeGeneratorService} from '../services/code-generator.service.js';
import {QueryAnalyzerService} from '../services/query-analyzer.service.js';
import {MySQLConnector} from "../../infra/adapters/mysql.adapter.js";
import {HandlebarsTemplateEngine} from "../../infra/templates/handlebars.template.js";
import {SQLParserImpl} from "../../utils/sql.parser.js";
import {UIService} from "../../cli/ui/ui.service.js";
import {GenerateCommand} from "../../cli/commands/generate.command.js";
import {InitCommand} from "../../cli/commands/init.command.js";
import {SQLFormatter} from "../../utils/sql-formatter.js";


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
container.bind<SQLFormatter>(SQLFormatter).toSelf().inSingletonScope();

export {container};