import {
  NotificationRepository,
  NotificationRow,
} from '../repositories/NotificationRepository.js';
import { logger } from '../utils/logger.js';

function toNotificationResponse(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    relatedId: row.related_id,
    relatedType: row.related_type,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export class NotificationService {
  constructor(private notificationRepo: NotificationRepository) {}

  async list(
    userId: string,
    params: { page: number; pageSize: number; isRead?: boolean }
  ) {
    const { items, total } = await this.notificationRepo.findByUser(
      userId,
      params
    );
    return {
      items: items.map(toNotificationResponse),
      total,
    };
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepo.getUnreadCount(userId);
  }

  async markRead(notificationId: string, userId: string) {
    await this.notificationRepo.markRead(notificationId, userId);
    return { message: '已标记已读' };
  }

  async markAllRead(userId: string) {
    const count = await this.notificationRepo.markAllRead(userId);
    return { message: `已标记 ${count} 条通知为已读` };
  }

  /**
   * Create a notification for a specific user.
   * Called by other services after business operations.
   */
  async notify(data: {
    userId: string;
    type: string;
    title: string;
    content?: string;
    relatedId?: string;
    relatedType?: string;
  }) {
    try {
      await this.notificationRepo.create({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        related_id: data.relatedId,
        related_type: data.relatedType,
      });
    } catch (err) {
      // Don't fail the main operation if notification creation fails
      logger.error('Failed to create notification', err);
    }
  }
}
