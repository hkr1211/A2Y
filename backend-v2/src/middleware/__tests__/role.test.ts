import { jest } from '@jest/globals';
import { Response, NextFunction } from 'express';
import { requireRole } from '../role.js';
import { AppError } from '../../shared/errors.js';
import { AuthRequest } from '../../shared/types.js';

describe('requireRole middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn() as jest.Mock;
  });

  it('throws unauthorized if no user on request', () => {
    const middleware = requireRole('admin');
    expect(() => {
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);
    }).toThrow(AppError);
  });

  it('throws forbidden if user role is not in allowed list', () => {
    mockReq.user = {
      userId: 'test-id',
      username: 'buyer1',
      role: 'buyer',
      company: 'arroz',
    };

    const middleware = requireRole('admin');
    expect(() => {
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);
    }).toThrow(AppError);
  });

  it('calls next() if user role is in allowed list', () => {
    mockReq.user = {
      userId: 'test-id',
      username: 'admin',
      role: 'admin',
      company: 'admin',
    };

    const middleware = requireRole('admin');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalled();
  });

  it('allows multiple roles', () => {
    mockReq.user = {
      userId: 'test-id',
      username: 'supplier1',
      role: 'supplier',
      company: 'yunjie',
    };

    const middleware = requireRole('buyer', 'supplier');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalled();
  });
});
