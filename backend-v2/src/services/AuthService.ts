import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository.js';
import { AppError } from '../shared/errors.js';
import { JwtPayload } from '../shared/types.js';

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async login(
    username: string,
    password: string
  ): Promise<{ token: string; user: Record<string, unknown> }> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw AppError.unauthorized('用户名或密码错误');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw AppError.unauthorized('用户名或密码错误');
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role as JwtPayload['role'],
      company: user.company as JwtPayload['company'],
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) throw AppError.internal('JWT_SECRET not configured');

    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        company: user.company,
        language: user.language,
      },
    };
  }

  async getMe(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw AppError.notFound('用户不存在');

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      company: user.company,
      language: user.language,
      createdAt: user.created_at,
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw AppError.notFound('用户不存在');

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      throw AppError.business('旧密码不正确');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.updatePassword(userId, hash);
  }
}
