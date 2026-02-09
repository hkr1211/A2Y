import { Response } from 'express';
import { NotificationService } from '../services/NotificationService.js';
import { AuthRequest } from '../shared/types.js';
import { ok } from '../shared/response.js';

export class NotificationController {
  constructor(private notificationService: NotificationService) {
    this.list = this.list.bind(this);
    this.getUnreadCount = this.getUnreadCount.bind(this);
    this.markRead = this.markRead.bind(this);
  }

  async list(req: AuthRequest, res: Response) {
    const user = req.user!;
    const { page, pageSize, isRead } = req.query as unknown as {
      page: number;
      pageSize: number;
      isRead?: string;
    };

    const result = await this.notificationService.list(user.userId, {
      page,
      pageSize,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
    });
    res.json(ok(result));
  }

  async getUnreadCount(req: AuthRequest, res: Response) {
    const user = req.user!;
    const count = await this.notificationService.getUnreadCount(user.userId);
    res.json(ok({ count }));
  }

  async markRead(req: AuthRequest, res: Response) {
    const user = req.user!;
    const { id, all } = req.body;

    if (all) {
      const result = await this.notificationService.markAllRead(user.userId);
      res.json(ok(result));
    } else {
      const result = await this.notificationService.markRead(id, user.userId);
      res.json(ok(result));
    }
  }
}
