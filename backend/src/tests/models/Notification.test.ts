import { Pool } from 'pg';
import { NotificationModel } from '../../models/Notification';
import { CreateNotificationRequest, NotificationType } from '../../types/notification';

// Mock Pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('NotificationModel', () => {
  let notificationModel: NotificationModel;

  beforeEach(() => {
    notificationModel = new NotificationModel(mockPool);
    jest.clearAllMocks();
  });

  const mockNotificationRow = {
    id: 'notification-123',
    user_id: 'user-123',
    type: 'quotation_received',
    title: '收到新报价',
    content: '您的询单收到了新的报价',
    related_id: 'inquiry-123',
    related_type: 'inquiry',
    is_read: false,
    created_at: '2024-01-01T00:00:00Z'
  };

  const validNotificationData: CreateNotificationRequest = {
    userId: 'user-123',
    type: 'quotation_received',
    title: '收到新报价',
    content: '您的询单收到了新的报价',
    relatedId: 'inquiry-123',
    relatedType: 'inquiry'
  };

  describe('create', () => {
    it('应该成功创建通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

      const result = await notificationModel.create(validNotificationData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          'user-123',
          'quotation_received',
          '收到新报价',
          '您的询单收到了新的报价',
          'inquiry-123',
          'inquiry'
        ]
      );

      expect(result).toEqual({
        id: 'notification-123',
        userId: 'user-123',
        type: 'quotation_received',
        title: '收到新报价',
        content: '您的询单收到了新的报价',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        isRead: false,
        createdAt: new Date('2024-01-01T00:00:00Z')
      });
    });
  });

  describe('findById', () => {
    it('应该根据ID找到通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

      const result = await notificationModel.findById('notification-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE id = $1',
        ['notification-123']
      );

      expect(result).toEqual({
        id: 'notification-123',
        userId: 'user-123',
        type: 'quotation_received',
        title: '收到新报价',
        content: '您的询单收到了新的报价',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        isRead: false,
        createdAt: new Date('2024-01-01T00:00:00Z')
      });
    });

    it('应该在通知不存在时返回null', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await notificationModel.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    const mockNotificationRows = [mockNotificationRow, { ...mockNotificationRow, id: 'notification-456' }];

    it('应该获取用户的所有通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockNotificationRows });

      const result = await notificationModel.findByUserId('user-123', 50, 0);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notifications'),
        ['user-123', 50, 0]
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notification-123');
      expect(result[1].id).toBe('notification-456');
    });

    it('应该支持分页参数', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await notificationModel.findByUserId('user-123', 10, 20);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['user-123', 10, 20]
      );
    });
  });

  describe('getUnreadCount', () => {
    it('应该返回用户未读通知数量', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await notificationModel.getUnreadCount('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
        ['user-123']
      );

      expect(result).toBe(5);
    });
  });

  describe('findUnreadByUserId', () => {
    it('应该获取用户的未读通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

      const result = await notificationModel.findUnreadByUserId('user-123', 50);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND is_read = false'),
        ['user-123', 50]
      );

      expect(result).toHaveLength(1);
      expect(result[0].isRead).toBe(false);
    });
  });

  describe('findByRelated', () => {
    it('应该根据相关ID和类型查找通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

      const result = await notificationModel.findByRelated('inquiry-123', 'inquiry');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE related_id = $1 AND related_type = $2'),
        ['inquiry-123', 'inquiry']
      );

      expect(result).toHaveLength(1);
      expect(result[0].relatedId).toBe('inquiry-123');
    });

    it('应该支持按通知类型过滤', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

      await notificationModel.findByRelated('inquiry-123', 'inquiry', 'quotation_received');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type = $3'),
        ['inquiry-123', 'inquiry', 'quotation_received']
      );
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记通知为已读', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await notificationModel.markAsRead('notification-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['notification-123', 'user-123']
      );

      expect(result).toBe(true);
    });

    it('应该在通知不存在时返回false', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await notificationModel.markAsRead('non-existent', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('应该标记所有未读通知为已读', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 3 });

      const result = await notificationModel.markAllAsRead('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['user-123']
      );

      expect(result).toBe(3);
    });
  });

  describe('markTypeAsRead', () => {
    it('应该标记特定类型的通知为已读', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 2 });

      const result = await notificationModel.markTypeAsRead('user-123', 'quotation_received');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND type = $2'),
        ['user-123', 'quotation_received']
      );

      expect(result).toBe(2);
    });

    it('应该支持按相关ID过滤', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await notificationModel.markTypeAsRead('user-123', 'quotation_received', 'inquiry-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND related_id = $3'),
        ['user-123', 'quotation_received', 'inquiry-123']
      );
    });
  });

  describe('delete', () => {
    it('应该成功删除通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await notificationModel.delete('notification-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        ['notification-123', 'user-123']
      );

      expect(result).toBe(true);
    });

    it('应该在通知不存在时返回false', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await notificationModel.delete('non-existent', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('deleteAllByUserId', () => {
    it('应该删除用户的所有通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 5 });

      const result = await notificationModel.deleteAllByUserId('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE user_id = $1',
        ['user-123']
      );

      expect(result).toBe(5);
    });
  });

  describe('deleteByType', () => {
    it('应该删除特定类型的通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 3 });

      const result = await notificationModel.deleteByType('user-123', 'quotation_received');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE user_id = $1 AND type = $2',
        ['user-123', 'quotation_received']
      );

      expect(result).toBe(3);
    });

    it('应该支持按相关ID过滤', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await notificationModel.deleteByType('user-123', 'quotation_received', 'inquiry-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE user_id = $1 AND type = $2 AND related_id = $3',
        ['user-123', 'quotation_received', 'inquiry-123']
      );
    });
  });

  describe('cleanupOldNotifications', () => {
    it('应该清理过期的已读通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 10 });

      const result = await notificationModel.cleanupOldNotifications(30);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications')
      );

      expect(result).toBe(10);
    });

    it('应该使用默认的30天清理期', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 5 });

      await notificationModel.cleanupOldNotifications();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'")
      );
    });
  });

  describe('getStatistics', () => {
    it('应该返回通知统计信息', async () => {
      const mockCountResult = { rows: [{ total: '10', unread: '3' }] };
      const mockTypeResult = {
        rows: [
          { type: 'quotation_received', count: '5' },
          { type: 'order_confirmed', count: '3' },
          { type: 'status_updated', count: '2' }
        ]
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockTypeResult);

      const result = await notificationModel.getStatistics('user-123');

      expect(result).toEqual({
        total: 10,
        unread: 3,
        byType: {
          quotation_received: 5,
          order_confirmed: 3,
          status_updated: 2,
          message_received: 0
        }
      });
    });
  });
});