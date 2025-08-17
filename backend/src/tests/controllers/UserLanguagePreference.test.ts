import { Request, Response } from 'express';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../models/User';
import { I18nService } from '../../services/I18nService';
import type { User, Language } from '../../types/user';
import type { AuthenticatedRequest } from '../../middleware/auth';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../services/I18nService');

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockI18nService = I18nService as jest.Mocked<typeof I18nService>;

describe('UserController Language Preference', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      user: {
        userId: 'user-1',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now()
      },
      body: {}
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('getCurrentUserProfile', () => {
    it('should return current user profile successfully', async () => {
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

      mockUserModel.findById.mockResolvedValue(mockUser);

      await UserController.getCurrentUserProfile(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user-1',
            username: 'testuser',
            role: 'buyer',
            company: 'arroz',
            language: 'zh',
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt
          }
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await UserController.getCurrentUserProfile(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    });

    it('should return 404 when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await UserController.getCurrentUserProfile(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    });

    it('should handle database errors', async () => {
      mockUserModel.findById.mockRejectedValue(new Error('Database error'));

      await UserController.getCurrentUserProfile(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user profile'
        }
      });
    });
  });

  describe('updateUserLanguage', () => {
    beforeEach(() => {
      mockI18nService.isSupportedLanguage.mockImplementation((lang: string) => 
        lang === 'zh' || lang === 'ja'
      );
      mockI18nService.translate.mockImplementation((key: string, lang: Language) => 
        lang === 'ja' ? '言語設定が更新されました' : '语言设置更新成功'
      );
    });

    it('should update user language successfully', async () => {
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

      mockRequest.body = { language: 'ja' };
      mockUserModel.update.mockResolvedValue(mockUser);

      await UserController.updateUserLanguage(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockI18nService.isSupportedLanguage).toHaveBeenCalledWith('ja');
      expect(mockUserModel.update).toHaveBeenCalledWith('user-1', { language: 'ja' });
      expect(mockI18nService.translate).toHaveBeenCalledWith('user.language_updated', 'ja');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user-1',
            username: 'testuser',
            role: 'buyer',
            company: 'arroz',
            language: 'ja',
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt
          },
          message: '言語設定が更新されました'
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { language: 'ja' };

      await UserController.updateUserLanguage(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    });

    it('should return 400 when language is missing', async () => {
      mockRequest.body = {};

      await UserController.updateUserLanguage(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Language must be one of: zh, ja'
        }
      });
    });

    it('should return 400 when language is invalid', async () => {
      mockRequest.body = { language: 'en' };
      mockI18nService.isSupportedLanguage.mockReturnValue(false);

      await UserController.updateUserLanguage(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Language must be one of: zh, ja'
        }
      });
    });

    it('should return 404 when user not found', async () => {
      mockRequest.body = { language: 'ja' };
      mockUserModel.update.mockResolvedValue(null);

      await UserController.updateUserLanguage(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    });

    it('should handle database errors', async () => {
      mockRequest.body = { language: 'ja' };
      mockUserModel.update.mockRejectedValue(new Error('Database error'));

      await UserController.updateUserLanguage(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating language preference'
        }
      });
    });
  });

  describe('getSupportedLanguages', () => {
    beforeEach(() => {
      mockI18nService.getSupportedLanguages.mockReturnValue(['zh', 'ja']);
      mockI18nService.getDefaultLanguage.mockReturnValue('zh');
      mockI18nService.getTranslations.mockImplementation((lang: Language) => {
        if (lang === 'ja') {
          return {
            'common.success': '操作が成功しました',
            'user.created': 'ユーザーが作成されました'
          } as any;
        }
        return {
          'common.success': '操作成功',
          'user.created': '用户创建成功'
        } as any;
      });
    });

    it('should return supported languages and translations', async () => {
      await UserController.getSupportedLanguages(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockI18nService.getSupportedLanguages).toHaveBeenCalled();
      expect(mockI18nService.getDefaultLanguage).toHaveBeenCalled();
      expect(mockI18nService.getTranslations).toHaveBeenCalledWith('zh');
      expect(mockI18nService.getTranslations).toHaveBeenCalledWith('ja');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          languages: ['zh', 'ja'],
          defaultLanguage: 'zh',
          translations: {
            zh: {
              'common.success': '操作成功',
              'user.created': '用户创建成功'
            },
            ja: {
              'common.success': '操作が成功しました',
              'user.created': 'ユーザーが作成されました'
            }
          }
        }
      });
    });

    it('should handle service errors', async () => {
      mockI18nService.getSupportedLanguages.mockImplementation(() => {
        throw new Error('Service error');
      });

      await UserController.getSupportedLanguages(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching supported languages'
        }
      });
    });
  });
});