import api from './api';
import type { ApiResponse, LoginResponse, User } from '@/types';

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
    username,
    password,
  });
  return res.data.data;
}

export async function getMe(): Promise<User> {
  const res = await api.get<ApiResponse<User>>('/auth/me');
  return res.data.data;
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await api.put('/auth/password', { oldPassword, newPassword });
}
