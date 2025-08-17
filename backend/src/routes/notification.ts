import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有通知路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/notifications
 * @desc 获取用户的所有通知
 * @access 认证用户
 */
router.get('/', NotificationController.getUserNotifications);

/**
 * @route GET /api/notifications/unread-count
 * @desc 获取用户未读通知数量
 * @access 认证用户
 */
router.get('/unread-count', NotificationController.getUnreadCount);

/**
 * @route POST /api/notifications/:id/read
 * @desc 标记通知为已读
 * @access 认证用户
 */
router.post('/:id/read', NotificationController.markAsRead);

/**
 * @route POST /api/notifications/read-all
 * @desc 标记所有通知为已读
 * @access 认证用户
 */
router.post('/read-all', NotificationController.markAllAsRead);

/**
 * @route DELETE /api/notifications/:id
 * @desc 删除通知
 * @access 认证用户
 */
router.delete('/:id', NotificationController.deleteNotification);

/**
 * @route GET /api/notifications/history
 * @desc 获取通知历史记录（分页）
 * @access 认证用户
 */
router.get('/history', NotificationController.getNotificationHistory);

/**
 * @route GET /api/notifications/statistics
 * @desc 获取通知统计信息
 * @access 认证用户
 */
router.get('/statistics', NotificationController.getNotificationStatistics);

/**
 * @route GET /api/notifications/recent
 * @desc 获取最近的通知
 * @access 认证用户
 */
router.get('/recent', NotificationController.getRecentNotifications);

/**
 * @route GET /api/notifications/unread
 * @desc 获取用户未读通知
 * @access 认证用户
 */
router.get('/unread', NotificationController.getUnreadNotifications);

/**
 * @route POST /api/notifications/type/:type/read
 * @desc 标记特定类型的通知为已读
 * @access 认证用户
 */
router.post('/type/:type/read', NotificationController.markTypeAsRead);

/**
 * @route POST /api/notifications/mark-by-date-range
 * @desc 批量标记通知为已读（按时间范围）
 * @access 认证用户
 */
router.post('/mark-by-date-range', NotificationController.markNotificationsByDateRange);

export default router;