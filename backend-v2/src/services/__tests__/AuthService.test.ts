import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../AuthService.js';
import { AppError } from '../../shared/errors.js';

// Mock UserRepository
function createMockRepo() {
  return {
    findByUsername: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    softDelete: jest.fn(),
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authService = new AuthService(mockRepo as any);
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  describe('login', () => {
    it('returns token and user on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      (mockRepo.findByUsername as jest.Mock).mockResolvedValue({
        id: 'user-id',
        username: 'admin',
        password_hash: hash,
        role: 'admin',
        company: 'admin',
        language: 'zh',
      });

      const result = await authService.login('admin', 'password123');

      expect(result.token).toBeDefined();
      expect(result.user).toEqual({
        id: 'user-id',
        username: 'admin',
        role: 'admin',
        company: 'admin',
        language: 'zh',
      });

      // Verify token is valid
      const decoded = jwt.verify(result.token, 'test-secret') as Record<string, unknown>;
      expect(decoded.userId).toBe('user-id');
    });

    it('throws unauthorized on wrong username', async () => {
      (mockRepo.findByUsername as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('bad', 'pass')).rejects.toThrow(AppError);
    });

    it('throws unauthorized on wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      (mockRepo.findByUsername as jest.Mock).mockResolvedValue({
        id: 'user-id',
        username: 'admin',
        password_hash: hash,
        role: 'admin',
        company: 'admin',
        language: 'zh',
      });

      await expect(authService.login('admin', 'wrong')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getMe', () => {
    it('returns user info', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue({
        id: 'user-id',
        username: 'admin',
        role: 'admin',
        company: 'admin',
        language: 'zh',
        created_at: '2026-01-01T00:00:00.000Z',
      });

      const result = await authService.getMe('user-id');
      expect(result.id).toBe('user-id');
      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('throws not found if user does not exist', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(authService.getMe('nonexistent')).rejects.toThrow(AppError);
    });
  });

  describe('changePassword', () => {
    it('changes password with correct old password', async () => {
      const hash = await bcrypt.hash('oldpass', 10);
      (mockRepo.findById as jest.Mock).mockResolvedValue({
        id: 'user-id',
        password_hash: hash,
      });
      (mockRepo.updatePassword as jest.Mock).mockResolvedValue(true);

      await authService.changePassword('user-id', 'oldpass', 'newpass');

      expect(mockRepo.updatePassword).toHaveBeenCalledWith(
        'user-id',
        expect.any(String)
      );
    });

    it('throws business error with wrong old password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      (mockRepo.findById as jest.Mock).mockResolvedValue({
        id: 'user-id',
        password_hash: hash,
      });

      await expect(
        authService.changePassword('user-id', 'wrong', 'newpass')
      ).rejects.toThrow(AppError);
    });
  });
});
