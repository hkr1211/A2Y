import { Request, Response, NextFunction } from 'express';
import { setUserLanguage, getUserLanguage, validateLanguage, LanguageRequest } from '../../middleware/language';
import { UserModel } from '../../models/User';
import type { User, Language } from '../../types/user';

// Mock UserModel
jest.mock('../../models/User');
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('Language Middleware', () => {
  let mockRequest: Partial<LanguageRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
      language: undefined
    };
    mockResponse = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('setUserLanguage', () => {
    it('should set default language when user is not authenticated', async () => {
      await setUserLanguage(mockRequest as LanguageRequest, mockResponse as Response, mockNext);

      expect(mockRequest.language).toBe('zh');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user language from database when user is authenticated', async () => {
      const mockUser: User = {
        id: 'user-1',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'ja',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = {
        userId: 'user-1',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now()
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      await setUserLanguage(mockRequest as LanguageRequest, mockResponse as Response, mockNext);

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-1');
      expect(mockRequest.language).toBe('ja');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should override with header language when provided', async () => {
      const mockUser: User = {
        id: 'user-1',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = {
        userId: 'user-1',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now()
      };
      mockRequest.headers = {
        'accept-language': 'ja'
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      await setUserLanguage(mockRequest as LanguageRequest, mockResponse as Response, mockNext);

      expect(mockRequest.language).toBe('ja');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should ignore invalid header language', async () => {
      const mockUser: User = {
        id: 'user-1',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = {
        userId: 'user-1',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now()
      };
      mockRequest.headers = {
        'accept-language': 'en'
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      await setUserLanguage(mockRequest as LanguageRequest, mockResponse as Response, mockNext);

      expect(mockRequest.language).toBe('zh');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default language when user not found', async () => {
      mockRequest.user = {
        userId: 'user-1',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now()
      };

      mockUserModel.findById.mockResolvedValue(null);

      await setUserLanguage(mockRequest as LanguageRequest, mockResponse as Response, mockNext);

      expect(mockRequest.language).toBe('zh');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.user = {
        userId: 'user-1',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now()
      };

      mockUserModel.findById.mockRejectedValue(new Error('Database error'));

      await setUserLanguage(mockRequest as LanguageRequest, mockResponse as Response, mockNext);

      expect(mockRequest.language).toBe('zh');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getUserLanguage', () => {
    it('should return user language from request', () => {
      mockRequest.language = 'ja';
      const language = getUserLanguage(mockRequest as LanguageRequest);
      expect(language).toBe('ja');
    });

    it('should return default language when not set', () => {
      const language = getUserLanguage(mockRequest as LanguageRequest);
      expect(language).toBe('zh');
    });
  });

  describe('validateLanguage', () => {
    it('should validate Chinese language', () => {
      expect(validateLanguage('zh')).toBe(true);
    });

    it('should validate Japanese language', () => {
      expect(validateLanguage('ja')).toBe(true);
    });

    it('should reject invalid language', () => {
      expect(validateLanguage('en')).toBe(false);
      expect(validateLanguage('fr')).toBe(false);
      expect(validateLanguage('')).toBe(false);
      expect(validateLanguage('invalid')).toBe(false);
    });
  });
});