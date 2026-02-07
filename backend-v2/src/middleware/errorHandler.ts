import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle body-parser and other HTTP errors with status property
  const httpStatus = (err as { status?: number }).status;
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
    res.status(httpStatus).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: err.message,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unexpected errors
  logger.error('Unexpected error', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : '服务器内部错误',
    },
    timestamp: new Date().toISOString(),
  });
}
