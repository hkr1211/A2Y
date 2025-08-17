import { UserModel } from '../../models/User';
import { pool } from '../../config/database';
import type { CreateUserRequest, UpdateUserRequest } from '../../types/user';

// Mock the database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('UserModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCreateUser', () => {
    it('should validate valid user data', () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz',
        language: 'zh'
      };

      const result = UserModel.validateCreateUser(userData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(userData);
    });

    it('should reject invalid username', () => {
      const userData: CreateUserRequest = {
        username: 'ab', // Too short
        password: 'password123',
        role: 'buyer',
        company: 'arroz'
      };

      const result = UserModel.validateCreateUser(userData);
      expect(result.error).toContain('Username must be at least 3 characters long');
    });

    it('should reject invalid password', () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        password: '123', // Too short
        role: 'buyer',
        company: 'arroz'
      };

      const result = UserModel.validateCreateUser(userData);
      expect(result.error).toContain('Password must be at least 6 characters long');
    });

    it('should reject invalid role', () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        role: 'invalid_role',
        company: 'arroz'
      } as CreateUserRequest;

      const result = UserModel.validateCreateUser(userData);
      expect(result.error).toContain('Role must be one of: admin, buyer, supplier');
    });

    it('should reject invalid company', () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        role: 'buyer',
        company: 'invalid_company'
      } as CreateUserRequest;

      const result = UserModel.validateCreateUser(userData);
      expect(result.error).toContain('Company must be one of: arroz, yunjie, admin');
    });

    it('should use default language when not provided', () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz'
      };

      const result = UserModel.validateCreateUser(userData);
      expect(result.error).toBeUndefined();
      expect(result.value?.language).toBe('zh');
    });
  });

  describe('validateUpdateUser', () => {
    it('should validate valid update data', () => {
      const updateData: UpdateUserRequest = {
        username: 'newusername',
        language: 'ja'
      };

      const result = UserModel.validateUpdateUser(updateData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(updateData);
    });

    it('should reject empty update data', () => {
      const updateData: UpdateUserRequest = {};

      const result = UserModel.validateUpdateUser(updateData);
      expect(result.error).toContain('must have at least 1 key');
    });

    it('should validate partial update data', () => {
      const updateData: UpdateUserRequest = {
        language: 'ja'
      };

      const result = UserModel.validateUpdateUser(updateData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(updateData);
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hash = await UserModel.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 characters
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await UserModel.hashPassword(password);
      const hash2 = await UserModel.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await UserModel.hashPassword(password);

      const isValid = await UserModel.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await UserModel.hashPassword(password);

      const isValid = await UserModel.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz',
        language: 'zh'
      };

      const mockUser = {
        id: 'test-uuid',
        username: 'testuser',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock findByUsername to return null (user doesn't exist)
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any) // findByUsername
        .mockResolvedValueOnce({ rows: [mockUser] } as any); // insert

      const result = await UserModel.create(userData);

      expect(result.id).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
      expect(result.role).toBe(mockUser.role);
      expect(result.company).toBe(mockUser.company);
      expect(result.language).toBe(mockUser.language);
    });

    it('should throw error for duplicate username', async () => {
      const userData: CreateUserRequest = {
        username: 'existinguser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz'
      };

      const existingUser = {
        id: 'existing-uuid',
        username: 'existinguser',
        password_hash: 'hashed',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock findByUsername to return existing user
      mockPool.query.mockResolvedValueOnce({ rows: [existingUser] } as any);

      await expect(UserModel.create(userData)).rejects.toThrow('Username already exists');
    });

    it('should throw error for invalid data', async () => {
      const userData = {
        username: 'ab', // Too short
        password: 'password123',
        role: 'buyer',
        company: 'arroz'
      } as CreateUserRequest;

      await expect(UserModel.create(userData)).rejects.toThrow('Validation error');
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const userId = 'test-uuid';
      const mockUser = {
        id: userId,
        username: 'testuser',
        password_hash: 'hashed',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] } as any);

      const result = await UserModel.findById(userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(userId);
      expect(result?.username).toBe('testuser');
      expect(result?.password).toBe('hashed');
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-uuid';

      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await UserModel.findById(userId);

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const username = 'testuser';
      const mockUser = {
        id: 'test-uuid',
        username: username,
        password_hash: 'hashed',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] } as any);

      const result = await UserModel.findByUsername(username);

      expect(result).toBeDefined();
      expect(result?.username).toBe(username);
      expect(result?.password).toBe('hashed');
    });

    it('should return null for non-existent username', async () => {
      const username = 'nonexistent';

      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await UserModel.findByUsername(username);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const mockUsers = [
        {
          id: 'user1',
          username: 'user1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'user2',
          username: 'user2',
          role: 'supplier',
          company: 'yunjie',
          language: 'ja',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockUsers } as any);

      const result = await UserModel.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0].username).toBe('user1');
      expect(result[1].username).toBe('user2');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userId = 'test-uuid';
      const updateData: UpdateUserRequest = {
        username: 'newusername',
        language: 'ja'
      };

      const existingUser = {
        id: userId,
        username: 'oldusername',
        password_hash: 'hashed',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedUser = {
        ...existingUser,
        username: 'newusername',
        language: 'ja',
        updated_at: new Date()
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [existingUser] } as any) // findById
        .mockResolvedValueOnce({ rows: [] } as any) // check username availability
        .mockResolvedValueOnce({ rows: [updatedUser] } as any); // update

      const result = await UserModel.update(userId, updateData);

      expect(result).toBeDefined();
      expect(result?.username).toBe('newusername');
      expect(result?.language).toBe('ja');
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-uuid';
      const updateData: UpdateUserRequest = {
        username: 'newusername'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] } as any); // findById

      const result = await UserModel.update(userId, updateData);

      expect(result).toBeNull();
    });

    it('should throw error for duplicate username', async () => {
      const userId = 'test-uuid';
      const updateData: UpdateUserRequest = {
        username: 'existingusername'
      };

      const existingUser = {
        id: userId,
        username: 'oldusername',
        password_hash: 'hashed',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        created_at: new Date(),
        updated_at: new Date()
      };

      const userWithSameUsername = {
        id: 'other-uuid',
        username: 'existingusername',
        password_hash: 'hashed',
        role: 'supplier',
        company: 'yunjie',
        language: 'zh',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [existingUser] } as any) // findById
        .mockResolvedValueOnce({ rows: [userWithSameUsername] } as any); // check username

      await expect(UserModel.update(userId, updateData)).rejects.toThrow('Username already exists');
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userId = 'test-uuid';

      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await UserModel.delete(userId);

      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const userId = 'non-existent-uuid';

      mockPool.query.mockResolvedValueOnce({ rowCount: 0 } as any);

      const result = await UserModel.delete(userId);

      expect(result).toBe(false);
    });
  });

  describe('hasUsers', () => {
    it('should return true when users exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);

      const result = await UserModel.hasUsers();

      expect(result).toBe(true);
    });

    it('should return false when no users exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      const result = await UserModel.hasUsers();

      expect(result).toBe(false);
    });
  });
});