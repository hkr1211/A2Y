import { Request, Response } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { UserModel } from '../../models/User';
import { redisClient } from '../../config/database';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../config/database', () => ({
  redisClient: {
    setEx: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
  },
}));
jest.mock('jsonwebtoken');

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      body: {},
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // Mock environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '24h';
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-uuid',
        username: 'testuser',
        password: 'hashed-password',
        role: 'buyer' as const,
        company: 'arroz' as const,
        language: 'zh' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'mock-jwt-token';

      mockRequest.body = loginData;
      mockUserModel.findByUsername.mockResolvedValue(mockUser);
      mockUserModel.verifyPassword.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue(mockToken as any);
      mockRedisClient.setEx.mockResolvedValue('OK' as any);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserModel.findByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUserModel.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(`auth:${mockUser.id}`, 86400, mockToken);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          token: mockToken,
          user: {
            id: mockUser.id,
            username: mockUser.username,
            role: mockUser.role,
            company: mockUser.company,
            language: mockUser.language,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
          },
        },
      });
    });

    it('should return validation error for invalid input', async () => {
      const invalidData = {
        username: 'ab', // Too short
        password: 'password123',
      };

      mockRequest.body = invalidData;

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username must be at least 3 characters long',
        },
      });
      expect(mockUserModel.findByUsername).not.toHaveBeenCalled();
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockRequest.body = loginData;
      mockUserModel.findByUsername.mockResolvedValue(null);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserModel.findByUsername).toHaveBeenCalledWith('nonexistent');
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    });

    it('should return error for invalid password', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-uuid',
        username: 'testuser',
        password: 'hashed-password',
        role: 'buyer' as const,
        company: 'arroz' as const,
        language: 'zh' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = loginData;
      mockUserModel.findByUsername.mockResolvedValue(mockUser);
      mockUserModel.verifyPassword.mockResolvedValue(false);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserModel.findByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUserModel.verifyPassword).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    });

    it('should handle internal server error', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123',
      };

      mockRequest.body = loginData;
      mockUserModel.findByUsername.mockRejectedValue(new Error('Database error'));

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login',
        },
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = {
        userId: 'user-uuid',
        username: 'testuser',
        role: 'buyer',
      };

      (mockRequest as any).user = mockUser;
      mockRedisClient.del.mockResolvedValue(1 as any);

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`auth:${mockUser.userId}`);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    });

    it('should handle logout without user context', async () => {
      (mockRequest as any).user = undefined;

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        id: 'user-uuid',
        username: 'testuser',
        password: 'hashed-password',
        role: 'buyer' as const,
        company: 'arroz' as const,
        language: 'zh' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockRequest as any).user = { userId: 'user-uuid' };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await AuthController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-uuid');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            username: mockUser.username,
            role: mockUser.role,
            company: mockUser.company,
            language: mockUser.language,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
          },
        },
      });
    });

    it('should return unauthorized when user not authenticated', async () => {
      (mockRequest as any).user = undefined;

      await AuthController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockUserModel.findById).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    });

    it('should return not found when user does not exist', async () => {
      (mockRequest as any).user = { userId: 'non-existent-uuid' };
      mockUserModel.findById.mockResolvedValue(null);

      await AuthController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockUserModel.findById).toHaveBeenCalledWith('non-existent-uuid');
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockUser = {
        userId: 'user-uuid',
        username: 'testuser',
        role: 'buyer',
      };

      const mockNewToken = 'new-mock-jwt-token';

      (mockRequest as any).user = mockUser;
      mockJwt.sign.mockReturnValue(mockNewToken as any);
      mockRedisClient.setEx.mockResolvedValue('OK' as any);

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockJwt.sign).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(`auth:${mockUser.userId}`, 86400, mockNewToken);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          token: mockNewToken,
        },
      });
    });

    it('should return unauthorized when user data is incomplete', async () => {
      (mockRequest as any).user = { userId: 'user-uuid' }; // Missing username and role

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockJwt.sign).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token data',
        },
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockToken = 'valid-token';
      const mockDecoded = { userId: 'user-uuid', username: 'testuser', role: 'buyer' };

      mockJwt.verify.mockReturnValue(mockDecoded as any);

      const result = AuthController.verifyToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
      expect(result).toEqual(mockDecoded);
    });

    it('should throw error for invalid token', () => {
      const mockToken = 'invalid-token';

      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => AuthController.verifyToken(mockToken)).toThrow('Invalid token');
    });
  });

  describe('isTokenValidInRedis', () => {
    it('should return true when token matches stored token', async () => {
      const userId = 'user-uuid';
      const token = 'valid-token';

      mockRedisClient.get.mockResolvedValue(token);

      const result = await AuthController.isTokenValidInRedis(userId, token);

      expect(mockRedisClient.get).toHaveBeenCalledWith(`auth:${userId}`);
      expect(result).toBe(true);
    });

    it('should return false when token does not match', async () => {
      const userId = 'user-uuid';
      const token = 'valid-token';
      const storedToken = 'different-token';

      mockRedisClient.get.mockResolvedValue(storedToken);

      const result = await AuthController.isTokenValidInRedis(userId, token);

      expect(mockRedisClient.get).toHaveBeenCalledWith(`auth:${userId}`);
      expect(result).toBe(false);
    });

    it('should return true when Redis is unavailable', async () => {
      const userId = 'user-uuid';
      const token = 'valid-token';

      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await AuthController.isTokenValidInRedis(userId, token);

      expect(result).toBe(true);
    });
  });
});