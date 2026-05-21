import { jest } from '@jest/globals';
import 'reflect-metadata';
import { ConsoleLoggerAdapter } from '../../../src/infra/logging/console-logger.adapter.js';

describe('ConsoleLoggerAdapter', () => {
  let logger: ConsoleLoggerAdapter;
  let consoleSpy: any;

  beforeEach(() => {
    logger = new ConsoleLoggerAdapter();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log info messages', () => {
    logger.info('test message', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('{"key":"value"}'));
  });

  it('should log error messages with stack trace', () => {
    const error = new Error('boom');
    logger.error('failed op', error);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('failed op'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('should not log debug messages by default', () => {
    logger.debug('debug message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
