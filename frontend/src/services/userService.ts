import axios from './api';
import type { User, CreateUserForm } from '@/types/user';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/api';

export interface UpdateUserForm {
  username?: string;
  role?: 'admin' | 'buyer' | 'supplier';
  company?: 'arroz' | 'yunjie' | 'admin';
  language?: 'zh' | 'ja';
}

export interface UserListParams extends PaginationParams {
  search?: string;
  role?: 'admin' | 'buyer' | 'supplier';
  company?: 'arroz' | 'yunjie' | 'admin';
}

export class UserService {
  /**
   * Get paginated list of users
   */
  static async getUsers(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
    const response = await axios.get<ApiResponse<PaginatedResponse<User>>>('/api/users', {
      params,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch users');
    }

    return response.data.data;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User> {
    const response = await axios.get<ApiResponse<User>>(`/api/users/${id}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch user');
    }

    return response.data.data;
  }

  /**
   * Create new user
   */
  static async createUser(userData: CreateUserForm): Promise<User> {
    const response = await axios.post<ApiResponse<User>>('/api/users', userData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create user');
    }

    return response.data.data;
  }

  /**
   * Update user
   */
  static async updateUser(id: string, userData: UpdateUserForm): Promise<User> {
    const response = await axios.put<ApiResponse<User>>(`/api/users/${id}`, userData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to update user');
    }

    return response.data.data;
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string): Promise<void> {
    const response = await axios.delete<ApiResponse<void>>(`/api/users/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete user');
    }
  }
}