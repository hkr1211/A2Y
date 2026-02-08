import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../shared/errors.js';
import { AuthRequest, JwtPayload } from '../shared/types.js';

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }

  const token = header.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw AppError.internal('JWT_SECRET not configured');
    }

    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('token 无效或已过期');
  }
}
