import { Response } from 'express';
import { TrashService } from '../services/TrashService.js';
import { AuthRequest } from '../shared/types.js';
import { ok } from '../shared/response.js';

export class TrashController {
  constructor(private trashService: TrashService) {
    this.list = this.list.bind(this);
    this.restore = this.restore.bind(this);
    this.permanentDelete = this.permanentDelete.bind(this);
  }

  async list(req: AuthRequest, res: Response) {
    const { page, pageSize, type } = req.query as unknown as {
      page: number;
      pageSize: number;
      type?: string;
    };

    const result = await this.trashService.list({ page, pageSize, type });
    res.json(ok(result));
  }

  async restore(req: AuthRequest, res: Response) {
    const { type, id } = req.params;
    const result = await this.trashService.restore(
      type,
      id,
      req.user!.username
    );
    res.json(ok(result));
  }

  async permanentDelete(req: AuthRequest, res: Response) {
    const { type, id } = req.params;
    const result = await this.trashService.permanentDelete(
      type,
      id,
      req.user!.username
    );
    res.json(ok(result));
  }
}
