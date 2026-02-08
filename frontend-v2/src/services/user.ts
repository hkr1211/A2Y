import api from './api';
import type { ApiResponse, ApiPaginatedResponse, User } from '@/types';

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  role: string;
  company: string;
  language: string;
}

export interface UpdateUserData {
  role?: string;
  company?: string;
  language?: string;
}

export async function getUsers(
  params: UserListParams = {}
): Promise<ApiPaginatedResponse<User>['data']> {
  const res = await api.get<ApiPaginatedResponse<User>>('/users', { params });
  return res.data.data;
}

export async function createUser(data: CreateUserData): Promise<User> {
  const res = await api.post<ApiResponse<User>>('/users', data);
  return res.data.data;
}

export async function updateUser(
  id: string,
  data: UpdateUserData
): Promise<User> {
  const res = await api.put<ApiResponse<User>>(`/users/${id}`, data);
  return res.data.data;
}

export async function resetPassword(
  id: string,
  newPassword: string
): Promise<void> {
  await api.put(`/users/${id}/reset-password`, { newPassword });
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
