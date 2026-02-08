import bcrypt from 'bcryptjs';
import { UserRepository, UserRow } from '../repositories/UserRepository.js';
import { AppError } from '../shared/errors.js';

function toUserResponse(user: UserRow): Record<string, unknown> {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    company: user.company,
    language: user.language,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async list(params: {
    page: number;
    pageSize: number;
    search: string;
    sort: string;
    order: string;
    role?: string;
  }) {
    const { items, total } = await this.userRepo.findAll(params);
    return {
      items: items.map(toUserResponse),
      total,
    };
  }

  async create(data: {
    username: string;
    password: string;
    role: string;
    company: string;
    language: string;
  }) {
    // Check username uniqueness
    const existing = await this.userRepo.findByUsername(data.username);
    if (existing) {
      throw AppError.validation('用户名已存在');
    }

    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.userRepo.create({
      username: data.username,
      password_hash: hash,
      role: data.role,
      company: data.company,
      language: data.language,
    });

    return toUserResponse(user);
  }

  async update(
    id: string,
    data: Partial<{ role: string; company: string; language: string }>
  ) {
    const user = await this.userRepo.update(id, data);
    if (!user) throw AppError.notFound('用户不存在');
    return toUserResponse(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('用户不存在');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.updatePassword(id, hash);
  }

  async softDelete(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw AppError.business('不能删除自己');
    }

    const deleted = await this.userRepo.softDelete(id);
    if (!deleted) throw AppError.notFound('用户不存在');
  }
}
