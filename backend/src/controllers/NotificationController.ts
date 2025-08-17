import { Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';

export class NotificationController {
  /**
   * 获取用户的所有通知
   */
  static async getUserNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notificationService = new NotificationService(pool);
      const notifications = await notificationService.getUserNotifications(userId, limit, offset);

      res.status(200).json({
        success: true,
        data: notifications.map(notification => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          relatedId: notification.relatedId,
          relatedType: notification.relatedType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString()
        }))
      });
    } catch (error) {
      console.error('Get user notifications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取通知失败'
        }
      });
    }
  }

  /**
   * 获取用户未读通知数量
   */
  static async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const notificationService = new NotificationService(pool);
      const count = await notificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取未读通知数量失败'
        }
      });
    }
  }

  /**
   * 标记通知为已读
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const notificationService = new NotificationService(pool);
      const success = await notificationService.markAsRead(id, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: '通知不存在或无权限操作'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '通知已标记为已读'
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '标记通知失败'
        }
      });
    }
  }

  /**
   * 标记所有通知为已读
   */
  static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const notificationService = new NotificationService(pool);
      const count = await notificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        data: { markedCount: count },
        message: `已标记 ${count} 条通知为已读`
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '标记所有通知失败'
        }
      });
    }
  }

  /**
   * 删除通知
   */
  static async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const notificationService = new NotificationService(pool);
      const success = await notificationService.deleteNotification(id, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: '通知不存在或无权限操作'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '通知删除成功'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '删除通知失败'
        }
      });
    }
  }

  /**
   * 获取通知历史记录（分页）
   */
  static async getNotificationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const notificationService = new NotificationService(pool);
      const result = await notificationService.getNotificationHistory(userId, {
        limit,
        offset,
        type: type as any,
        isRead,
        startDate,
        endDate
      });

      res.status(200).json({
        success: true,
        data: {
          notifications: result.notifications.map(notification => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            relatedId: notification.relatedId,
            relatedType: notification.relatedType,
            isRead: notification.isRead,
            createdAt: notification.createdAt.toISOString()
          })),
          total: result.total,
          hasMore: result.hasMore,
          pagination: {
            limit,
            offset,
            total: result.total
          }
        }
      });
    } catch (error) {
      console.error('Get notification history error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取通知历史失败'
        }
      });
    }
  }

  /**
   * 获取通知统计信息
   */
  static async getNotificationStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const notificationService = new NotificationService(pool);
      const statistics = await notificationService.getNotificationStatistics(userId);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Get notification statistics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取通知统计失败'
        }
      });
    }
  }

  /**
   * 获取最近的通知（用于实时显示）
   */
  static async getRecentNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      const notificationService = new NotificationService(pool);
      const notifications = await notificationService.getRecentNotifications(userId, limit);

      res.status(200).json({
        success: true,
        data: notifications.map(notification => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          relatedId: notification.relatedId,
          relatedType: notification.relatedType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString()
        }))
      });
    } catch (error) {
      console.error('Get recent notifications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取最近通知失败'
        }
      });
    }
  }

  /**
   * 标记特定类型的通知为已读
   */
  static async markTypeAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { type } = req.params;
      const relatedId = req.body.relatedId;

      const notificationService = new NotificationService(pool);
      const count = await notificationService.markTypeAsRead(userId, type as any, relatedId);

      res.status(200).json({
        success: true,
        data: { markedCount: count },
        message: `已标记 ${count} 条 ${type} 类型的通知为已读`
      });
    } catch (error) {
      console.error('Mark type notifications as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '标记通知失败'
        }
      });
    }
  }

  /**
   * 批量标记通知为已读（按时间范围）
   */
  static async markNotificationsByDateRange(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '开始时间和结束时间不能为空'
          }
        });
        return;
      }

      const notificationService = new NotificationService(pool);
      const count = await notificationService.markNotificationsAsReadByDateRange(
        userId,
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        data: { markedCount: count },
        message: `已标记 ${count} 条通知为已读`
      });
    } catch (error) {
      console.error('Mark notifications by date range error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '批量标记通知失败'
        }
      });
    }
  }

  /**
   * 获取用户未读通知
   */
  static async getUnreadNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;

      const notificationService = new NotificationService(pool);
      const notifications = await notificationService.getUnreadNotifications(userId, limit);

      res.status(200).json({
        success: true,
        data: notifications.map(notification => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          relatedId: notification.relatedId,
          relatedType: notification.relatedType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString()
        }))
      });
    } catch (error) {
      console.error('Get unread notifications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取未读通知失败'
        }
      });
    }
  }
}