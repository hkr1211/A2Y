import { jest } from '@jest/globals';
import { logger } from '../logger.js';

describe('logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof jest.spyOn>;
    warn: ReturnType<typeof jest.spyOn>;
    error: ReturnType<typeof jest.spyOn>;
    debug: ReturnType<typeof jest.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logger.info logs to console', () => {
    logger.info('test info message');
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('test info message')
    );
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]')
    );
  });

  it('logger.warn logs to console', () => {
    logger.warn('test warn message');
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      expect.stringContaining('test warn message')
    );
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]')
    );
  });

  it('logger.error logs to console', () => {
    logger.error('test error message');
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('test error message')
    );
  });

  it('logger.error logs Error stack trace', () => {
    const error = new Error('test error');
    logger.error('something failed', error);
    expect(consoleSpy.error).toHaveBeenCalledTimes(2);
  });

  it('logger.debug logs in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    logger.debug('debug message');
    expect(consoleSpy.debug).toHaveBeenCalledWith(
      expect.stringContaining('debug message')
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('logger.debug does not log in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    logger.debug('debug message');
    expect(consoleSpy.debug).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
