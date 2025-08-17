import request from 'supertest';
import express from 'express';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../models/User';
import { authenticateToken } from '../../middleware/auth';
import { setUserLanguage } from '../../middleware/language';
import type { User, Language } from '../../types/user';

// Mock dependencies
jest.mock('../../models/User');
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('Language Preference Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = {
        userId: 'user-1',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now()
      };
      next();
    });
    
    // Apply language middleware
    app.use(setUserLanguage);
    
    // Routes
    app.get('/api/users/profile', UserController.getCurrentUserProfile);
    app.put('/api/users/language', UserController.updateUserLanguage);
    app.get('/api/users/languages', UserController.getSupportedLanguages);
    
    jest.clearAllMocks();
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile with language preference', async () => {
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

      mockUserModel.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/profile')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: 'user-1',
            username: 'testuser',
            role: 'buyer',
            company: 'arroz',
            language: 'ja',
            createdAt: mockUser.createdAt.toISOString(),
            updatedAt: mockUser.updatedAt.toISOString()
          }
        }
      });
    });
  });

  describe('PUT /api/users/language', () => {
    it('should update user language preference successfully', async () => {
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

      mockUserModel.update.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/language')
        .send({ language: 'ja' })
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith('user-1', { language: 'ja' });
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.language).toBe('ja');
    });

    it('should reject invalid language', async () => {
      const response = await request(app)
        .put('/api/users/language')
        .send({ language: 'en' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Language must be one of: zh, ja'
        }
      });
    });
  });

  describe('GET /api/users/languages', () => {
    it('should return supported languages and translations', async () => {
      const response = await request(app)
        .get('/api/users/languages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.languages).toEqual(['zh', 'ja']);
      expect(response.body.data.defaultLanguage).toBe('zh');
      expect(response.body.data.translations).toHaveProperty('zh');
      expect(response.body.data.translations).toHaveProperty('ja');
    });
  });

  describe('Language middleware integration', () => {
    it('should set language from user preference', async () => {
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

      mockUserModel.findById.mockResolvedValue(mockUser);

      // Add a test route to check language
      app.get('/test-language', (req: any, res) => {
        res.json({ language: req.language });
      });

      const response = await request(app)
        .get('/test-language')
        .expect(200);

      expect(response.body.language).toBe('ja');
    });

    it('should override language with header', async () => {
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

      // Add a test route to check language
      app.get('/test-language-header', (req: any, res) => {
        res.json({ language: req.language });
      });

      const response = await request(app)
        .get('/test-language-header')
        .set('Accept-Language', 'ja')
        .expect(200);

      expect(response.body.language).toBe('ja');
    });
  });
});