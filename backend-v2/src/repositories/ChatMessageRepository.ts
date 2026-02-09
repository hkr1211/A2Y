import pg from 'pg';

export interface ChatMessageRow {
  id: string;
  related_id: string;
  related_type: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ChatMessageWithSender extends ChatMessageRow {
  sender_username: string;
  sender_role: string;
}

export class ChatMessageRepository {
  constructor(private pool: pg.Pool) {}

  async create(data: {
    related_id: string;
    related_type: string;
    sender_id: string;
    content: string;
  }): Promise<ChatMessageRow> {
    const result = await this.pool.query(
      `INSERT INTO chat_messages (related_id, related_type, sender_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.related_id, data.related_type, data.sender_id, data.content]
    );
    return result.rows[0];
  }

  async findByRelated(
    relatedType: string,
    relatedId: string,
    options: { since?: string; page?: number; pageSize?: number }
  ): Promise<{ items: ChatMessageWithSender[]; total: number }> {
    const { since, page = 1, pageSize = 50 } = options;

    if (since) {
      // Incremental polling - get new messages since timestamp
      const result = await this.pool.query(
        `SELECT cm.*, u.username AS sender_username, u.role AS sender_role
         FROM chat_messages cm
         JOIN users u ON u.id = cm.sender_id
         WHERE cm.related_type = $1 AND cm.related_id = $2 AND cm.created_at > $3
         ORDER BY cm.created_at ASC`,
        [relatedType, relatedId, since]
      );
      return { items: result.rows, total: result.rows.length };
    }

    // Paginated load
    const countResult = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM chat_messages WHERE related_type = $1 AND related_id = $2',
      [relatedType, relatedId]
    );
    const total = countResult.rows[0].count;
    const offset = (page - 1) * pageSize;

    const result = await this.pool.query(
      `SELECT cm.*, u.username AS sender_username, u.role AS sender_role
       FROM chat_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.related_type = $1 AND cm.related_id = $2
       ORDER BY cm.created_at ASC
       LIMIT $3 OFFSET $4`,
      [relatedType, relatedId, pageSize, offset]
    );

    return { items: result.rows, total };
  }

  async updateReadStatus(
    userId: string,
    relatedType: string,
    relatedId: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO chat_read_status (user_id, related_type, related_id, last_read_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, related_type, related_id)
       DO UPDATE SET last_read_at = NOW()`,
      [userId, relatedType, relatedId]
    );
  }

  async getUnreadCount(
    userId: string,
    relatedType: string,
    relatedId: string
  ): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM chat_messages cm
       WHERE cm.related_type = $1
         AND cm.related_id = $2
         AND cm.created_at > COALESCE(
           (SELECT last_read_at FROM chat_read_status
            WHERE user_id = $3 AND related_type = $1 AND related_id = $2),
           '1970-01-01'
         )
         AND cm.sender_id != $3`,
      [relatedType, relatedId, userId]
    );
    return result.rows[0].count;
  }
}
