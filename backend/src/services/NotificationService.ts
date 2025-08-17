import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { NotificationModel } from '../models/Notification';
import { Notification, CreateNotificationRequest, NotificationType } from '../types/notification';

export class NotificationService extends EventEmitter {
  private notificationModel: NotificationModel;

  constructor(private db: Pool) {
    super();
    this.notificationModel = new NotificationModel(db);
  }

  /**
   * 创建通知
   */
  async createNotification(data: CreateNotificationRequest): Promise<Notification> {
    const notification = await this.notificationModel.create(data);

    // 发出通知事件
    this.emit('notification_created', notification);

    return notification;
  }

  /**
   * 创建报价通知
   */
  async createQuotationNotification(quotationId: string, inquiryId: string, buyerUserId: string): Promise<Notification> {
    // 获取询单信息
    const inquiryQuery = 'SELECT product_name FROM inquiries WHERE id = $1';
    const inquiryResult = await this.db.query(inquiryQuery, [inquiryId]);
    
    if (inquiryResult.rows.length === 0) {
      throw new Error('询单不存在');
    }

    const productName = inquiryResult.rows[0].product_name;

    return this.createNotification({
      userId: buyerUserId,
      type: 'quotation_received',
      title: '收到新报价',
      content: `您的询单"${productName}"收到了新的报价，请及时查看。`,
      relatedId: inquiryId,
      relatedType: 'inquiry'
    });
  }

