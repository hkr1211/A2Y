export type UserRole = 'admin' | 'buyer' | 'supplier';
export type Company = 'arroz' | 'yunjie' | 'admin';
export type Language = 'zh' | 'ja';

export interface User {
  id: string;
  username: string;
  password: string; // Encrypted
  role: UserRole;
  company: Company;
  language: Language;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  company: Company;
  language?: Language;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: UserRole;
  company?: Company;
  language?: Language;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  data: {
    token: string;
    user: Omit<User, 'password'>;
  };
}

// Default admin account configuration
export const DEFAULT_ADMIN: CreateUserRequest = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  company: 'admin',
  language: 'zh',
};