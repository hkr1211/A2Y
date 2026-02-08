import { Response } from 'express';
import { UserService } from '../services/UserService.js';
import { AuthRequest } from '../shared/types.js';
import { ok, created, paginated } from '../shared/response.js';

export class UserController {
  constructor(private userService: UserService) {}

  list = async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, search, sort, order, role } = req.query as unknown as {
      page: number;
      pageSize: number;
      search: string;
      sort: string;
      order: string;
      role?: string;
    };

    const result = await this.userService.list({
      page,
      pageSize,
      search,
      sort,
      order,
      role,
    });

    res.json(paginated(result.items, result.total, page, pageSize));
  };

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.userService.create(req.body);
    res.status(201).json(created(user));
  };

  update = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.userService.update(req.params.id, req.body);
    res.json(ok(user));
  };

  resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
    await this.userService.resetPassword(req.params.id, req.body.newPassword);
    res.json(ok({ message: '密码已重置' }));
  };

  remove = async (req: AuthRequest, res: Response): Promise<void> => {
    await this.userService.softDelete(req.params.id, req.user!.userId);
    res.json(ok({ message: '用户已删除' }));
  };
}
