import { Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { AuthRequest } from '../shared/types.js';
import { ok } from '../shared/response.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  login = async (req: AuthRequest, res: Response): Promise<void> => {
    const { username, password } = req.body;
    const result = await this.authService.login(username, password);
    res.json(ok(result));
  };

  getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.authService.getMe(req.user!.userId);
    res.json(ok(user));
  };

  changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    const { oldPassword, newPassword } = req.body;
    await this.authService.changePassword(
      req.user!.userId,
      oldPassword,
      newPassword
    );
    res.json(ok({ message: '密码修改成功' }));
  };
}
