import { InitializationService } from '../../services/InitializationService';
import { UserModel } from '../../models/User';
import { DEFAULT_ADMIN } from '../../types/user';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/migrationRunner', () => ({
  MigrationRunner: jest.fn().mockImplementation(() => ({
    runMigrations: jest.fn(),
  })),
}));

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('InitializationService', () => {
  let initService: InitializationService;
  let mockRunMigrations: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock for runMigrations
    mockRunMigrations = jest.fn();
    
    initService = new InitializationService();
    
    // Mock the runMigrations method on the instance
    (initService as any).migrationRunner = {
      runMigrations: mockRunMigrations,
    };
  });

  describe('initialize', () => {
    it('should run migrations and create default admin when no users exist', async () => {
      const mockAdminUser = {
        id: 'admin-uuid',
        username: 'admin',
        password: 'hashed-password',
        role: 'admin' as const,
        company: 'admin' as const,
        language: 'zh' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserModel.hasUsers.mockResolvedValue(false);
      mockUserModel.create.mockResolvedValue(mockAdminUser);

      await initService.initialize();

      expect(mockRunMigrations).toHaveBeenCalledTimes(1);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.create).toHaveBeenCalledWith(DEFAULT_ADMIN);
    });

    it('should run migrations but skip admin creation when users exist', async () => {
      mockUserModel.hasUsers.mockResolvedValue(true);

      await initService.initialize();

      expect(mockRunMigrations).toHaveBeenCalledTimes(1);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    it('should handle admin creation error gracefully when admin already exists', async () => {
      mockUserModel.hasUsers.mockResolvedValue(false);
      mockUserModel.create.mockRejectedValue(new Error('Username already exists'));

      await expect(initService.initialize()).resolves.not.toThrow();

      expect(mockRunMigrations).toHaveBeenCalledTimes(1);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.create).toHaveBeenCalledWith(DEFAULT_ADMIN);
    });

    it('should throw error when migration fails', async () => {
      const migrationError = new Error('Migration failed');
      mockRunMigrations.mockRejectedValue(migrationError);

      await expect(initService.initialize()).rejects.toThrow('Migration failed');

      expect(mockRunMigrations).toHaveBeenCalledTimes(1);
      expect(mockUserModel.hasUsers).not.toHaveBeenCalled();
    });

    it('should throw error when admin creation fails with unexpected error', async () => {
      const createError = new Error('Database connection failed');
      mockUserModel.hasUsers.mockResolvedValue(false);
      mockUserModel.create.mockRejectedValue(createError);

      await expect(initService.initialize()).rejects.toThrow('Database connection failed');

      expect(mockRunMigrations).toHaveBeenCalledTimes(1);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.create).toHaveBeenCalledWith(DEFAULT_ADMIN);
    });
  });

  describe('isInitialized', () => {
    it('should return true when users exist', async () => {
      mockUserModel.hasUsers.mockResolvedValue(true);

      const result = await initService.isInitialized();

      expect(result).toBe(true);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
    });

    it('should return false when no users exist', async () => {
      mockUserModel.hasUsers.mockResolvedValue(false);

      const result = await initService.isInitialized();

      expect(result).toBe(false);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
    });

    it('should return false when error occurs', async () => {
      mockUserModel.hasUsers.mockRejectedValue(new Error('Database error'));

      const result = await initService.isInitialized();

      expect(result).toBe(false);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetSystem', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should reset system in non-production environment', async () => {
      process.env.NODE_ENV = 'development';

      const existingAdmin = {
        id: 'existing-admin-uuid',
        username: 'admin',
        password: 'old-hashed-password',
        role: 'admin' as const,
        company: 'admin' as const,
        language: 'zh' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newAdmin = {
        id: 'new-admin-uuid',
        username: 'admin',
        password: 'new-hashed-password',
        role: 'admin' as const,
        company: 'admin' as const,
        language: 'zh' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserModel.findByUsername.mockResolvedValue(existingAdmin);
      mockUserModel.delete.mockResolvedValue(true);
      mockUserModel.hasUsers.mockResolvedValue(false);
      mockUserModel.create.mockResolvedValue(newAdmin);

      await initService.resetSystem();

      expect(mockUserModel.findByUsername).toHaveBeenCalledWith(DEFAULT_ADMIN.username);
      expect(mockUserModel.delete).toHaveBeenCalledWith(existingAdmin.id);
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.create).toHaveBeenCalledWith(DEFAULT_ADMIN);
    });

    it('should handle case when admin does not exist during reset', async () => {
      process.env.NODE_ENV = 'development';

      const newAdmin = {
        id: 'new-admin-uuid',
        username: 'admin',
        password: 'new-hashed-password',
        role: 'admin' as const,
        company: 'admin' as const,
        language: 'zh' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserModel.findByUsername.mockResolvedValue(null);
      mockUserModel.hasUsers.mockResolvedValue(false);
      mockUserModel.create.mockResolvedValue(newAdmin);

      await initService.resetSystem();

      expect(mockUserModel.findByUsername).toHaveBeenCalledWith(DEFAULT_ADMIN.username);
      expect(mockUserModel.delete).not.toHaveBeenCalled();
      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.create).toHaveBeenCalledWith(DEFAULT_ADMIN);
    });

    it('should throw error in production environment', async () => {
      process.env.NODE_ENV = 'production';

      await expect(initService.resetSystem()).rejects.toThrow(
        'System reset is not allowed in production environment'
      );

      expect(mockUserModel.findByUsername).not.toHaveBeenCalled();
      expect(mockUserModel.delete).not.toHaveBeenCalled();
      expect(mockUserModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getSystemStatus', () => {
    it('should return correct system status', async () => {
      const mockUsers = [
        {
          id: 'admin-uuid',
          username: 'admin',
          role: 'admin' as const,
          company: 'admin' as const,
          language: 'zh' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'user-uuid',
          username: 'testuser',
          role: 'buyer' as const,
          company: 'arroz' as const,
          language: 'zh' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockUserModel.hasUsers.mockResolvedValue(true);
      mockUserModel.findAll.mockResolvedValue(mockUsers);

      const result = await initService.getSystemStatus();

      expect(result).toEqual({
        initialized: true,
        userCount: 2,
        hasDefaultAdmin: true
      });

      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return default status when error occurs', async () => {
      mockUserModel.hasUsers.mockRejectedValue(new Error('Database error'));

      const result = await initService.getSystemStatus();

      expect(result).toEqual({
        initialized: false,
        userCount: 0,
        hasDefaultAdmin: false
      });

      expect(mockUserModel.hasUsers).toHaveBeenCalledTimes(1);
      expect(mockUserModel.findAll).not.toHaveBeenCalled();
    });

    it('should detect when default admin does not exist', async () => {
      const mockUsers = [
        {
          id: 'user-uuid',
          username: 'testuser',
          role: 'buyer' as const,
          company: 'arroz' as const,
          language: 'zh' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockUserModel.hasUsers.mockResolvedValue(true);
      mockUserModel.findAll.mockResolvedValue(mockUsers);

      const result = await initService.getSystemStatus();

      expect(result).toEqual({
        initialized: true,
        userCount: 1,
        hasDefaultAdmin: false
      });
    });
  });
});