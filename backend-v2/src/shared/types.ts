import { Request } from 'express';

export type UserRole = 'admin' | 'buyer' | 'supplier';

export type Company = 'arroz' | 'yunjie' | 'admin';

export type Language = 'zh' | 'ja';

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  company: Company;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
