import { jest } from '@jest/globals';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../auth.js';
import { AppError } from '../../shared/errors.js';
import { AuthRequest } from '../../shared/types.js';

describe('authenticate middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {};
    mockNext = jest.fn() as jest.Mock;
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('throws if no Authorization header', () => {
    expect(() => {
      authenticate(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);
    }).toThrow(AppError);
  });

  it('throws if Authorization header does not start with Bearer', () => {
    mockReq.headers = { authorization: 'Basic abc' };
    expect(() => {
      authenticate(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);
    }).toThrow(AppError);
  });

  it('throws if token is invalid', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    expect(() => {
      authenticate(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);
    }).toThrow(AppError);
  });

  it('sets req.user and calls next() with valid token', () => {
    const payload = {
      userId: 'test-id',
      username: 'admin',
      role: 'admin',
      company: 'admin',
    };
    const token = jwt.sign(payload, 'test-secret');
    mockReq.headers = { authorization: `Bearer ${token}` };

    authenticate(mockReq as AuthRequest, mockRes as Response, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user!.userId).toBe('test-id');
    expect(mockReq.user!.role).toBe('admin');
  });
});
