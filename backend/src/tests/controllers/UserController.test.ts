import { Request, Response } from 'express';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../models/User';
import type { User, CreateUserRequest, UpdateUserRequest } from '../../types/user';

// Mock UserModel
jest.mock('../../models/User');
const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('UserController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users successfully', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'testuser1',
          role: 'buyer' as const,
          company: 'arroz' as const,
          language: 'zh' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          username: 'testuser2',
          role: 'supplier' as const,
          company: 'yunjie' as const,
          language: 'ja' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      MockedUserModel.findAll.mockResolvedValue(mockUsers);

      await UserController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.findAll).toHaveBeenCalledTimes(1);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          users: mockUsers,
          total: mockUsers.length,
        },
      });
    });

    it('should handle database errors', async () => {
      MockedUserModel.findAll.mockRejectedValue(new Error('Database error'));

      await UserController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching users',
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID successfully', async () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: '1' };
      MockedUserModel.findById.mockResolvedValue(mockUser);

      await UserController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.findById).toHaveBeenCalledWith('1');
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

    it('should return 400 if user ID is missing', async () => {
      mockRequest.params = {};

      await UserController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.params = { id: '1' };
      MockedUserModel.findById.mockResolvedValue(null);

      await UserController.getUserById(mockRequest as Request, mockResponse as Response);

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

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const createUserData: CreateUserRequest = {
        username: 'newuser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
      };

      const mockCreatedUser: User = {
        id: '1',
        username: 'newuser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = createUserData;
      MockedUserModel.create.mockResolvedValue(mockCreatedUser);

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.create).toHaveBeenCalledWith(createUserData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: mockCreatedUser.id,
            username: mockCreatedUser.username,
            role: mockCreatedUser.role,
            company: mockCreatedUser.company,
            language: mockCreatedUser.language,
            createdAt: mockCreatedUser.createdAt,
            updatedAt: mockCreatedUser.updatedAt,
          },
          message: 'User created successfully',
        },
      });
    });

    it('should return 400 for invalid input data', async () => {
      mockRequest.body = {
        username: 'ab', // Too short
        password: '123', // Too short
        role: 'invalid', // Invalid role
      };

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
        },
      });
    });

    it('should return 409 if username already exists', async () => {
      const createUserData: CreateUserRequest = {
        username: 'existinguser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
      };

      mockRequest.body = createUserData;
      MockedUserModel.create.mockRejectedValue(new Error('Username already exists'));

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already exists',
        },
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData: UpdateUserRequest = {
        username: 'updateduser',
        language: 'ja',
      };

      const mockUpdatedUser: User = {
        id: '1',
        username: 'updateduser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'ja',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: '1' };
      mockRequest.body = updateData;
      MockedUserModel.update.mockResolvedValue(mockUpdatedUser);

      await UserController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.update).toHaveBeenCalledWith('1', updateData);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: mockUpdatedUser.id,
            username: mockUpdatedUser.username,
            role: mockUpdatedUser.role,
            company: mockUpdatedUser.company,
            language: mockUpdatedUser.language,
            createdAt: mockUpdatedUser.createdAt,
            updatedAt: mockUpdatedUser.updatedAt,
          },
          message: 'User updated successfully',
        },
      });
    });

    it('should return 400 if user ID is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = { username: 'newname' };

      await UserController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { username: 'newname' };
      MockedUserModel.update.mockResolvedValue(null);

      await UserController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('should return 400 for invalid update data', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {
        username: 'ab', // Too short
        role: 'invalid', // Invalid role
      };

      await UserController.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
        },
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: '1' };
      (mockRequest as any).user = { userId: '2' }; // Different user ID
      MockedUserModel.findById.mockResolvedValue(mockUser);
      MockedUserModel.delete.mockResolvedValue(true);

      await UserController.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.findById).toHaveBeenCalledWith('1');
      expect(MockedUserModel.delete).toHaveBeenCalledWith('1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'User deleted successfully',
        },
      });
    });

    it('should return 400 if user ID is missing', async () => {
      mockRequest.params = {};

      await UserController.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
        },
      });
    });

    it('should return 400 if user tries to delete themselves', async () => {
      mockRequest.params = { id: '1' };
      (mockRequest as any).user = { userId: '1' }; // Same user ID

      await UserController.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot delete your own account',
        },
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.params = { id: '1' };
      (mockRequest as any).user = { userId: '2' };
      MockedUserModel.findById.mockResolvedValue(null);

      await UserController.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('should return 500 if delete operation fails', async () => {
      const mockUser: User = {
        id: '1',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: '1' };
      (mockRequest as any).user = { userId: '2' };
      MockedUserModel.findById.mockResolvedValue(mockUser);
      MockedUserModel.delete.mockResolvedValue(false);

      await UserController.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete user',
        },
      });
    });
  });
});