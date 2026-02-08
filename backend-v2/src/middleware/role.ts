import { Response, NextFunction } from 'express';
import { AppError } from '../shared/errors.js';
import { AuthRequest, UserRole } from '../shared/types.js';

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden();
    }

    next();
  };
}