  /**
   * 获取用户的所有通知
   */
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    return this.notificationModel.findByUserId(userId, limit, offset);
  }

  /**
   * 获取用户未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.getUnreadCount(userId);
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const success = await this.notificationModel.markAsRead(notificationId, userId);
    
    if (success) {
      this.emit('notification_read', { notificationId, userId });
    }
    
    return success;
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.notificationModel.markAllAsRead(userId);
    
    if (count > 0) {
      this.emit('all_notifications_read', { userId, count });
    }
    
    return count;
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const success = await this.notificationModel.delete(notificationId, userId);
    
    if (success) {
      this.emit('notification_deleted', { notificationId, userId });
    }
    
    return success;
  }

  /**
   * 清理过期通知（超过30天的已读通知）
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const count = await this.notificationModel.cleanupOldNotifications(daysOld);
    
    if (count > 0) {
      this.emit('notifications_cleaned', { count, daysOld });
    }
    
    return count;
  }

  /**
   * 创建订单确认通知
   */
  async createOrderConfirmationNotification(orderId: string, buyerUserId: string): Promise<Notification> {
    // 获取订单信息
    const orderQuery = 'SELECT product_name FROM orders WHERE id = $1';
    const orderResult = await this.db.query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      throw new Error('订单不存在');
    }

    const productName = orderResult.rows[0].product_name;

    return this.createNotification({
      userId: buyerUserId,
      type: 'order_confirmed',
      title: '订单已确认',
      content: `您的订单"${productName}"已被供应商确认，请及时查看。`,
      relatedId: orderId,
      relatedType: 'order'
    });
  }

  /**
   * 创建订单状态更新通知
   */
  async createOrderStatusNotification(orderId: string, buyerUserId: string, newStatus: string): Promise<Notification> {
    // 获取订单信息
    const orderQuery = 'SELECT product_name FROM orders WHERE id = $1';
    const orderResult = await this.db.query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      throw new Error('订单不存在');
    }

    const productName = orderResult.rows[0].product_name;
    
    // 根据状态生成不同的通知内容
    const statusMessages: Record<string, string> = {
      'production': '已开始生产',
      'shipped': '已发货',
      'completed': '已完成'
    };

    const statusMessage = statusMessages[newStatus] || '状态已更新';

    return this.createNotification({
      userId: buyerUserId,
      type: 'status_updated',
      title: '订单状态更新',
      content: `您的订单"${productName}"${statusMessage}，请及时查看。`,
      relatedId: orderId,
      relatedType: 'order'
    });
  }

  /**
   * 创建消息通知
   */
  async createMessageNotification(
    recipientUserId: string, 
    senderUsername: string, 
    relatedId: string, 
    relatedType: 'inquiry' | 'order'
  ): Promise<Notification> {
    return this.createNotification({
      userId: recipientUserId,
      type: 'message_received',
      title: '收到新消息',
      content: `${senderUsername} 给您发送了一条新消息，请及时查看。`,
      relatedId,
      relatedType
    });
  }

  /**
   * 获取用户未读通知
   */
  async getUnreadNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return this.notificationModel.findUnreadByUserId(userId, limit);
  }

  /**
   * 根据类型和相关ID查找通知
   */
  async getNotificationsByRelated(relatedId: string, relatedType: 'inquiry' | 'order', type?: NotificationType): Promise<Notification[]> {
    return this.notificationModel.findByRelated(relatedId, relatedType, type);
  }

  /**
   * 标记特定类型的通知为已读
   */
  async markTypeAsRead(userId: string, type: NotificationType, relatedId?: string): Promise<number> {
    const count = await this.notificationModel.markTypeAsRead(userId, type, relatedId);
    
    if (count > 0) {
      this.emit('type_notifications_read', { userId, type, relatedId, count });
    }
    
    return count;
  }

  /**
   * 获取通知统计信息
   */
  async getNotificationStatistics(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
  }> {
    return this.notificationModel.getStatistics(userId);
  }

  /**
   * 获取通知历史记录（分页）
   */
  async getNotificationHistory(
    userId: string, 
    options: {
      limit?: number;
      offset?: number;
      type?: NotificationType;
      isRead?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    const { limit = 20, offset = 0, type, isRead, startDate, endDate } = options;

    // Build query conditions
    let whereConditions = ['user_id = $1'];
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (isRead !== undefined) {
      whereConditions.push(`is_read = $${paramIndex}`);
      queryParams.push(isRead);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM notifications WHERE ${whereClause}`;
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get notifications with pagination
    const dataQuery = `
      SELECT * FROM notifications 
      WHERE ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const dataResult = await this.db.query(dataQuery, queryParams);
    const notifications = dataResult.rows.map(row => this.mapRowToNotification(row));

    return {
      notifications,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * 获取最近的通知（用于实时显示）
   */
  async getRecentNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
    return this.notificationModel.findByUserId(userId, limit, 0);
  }

  /**
   * 批量标记通知为已读（按时间范围）
   */
  async markNotificationsAsReadByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    const query = `
      UPDATE notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false 
      AND created_at >= $2 AND created_at <= $3
    `;

    const result = await this.db.query(query, [userId, startDate, endDate]);
    const count = result.rowCount || 0;

    if (count > 0) {
      this.emit('notifications_marked_read_by_date', { userId, startDate, endDate, count });
    }

    return count;
  }

  /**
   * 获取用户通知偏好设置（扩展功能）
   */
  async getUserNotificationPreferences(userId: string): Promise<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notificationTypes: NotificationType[];
  }> {
    // 这里可以从用户偏好表中获取设置
    // 目前返回默认设置
    return {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      notificationTypes: ['quotation_received', 'order_confirmed', 'status_updated', 'message_received']
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

  /**
   * 批量创建通知
   */
  async createBulkNotifications(notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    const results: Notification[] = [];
    
    for (const notificationData of notifications) {
      const notification = await this.createNotification(notificationData);
      results.push(notification);
    }
    
    this.emit('bulk_notifications_created', { count: results.length, notifications: results });
    
    return results;
  }

  /**
   * 设置通知事件监听器
   */
  setupEventListeners(): void {
    // 监听通知创建事件，实时推送给用户
    this.on('notification_created', async (notification: Notification) => {
      console.log(`通知已创建: ${notification.type} for user ${notification.userId}`);
      
      // 通过 Socket.IO 实时推送给用户
      if ((global as any).socketService) {
        (global as any).socketService.sendNotificationToUser(notification.userId, notification);
        
        // 同时更新用户的未读通知数量
        const unreadCount = await this.getUnreadCount(notification.userId);
        (global as any).socketService.sendUnreadCountUpdate(notification.userId, unreadCount);
      }
    });

    this.on('notification_read', async ({ notificationId, userId }) => {
      console.log(`通知已读: ${notificationId} by user ${userId}`);
      
      // 实时更新通知状态
      if ((global as any).socketService) {
        (global as any).socketService.sendNotificationUpdate(userId, {
          notificationId,
          isRead: true,
          action: 'read'
        });
        
        // 更新未读通知数量
        const unreadCount = await this.getUnreadCount(userId);
        (global as any).socketService.sendUnreadCountUpdate(userId, unreadCount);
      }
    });

    this.on('all_notifications_read', async ({ userId, count }) => {
      console.log(`用户 ${userId} 标记了 ${count} 条通知为已读`);
      
      // 实时更新未读通知数量
      if ((global as any).socketService) {
        const unreadCount = await this.getUnreadCount(userId);
        (global as any).socketService.sendUnreadCountUpdate(userId, unreadCount);
      }
    });

    this.on('notification_deleted', async ({ notificationId, userId }) => {
      console.log(`通知已删除: ${notificationId} by user ${userId}`);
      
      // 实时更新通知状态
      if ((global as any).socketService) {
        (global as any).socketService.sendNotificationUpdate(userId, {
          notificationId,
          action: 'deleted'
        });
        
        // 更新未读通知数量
        const unreadCount = await this.getUnreadCount(userId);
        (global as any).socketService.sendUnreadCountUpdate(userId, unreadCount);
      }
    });

    this.on('type_notifications_read', async ({ userId, type, relatedId, count }: { userId: string; type: string; relatedId?: string; count: number }) => {
      console.log(`用户 ${userId} 标记了 ${count} 条 ${type} 类型的通知为已读`);
      
      // 更新未读通知数量
      if ((global as any).socketService) {
        const unreadCount = await this.getUnreadCount(userId);
        (global as any).socketService.sendUnreadCountUpdate(userId, unreadCount);
      }
    });

    this.on('bulk_notifications_created', async ({ count, notifications }: { count: number; notifications: Notification[] }) => {
      console.log(`批量创建了 ${count} 条通知`);
      
      // 为每个用户更新未读通知数量
      if ((global as any).socketService) {
        const userIds = [...new Set(notifications.map((n: Notification) => n.userId))];
        for (const userId of userIds) {
          const unreadCount = await this.getUnreadCount(userId);
          (global as any).socketService.sendUnreadCountUpdate(userId, unreadCount);
        }
      }
    });

    this.on('notifications_cleaned', ({ count, daysOld }: { count: number; daysOld: number }) => {
      console.log(`清理了 ${count} 条超过 ${daysOld} 天的通知`);
    });
  }
}