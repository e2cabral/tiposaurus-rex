export class AppError extends Error {
  constructor(public message: string, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: any) {
    super(message, 'DATABASE_ERROR');
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

export class ParserError extends AppError {
  constructor(message: string) {
    super(message, 'PARSER_ERROR');
  }
}

export class GeneratorError extends AppError {
  constructor(message: string) {
    super(message, 'GENERATOR_ERROR');
  }
}
