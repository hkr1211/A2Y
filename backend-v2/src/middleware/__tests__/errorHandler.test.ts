import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler.js';
import { AppError } from '../../shared/errors.js';

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusFn: jest.Mock;
  let jsonFn: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-07T12:00:00.000Z'));
    mockReq = {};
    jsonFn = jest.fn() as jest.Mock;
    statusFn = jest.fn().mockReturnValue({ json: jsonFn }) as jest.Mock;
    mockRes = { status: statusFn as unknown as Response['status'], json: jsonFn as unknown as Response['json'] };
    mockNext = jest.fn() as unknown as NextFunction;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles AppError with correct status and body', () => {
    const error = AppError.notFound('User not found');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(404);
    expect(jsonFn).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'User not found',
      },
      timestamp: '2026-02-07T12:00:00.000Z',
    });
  });

  it('includes details when AppError has details', () => {
    const error = AppError.validation('Invalid input', ['field required']);

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: ['field required'],
      },
      timestamp: '2026-02-07T12:00:00.000Z',
    });
  });

  it('handles generic Error with 500 status in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Something broke');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(jsonFn).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
      timestamp: '2026-02-07T12:00:00.000Z',
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('shows error message in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Something broke');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Something broke',
        }),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('handles body-parser errors with status property', () => {
    const error = new SyntaxError('Unexpected token');
    (error as unknown as { status: number }).status = 400;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Unexpected token',
      },
      timestamp: '2026-02-07T12:00:00.000Z',
    });
  });
});
