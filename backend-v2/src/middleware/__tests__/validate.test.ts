import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validate } from '../validate.js';
import { AppError } from '../../shared/errors.js';

describe('validate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = { body: {}, query: {}, params: {} };
    mockRes = {};
    mockNext = jest.fn() as jest.Mock;
  });

  it('passes validation and strips unknown fields from body', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required(),
      }),
    };

    mockReq.body = { name: 'test', extra: 'field' };

    validate(schema)(mockReq as Request, mockRes as Response, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.body).toEqual({ name: 'test' });
  });

  it('throws AppError on body validation failure', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required(),
      }),
    };

    mockReq.body = {};

    expect(() => {
      validate(schema)(mockReq as Request, mockRes as Response, mockNext as unknown as NextFunction);
    }).toThrow(AppError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('validates query parameters', () => {
    const schema = {
      query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
      }),
    };

    mockReq.query = { page: '3' as unknown as string };

    validate(schema)(mockReq as Request, mockRes as Response, mockNext as unknown as NextFunction);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.query).toEqual({ page: 3 });
  });

  it('validates params', () => {
    const schema = {
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    };

    mockReq.params = { id: 'not-a-uuid' };

    expect(() => {
      validate(schema)(mockReq as Request, mockRes as Response, mockNext as unknown as NextFunction);
    }).toThrow(AppError);
  });

  it('passes when no schema parts are defined', () => {
    validate({})(mockReq as Request, mockRes as Response, mockNext as unknown as NextFunction);
    expect(mockNext).toHaveBeenCalled();
  });
});
