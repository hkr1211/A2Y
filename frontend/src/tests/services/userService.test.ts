import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/services/api';
import { UserService, type UserListParams, type UpdateUserForm } from '@/services/userService';
import type { User, CreateUserForm } from '@/types/user';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

// Mock axios
vi.mock('@/services/api');

const mockUser: User = {
  id: '1',
  username: 'testuser',
  role: 'buyer',
  company: 'arroz',
  language: 'zh',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockPaginatedResponse: PaginatedResponse<User> = {
  items: [mockUser],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('fetches users successfully', async () => {
      const mockResponse: ApiResponse<PaginatedResponse<User>> = {
        success: true,
        data: mockPaginatedResponse,
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      const result = await UserService.getUsers();
      
      expect(axios.get).toHaveBeenCalledWith('/api/users', { params: {} });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('fetches users with parameters', async () => {
      const params: UserListParams = {
        page: 2,
        limit: 10,
        search: 'test',
        role: 'buyer',
        company: 'arroz',
      };
      
      const mockResponse: ApiResponse<PaginatedResponse<User>> = {
        success: true,
        data: mockPaginatedResponse,
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      const result = await UserService.getUsers(params);
      
      expect(axios.get).toHaveBeenCalledWith('/api/users', { params });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('throws error when API response is not successful', async () => {
      const mockResponse: ApiResponse<PaginatedResponse<User>> = {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch users',
        },
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      await expect(UserService.getUsers()).rejects.toThrow('Failed to fetch users');
    });

    it('throws error when API response has no data', async () => {
      const mockResponse: ApiResponse<PaginatedResponse<User>> = {
        success: true,
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      await expect(UserService.getUsers()).rejects.toThrow('Failed to fetch users');
    });
  });

  describe('getUserById', () => {
    it('fetches user by ID successfully', async () => {
      const mockResponse: ApiResponse<User> = {
        success: true,
        data: mockUser,
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      const result = await UserService.getUserById('1');
      
      expect(axios.get).toHaveBeenCalledWith('/api/users/1');
      expect(result).toEqual(mockUser);
    });

    it('throws error when user not found', async () => {
      const mockResponse: ApiResponse<User> = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      await expect(UserService.getUserById('999')).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('creates user successfully', async () => {
      const createData: CreateUserForm = {
        username: 'newuser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
      };
      
      const mockResponse: ApiResponse<User> = {
        success: true,
        data: { ...mockUser, username: 'newuser' },
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      const result = await UserService.createUser(createData);
      
      expect(axios.post).toHaveBeenCalledWith('/api/users', createData);
      expect(result.username).toBe('newuser');
    });

    it('throws error when creation fails', async () => {
      const createData: CreateUserForm = {
        username: 'newuser',
        password: 'password123',
        role: 'buyer',
        company: 'arroz',
        language: 'zh',
      };
      
      const mockResponse: ApiResponse<User> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username already exists',
        },
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      await expect(UserService.createUser(createData)).rejects.toThrow('Username already exists');
    });
  });

  describe('updateUser', () => {
    it('updates user successfully', async () => {
      const updateData: UpdateUserForm = {
        role: 'admin',
        company: 'admin',
      };
      
      const updatedUser = { ...mockUser, role: 'admin' as const, company: 'admin' as const };
      const mockResponse: ApiResponse<User> = {
        success: true,
        data: updatedUser,
      };
      
      vi.mocked(axios.put).mockResolvedValue({ data: mockResponse });
      
      const result = await UserService.updateUser('1', updateData);
      
      expect(axios.put).toHaveBeenCalledWith('/api/users/1', updateData);
      expect(result.role).toBe('admin');
      expect(result.company).toBe('admin');
    });

    it('throws error when update fails', async () => {
      const updateData: UpdateUserForm = {
        role: 'admin',
      };
      
      const mockResponse: ApiResponse<User> = {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Permission denied',
        },
      };
      
      vi.mocked(axios.put).mockResolvedValue({ data: mockResponse });
      
      await expect(UserService.updateUser('1', updateData)).rejects.toThrow('Permission denied');
    });
  });

  describe('deleteUser', () => {
    it('deletes user successfully', async () => {
      const mockResponse: ApiResponse<void> = {
        success: true,
      };
      
      vi.mocked(axios.delete).mockResolvedValue({ data: mockResponse });
      
      await UserService.deleteUser('1');
      
      expect(axios.delete).toHaveBeenCalledWith('/api/users/1');
    });

    it('throws error when deletion fails', async () => {
      const mockResponse: ApiResponse<void> = {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Cannot delete user',
        },
      };
      
      vi.mocked(axios.delete).mockResolvedValue({ data: mockResponse });
      
      await expect(UserService.deleteUser('1')).rejects.toThrow('Cannot delete user');
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'));
      
      await expect(UserService.getUsers()).rejects.toThrow('Network Error');
    });

    it('handles axios errors with response', async () => {
      const axiosError = new Error('Network Error');
      
      vi.mocked(axios.get).mockRejectedValue(axiosError);
      
      await expect(UserService.getUsers()).rejects.toThrow('Network Error');
    });
  });
});