export type UserRole = 'admin' | 'customer' | 'supplier';
export type Company = 'arroz' | 'yunjie' | 'admin';
export type Language = 'zh' | 'ja';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  company: Company;
  language: Language;
  createdAt: string;
  updatedAt: string;
}

export interface LoginForm {
  username: string;
  password: string;
}

export interface CreateUserForm {
  username: string;
  password: string;
  role: UserRole;
  company: Company;
  language?: Language;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}