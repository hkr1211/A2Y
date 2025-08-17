import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.message || 'Internal server error';

  // Log error for debugging
  console.error(`[${new Date().toISOString()}] ${code}: ${message}`, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: error.details,
    },
    timestamp: new Date().toISOString(),
  });
};

export const createError = (
  statusCode: number,
  code: string,
  message: string,
  details?: any
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};