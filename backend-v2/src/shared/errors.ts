export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message = '未登录或 token 已过期'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = '无权限执行此操作'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(message = '资源不存在'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details);
  }

  static business(message: string): AppError {
    return new AppError('BUSINESS_ERROR', message, 400);
  }

  static internal(message = '服务器内部错误'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500);
  }
}
