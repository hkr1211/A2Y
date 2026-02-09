import pg from 'pg';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  created_at: string;
}

export class NotificationRepository {
  constructor(private pool: pg.Pool) {}

  async create(data: {
    user_id: string;
    type: string;
    title: string;
    content?: string;
    related_id?: string;
    related_type?: string;
  }): Promise<NotificationRow> {
    const result = await this.pool.query(
      `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.user_id,
        data.type,
        data.title,
        data.content || null,
        data.related_id || null,
        data.related_type || null,
      ]
    );
    return result.rows[0];
  }

  async findByUser(
    userId: string,
    options: { page?: number; pageSize?: number; isRead?: boolean }
  ): Promise<{ items: NotificationRow[]; total: number }> {
    const { page = 1, pageSize = 20, isRead } = options;

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (isRead !== undefined) {
      params.push(isRead);
      whereClause += ` AND is_read = $${params.length}`;
    }

    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications ${whereClause}`,
      params
    );
    const total = countResult.rows[0].count;

    const offset = (page - 1) * pageSize;
    const result = await this.pool.query(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return { items: result.rows, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return result.rows[0].count;
  }

  async markRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return result.rowCount ?? 0;
  }
}
