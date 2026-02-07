import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../shared/errors.js';

interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        throw AppError.validation(
          '请求参数验证失败',
          error.details.map((d) => d.message)
        );
      }
      req.body = value;
    }

    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        throw AppError.validation(
          '查询参数验证失败',
          error.details.map((d) => d.message)
        );
      }
      req.query = value;
    }

    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        throw AppError.validation(
          '路径参数验证失败',
          error.details.map((d) => d.message)
        );
      }
      req.params = value;
    }

    next();
  };
}
