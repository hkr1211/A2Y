import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/AuthController';
import { UserRole } from '../types/user';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: UserRole;
    iat: number;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is required',
      },
    });
    return;
  }

  try {
    // Verify JWT token
    const decoded = AuthController.verifyToken(token);
    
    // Check if token is still valid in Redis (session management)
    const isValidInRedis = await AuthController.isTokenValidInRedis(decoded.userId, token);
    
    if (!isValidInRedis) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has been invalidated',
        },
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
};