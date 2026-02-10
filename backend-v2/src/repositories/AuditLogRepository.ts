import pg from 'pg';

export interface AuditLogRow {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogWithUser extends AuditLogRow {
  username: string;
}

export class AuditLogRepository {
  constructor(private pool: pg.Pool) {}

  async create(data: {
    user_id: string;
    action: string;
    target_type: string;
    target_id?: string;
    summary?: string;
    ip_address?: string;
  }): Promise<AuditLogRow> {
    const result = await this.pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, summary, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.user_id,
        data.action,
        data.target_type,
        data.target_id || null,
        data.summary || null,
        data.ip_address || null,
      ]
    );
    return result.rows[0];
  }

  async findAll(params: {
    page: number;
    pageSize: number;
    userId?: string;
    action?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: AuditLogWithUser[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.userId) {
      values.push(params.userId);
      conditions.push(`al.user_id = $${values.length}`);
    }
    if (params.action) {
      values.push(params.action);
      conditions.push(`al.action = $${values.length}`);
    }
    if (params.targetType) {
      values.push(params.targetType);
      conditions.push(`al.target_type = $${values.length}`);
    }
    if (params.startDate) {
      values.push(params.startDate);
      conditions.push(`al.created_at >= $${values.length}`);
    }
    if (params.endDate) {
      values.push(params.endDate);
      conditions.push(`al.created_at <= $${values.length}`);
    }

    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM audit_logs al ${whereClause}`,
      values
    );
    const total = countResult.rows[0].count;

    const offset = (params.page - 1) * params.pageSize;
    values.push(params.pageSize, offset);

    const result = await this.pool.query(
      `SELECT al.*, u.username
       FROM audit_logs al
       JOIN users u ON u.id = al.user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return { items: result.rows, total };
  }
}
