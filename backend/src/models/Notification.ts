import { Pool } from 'pg';
import { Notification, CreateNotificationRequest, NotificationType, RelatedType } from '../types/notification';

export class NotificationModel {
  constructor(private db: Pool) {}

  /**
   * 创建通知
   */
  async create(data: CreateNotificationRequest): Promise<Notification> {
    const query = `
      INSERT INTO notifications (user_id, type, title, content, related_id, related_type, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING *
    `;

    const values = [
      data.userId,
      data.type,
      data.title,
      data.content,
      data.relatedId,
      data.relatedType
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * 根据ID获取通知
   */
  async findById(id: string): Promise<Notification | null> {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * 获取用户的所有通知
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [userId, limit, offset]);
    return result.rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * 获取用户未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false';
    const result = await this.db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * 获取用户未读通知
   */
  async findUnreadByUserId(userId: string, limit: number = 50): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 AND is_read = false 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    const result = await this.db.query(query, [userId, limit]);
    return result.rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * 根据类型和相关ID查找通知
   */
  async findByRelated(relatedId: string, relatedType: RelatedType, type?: NotificationType): Promise<Notification[]> {
    let query = 'SELECT * FROM notifications WHERE related_id = $1 AND related_type = $2';
    const values: any[] = [relatedId, relatedType];

    if (type) {
      query += ' AND type = $3';
      values.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(id: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.db.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `;

    const result = await this.db.query(query, [userId]);
    return result.rowCount;
  }

  /**
   * 标记特定类型的通知为已读
   */
  async markTypeAsRead(userId: string, type: NotificationType, relatedId?: string): Promise<number> {
    let query = `
      UPDATE notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND type = $2 AND is_read = false
    `;
    const values: any[] = [userId, type];

    if (relatedId) {
      query += ' AND related_id = $3';
      values.push(relatedId);
    }

    const result = await this.db.query(query, values);
    return result.rowCount;
  }

  /**
   * 删除通知
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2';
    const result = await this.db.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  /**
   * 删除用户的所有通知
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const query = 'DELETE FROM notifications WHERE user_id = $1';
    const result = await this.db.query(query, [userId]);
    return result.rowCount;
  }

  /**
   * 删除特定类型的通知
   */
  async deleteByType(userId: string, type: NotificationType, relatedId?: string): Promise<number> {
    let query = 'DELETE FROM notifications WHERE user_id = $1 AND type = $2';
    const values: any[] = [userId, type];

    if (relatedId) {
      query += ' AND related_id = $3';
      values.push(relatedId);
    }

    const result = await this.db.query(query, values);
    return result.rowCount;
  }

  /**
   * 清理过期通知（超过指定天数的已读通知）
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM notifications 
      WHERE is_read = true 
      AND created_at < NOW() - INTERVAL '${daysOld} days'
    `;

    const result = await this.db.query(query);
    return result.rowCount;
  }

  /**
   * 获取通知统计信息
   */
  async getStatistics(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
  }> {
    // 获取总数和未读数
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
      FROM notifications 
      WHERE user_id = $1
    `;
    const countResult = await this.db.query(countQuery, [userId]);

    // 获取按类型分组的统计
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM notifications 
      WHERE user_id = $1
      GROUP BY type
    `;
    const typeResult = await this.db.query(typeQuery, [userId]);

    const byType: Record<NotificationType, number> = {
      quotation_received: 0,
      order_confirmed: 0,
      status_updated: 0,
      message_received: 0
    };

    typeResult.rows.forEach(row => {
      byType[row.type as NotificationType] = parseInt(row.count);
    });

    return {
      total: parseInt(countResult.rows[0].total),
      unread: parseInt(countResult.rows[0].unread),
      byType
    };
  }

  /**
   * 将数据库行映射为Notification对象
   */
  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      relatedId: row.related_id,
      relatedType: row.related_type,
      isRead: row.is_read,
      createdAt: new Date(row.created_at)
    };
  }
}