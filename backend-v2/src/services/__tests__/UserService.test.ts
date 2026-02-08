import { jest } from '@jest/globals';
import { UserService } from '../UserService.js';
import { AppError } from '../../shared/errors.js';

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

const mockUser = {
  id: 'user-id',
  username: 'testuser',
  password_hash: 'hash',
  role: 'buyer',
  company: 'arroz',
  language: 'ja',
  deleted_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('UserService', () => {
  let userService: UserService;
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userService = new UserService(mockRepo as any);
  });

  describe('list', () => {
    it('returns paginated users without password_hash', async () => {
      (mockRepo.findAll as jest.Mock).mockResolvedValue({
        items: [mockUser],
        total: 1,
      });

      const result = await userService.list({
        page: 1,
        pageSize: 20,
        search: '',
        sort: 'created_at',
        order: 'desc',
      });

      expect(result.total).toBe(1);
      expect(result.items[0]).not.toHaveProperty('password_hash');
      expect(result.items[0]).toHaveProperty('id');
    });
  });

  describe('create', () => {
    it('creates user successfully', async () => {
      (mockRepo.findByUsername as jest.Mock).mockResolvedValue(null);
      (mockRepo.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.create({
        username: 'testuser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz',
        language: 'ja',
      });

      expect(result).toHaveProperty('id');
      expect(result).not.toHaveProperty('password_hash');
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('throws if username already exists', async () => {
      (mockRepo.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        userService.create({
          username: 'testuser',
          password: 'password123',
          role: 'buyer',
          company: 'arroz',
          language: 'ja',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('update', () => {
    it('updates user and returns without password', async () => {
      (mockRepo.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.update('user-id', { role: 'supplier' });
      expect(result).toHaveProperty('id');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('throws not found if user does not exist', async () => {
      (mockRepo.update as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.update('nonexistent', { role: 'supplier' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('resetPassword', () => {
    it('resets password', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockRepo.updatePassword as jest.Mock).mockResolvedValue(true);

      await userService.resetPassword('user-id', 'newpass123');

      expect(mockRepo.updatePassword).toHaveBeenCalledWith(
        'user-id',
        expect.any(String)
      );
    });

    it('throws not found if user does not exist', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.resetPassword('nonexistent', 'newpass123')
      ).rejects.toThrow(AppError);
    });
  });

  describe('softDelete', () => {
    it('deletes user', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValue(true);

      await userService.softDelete('user-id', 'other-user-id');

      expect(mockRepo.softDelete).toHaveBeenCalledWith('user-id');
    });

    it('throws business error when deleting self', async () => {
      await expect(
        userService.softDelete('user-id', 'user-id')
      ).rejects.toThrow(AppError);
    });

    it('throws not found if user does not exist', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValue(false);

      await expect(
        userService.softDelete('nonexistent', 'other-id')
      ).rejects.toThrow(AppError);
    });
  });
});
