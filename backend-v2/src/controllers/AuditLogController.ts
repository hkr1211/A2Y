import { Response } from 'express';
import { AuditLogService } from '../services/AuditLogService.js';
import { AuthRequest } from '../shared/types.js';
import { ok } from '../shared/response.js';

export class AuditLogController {
  constructor(private auditService: AuditLogService) {
    this.list = this.list.bind(this);
  }

  async list(req: AuthRequest, res: Response) {
    const {
      page,
      pageSize,
      userId,
      action,
      targetType,
      startDate,
      endDate,
    } = req.query as unknown as {
      page: number;
      pageSize: number;
      userId?: string;
      action?: string;
      targetType?: string;
      startDate?: string;
      endDate?: string;
    };

    const result = await this.auditService.list({
      page,
      pageSize,
      userId,
      action,
      targetType,
      startDate,
      endDate,
    });

    res.json(ok(result));
  }
}
