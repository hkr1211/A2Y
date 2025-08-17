import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { UserModel } from '../models/User';
import { redisClient } from '../config/database';
import type { LoginRequest, LoginResponse } from '../types/user';

export class AuthController {
  /**
   * Validation schema for login request
   */
  private static loginSchema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 50 characters',
        'any.required': 'Username is required'
      }),
    password: Joi.string()
      .min(6)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 100 characters',
        'any.required': 'Password is required'
      })
  });

  /**
   * Generate JWT token for user
   */
  private static generateToken(userId: string, username: string, role: string): string {
    const payload = {
      userId,
      username,
      role,
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): any {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Store token in Redis for session management
   */
  private static async storeTokenInRedis(userId: string, token: string): Promise<void> {
    try {
      const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
      // Convert expiration time to seconds
      let ttl = 24 * 60 * 60; // Default 24 hours in seconds
      
      if (expiresIn.endsWith('h')) {
        ttl = parseInt(expiresIn.slice(0, -1)) * 60 * 60;
      } else if (expiresIn.endsWith('m')) {
        ttl = parseInt(expiresIn.slice(0, -1)) * 60;
      } else if (expiresIn.endsWith('s')) {
        ttl = parseInt(expiresIn.slice(0, -1));
      }

      await redisClient.setEx(`auth:${userId}`, ttl, token);
    } catch (error) {
      console.error('Error storing token in Redis:', error);
      // Don't throw error here as authentication can work without Redis
    }
  }

  /**
   * Remove token from Redis
   */
  private static async removeTokenFromRedis(userId: string): Promise<void> {
    try {
      await redisClient.del(`auth:${userId}`);
    } catch (error) {
      console.error('Error removing token from Redis:', error);
      // Don't throw error here
    }
  }

  /**
   * Check if token exists in Redis
   */
  static async isTokenValidInRedis(userId: string, token: string): Promise<boolean> {
    try {
      const storedToken = await redisClient.get(`auth:${userId}`);
      return storedToken === token;
    } catch (error) {
      console.error('Error checking token in Redis:', error);
      // If Redis is down, allow token validation to proceed with JWT verification only
      return true;
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = AuthController.loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
          },
        });
        return;
      }

      const { username, password }: LoginRequest = value;

      // Find user by username
      const user = await UserModel.findByUsername(username);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
          },
        });
        return;
      }

      // Verify password
      const isPasswordValid = await UserModel.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
          },
        });
        return;
      }

      // Generate JWT token
      const token = AuthController.generateToken(user.id, user.username, user.role);

      // Store token in Redis for session management
      await AuthController.storeTokenInRedis(user.id, token);

      // Prepare user data (without password)
      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        company: user.company,
        language: user.language,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response: LoginResponse = {
        success: true,
        data: {
          token,
          user: userData,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login',
        },
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      
      if (userId) {
        // Remove token from Redis
        await AuthController.removeTokenFromRedis(userId);
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during logout',
        },
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      // Get user from database
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      // Prepare user data (without password)
      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        company: user.company,
        language: user.language,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(200).json({
        success: true,
        data: {
          user: userData,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching profile',
        },
      });
    }
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const username = (req as any).user?.username;
      const role = (req as any).user?.role;
      
      if (!userId || !username || !role) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token data',
          },
        });
        return;
      }

      // Generate new JWT token
      const newToken = AuthController.generateToken(userId, username, role);

      // Store new token in Redis
      await AuthController.storeTokenInRedis(userId, newToken);

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while refreshing token',
        },
      });
    }
  }
}