import {
  AuditLogRepository,
  AuditLogWithUser,
} from '../repositories/AuditLogRepository.js';

function toAuditLogResponse(row: AuditLogWithUser) {
  return {
    id: row.id,
    user: { id: row.user_id, username: row.username },
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    summary: row.summary,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export class AuditLogService {
  constructor(private auditRepo: AuditLogRepository) {}

  async list(params: {
    page: number;
    pageSize: number;
    userId?: string;
    action?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { items, total } = await this.auditRepo.findAll(params);
    return {
      items: items.map(toAuditLogResponse),
      total,
    };
  }

  /**
   * Record an audit log entry. Called by other services.
   */
  async log(data: {
    userId: string;
    action: string;
    targetType: string;
    targetId?: string;
    summary?: string;
    ipAddress?: string;
  }) {
    await this.auditRepo.create({
      user_id: data.userId,
      action: data.action,
      target_type: data.targetType,
      target_id: data.targetId,
      summary: data.summary,
      ip_address: data.ipAddress,
    });
  }
}
