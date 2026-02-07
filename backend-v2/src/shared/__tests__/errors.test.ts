import { AppError } from '../errors.js';

describe('AppError', () => {
  it('should create an error with code, message, and statusCode', () => {
    const error = new AppError('TEST_ERROR', 'test message', 400);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('test message');
    expect(error.statusCode).toBe(400);
    expect(error.details).toBeUndefined();
  });

  it('should create an error with details', () => {
    const details = { field: 'name' };
    const error = new AppError('TEST_ERROR', 'test', 400, details);
    expect(error.details).toEqual(details);
  });

  describe('static factory methods', () => {
    it('unauthorized() creates 401 error', () => {
      const error = AppError.unauthorized();
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('未登录或 token 已过期');
    });

    it('unauthorized() accepts custom message', () => {
      const error = AppError.unauthorized('token expired');
      expect(error.message).toBe('token expired');
    });

    it('forbidden() creates 403 error', () => {
      const error = AppError.forbidden();
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });

    it('notFound() creates 404 error', () => {
      const error = AppError.notFound();
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('validation() creates 400 error with details', () => {
      const details = ['field is required'];
      const error = AppError.validation('validation failed', details);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it('business() creates 400 error', () => {
      const error = AppError.business('cannot modify');
      expect(error.code).toBe('BUSINESS_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('cannot modify');
    });

    it('internal() creates 500 error', () => {
      const error = AppError.internal();
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });
});
