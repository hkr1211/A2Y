import { Pool } from 'pg';
import { NotificationService } from '../../services/NotificationService';
import { CreateNotificationRequest } from '../../types/notification';

// Mock Pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService(mockPool);
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const validNotificationData: CreateNotificationRequest = {
      userId: 'user-123',
      type: 'quotation_received',
      title: '收到新报价',
      content: '您的询单收到了新的报价',
      relatedId: 'inquiry-123',
      relatedType: 'inquiry'
    };

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

    it('应该成功创建通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

      const result = await notificationService.createNotification(validNotificationData);

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

    it('应该发出通知创建事件', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

      const eventSpy = jest.spyOn(notificationService, 'emit');

      await notificationService.createNotification(validNotificationData);

      expect(eventSpy).toHaveBeenCalledWith('notification_created', expect.any(Object));
    });
  });

  describe('createQuotationNotification', () => {
    const mockInquiryRow = {
      product_name: '测试产品'
    };

    const mockNotificationRow = {
      id: 'notification-123',
      user_id: 'buyer-123',
      type: 'quotation_received',
      title: '收到新报价',
      content: '您的询单"测试产品"收到了新的报价，请及时查看。',
      related_id: 'inquiry-123',
      related_type: 'inquiry',
      is_read: false,
      created_at: '2024-01-01T00:00:00Z'
    };

    it('应该成功创建报价通知', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiryRow] }) // 询单查询
        .mockResolvedValueOnce({ rows: [mockNotificationRow] }); // 通知创建

      const result = await notificationService.createQuotationNotification(
        'quotation-123',
        'inquiry-123',
        'buyer-123'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT product_name FROM inquiries WHERE id = $1',
        ['inquiry-123']
      );

      expect(result.content).toContain('测试产品');
      expect(result.type).toBe('quotation_received');
    });

    it('应该在询单不存在时抛出错误', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        notificationService.createQuotationNotification(
          'quotation-123',
          'non-existent',
          'buyer-123'
        )
      ).rejects.toThrow('询单不存在');
    });
  });

  describe('getUserNotifications', () => {
    const mockNotificationRows = [
      {
        id: 'notification-1',
        user_id: 'user-123',
        type: 'quotation_received',
        title: '收到新报价',
        content: '您的询单收到了新的报价',
        related_id: 'inquiry-1',
        related_type: 'inquiry',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'notification-2',
        user_id: 'user-123',
        type: 'order_confirmed',
        title: '订单已确认',
        content: '您的订单已被供应商确认',
        related_id: 'order-1',
        related_type: 'order',
        is_read: true,
        created_at: '2024-01-02T00:00:00Z'
      }
    ];

    it('应该获取用户的所有通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockNotificationRows });

      const result = await notificationService.getUserNotifications('user-123', 50, 0);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notifications'),
        ['user-123', 50, 0]
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notification-1');
      expect(result[1].id).toBe('notification-2');
    });

    it('应该支持分页参数', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await notificationService.getUserNotifications('user-123', 10, 20);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['user-123', 10, 20]
      );
    });
  });

  describe('getUnreadCount', () => {
    it('应该返回用户未读通知数量', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await notificationService.getUnreadCount('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
        ['user-123']
      );

      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记通知为已读', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await notificationService.markAsRead('notification-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['notification-123', 'user-123']
      );

      expect(result).toBe(true);
    });

    it('应该在通知不存在时返回false', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await notificationService.markAsRead('non-existent', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('应该标记所有未读通知为已读', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 3 });

      const result = await notificationService.markAllAsRead('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['user-123']
      );

      expect(result).toBe(3);
    });
  });

  describe('deleteNotification', () => {
    it('应该成功删除通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await notificationService.deleteNotification('notification-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        ['notification-123', 'user-123']
      );

      expect(result).toBe(true);
    });

    it('应该在通知不存在时返回false', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await notificationService.deleteNotification('non-existent', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('cleanupOldNotifications', () => {
    it('应该清理过期的已读通知', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 10 });

      const result = await notificationService.cleanupOldNotifications();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications')
      );

      expect(result).toBe(10);
    });
  });

  describe('Real-time notification functionality', () => {
    // Mock global socketService
    const mockSocketService = {
      sendNotificationToUser: jest.fn(),
      sendUnreadCountUpdate: jest.fn(),
      sendNotificationUpdate: jest.fn(),
    };

    beforeEach(() => {
      (global as any).socketService = mockSocketService;
      jest.clearAllMocks();
    });

    describe('getNotificationHistory', () => {
      it('应该获取通知历史记录', async () => {
        const mockCountResult = { rows: [{ count: '25' }] };
        const mockDataResult = {
          rows: [
            {
              id: 'notification-1',
              user_id: 'user-123',
              type: 'quotation_received',
              title: '收到新报价',
              content: '您的询单收到了新的报价',
              related_id: 'inquiry-1',
              related_type: 'inquiry',
              is_read: false,
              created_at: '2024-01-01T00:00:00Z'
            }
          ]
        };

        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(mockCountResult)
          .mockResolvedValueOnce(mockDataResult);

        const result = await notificationService.getNotificationHistory('user-123', {
          limit: 10,
          offset: 0
        });

        expect(result.total).toBe(25);
        expect(result.notifications).toHaveLength(1);
        expect(result.hasMore).toBe(true);
      });

      it('应该支持按类型过滤', async () => {
        const mockCountResult = { rows: [{ count: '5' }] };
        const mockDataResult = { rows: [] };

        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(mockCountResult)
          .mockResolvedValueOnce(mockDataResult);

        await notificationService.getNotificationHistory('user-123', {
          type: 'quotation_received',
          isRead: false
        });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('type = 2'),
          expect.arrayContaining(['user-123', 'quotation_received', false])
        );
      });
    });

    describe('getNotificationStatistics', () => {
      it('应该获取通知统计信息', async () => {
        const mockCountResult = { rows: [{ total: '50', unread: '10' }] };
        const mockTypeResult = {
          rows: [
            { type: 'quotation_received', count: '20' },
            { type: 'order_confirmed', count: '15' },
            { type: 'status_updated', count: '10' },
            { type: 'message_received', count: '5' }
          ]
        };

        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce(mockCountResult)
          .mockResolvedValueOnce(mockTypeResult);

        const result = await notificationService.getNotificationStatistics('user-123');

        expect(result.total).toBe(50);
        expect(result.unread).toBe(10);
        expect(result.byType.quotation_received).toBe(20);
        expect(result.byType.order_confirmed).toBe(15);
      });
    });

    describe('markNotificationsAsReadByDateRange', () => {
      it('应该按时间范围批量标记通知为已读', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 5 });

        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const result = await notificationService.markNotificationsAsReadByDateRange(
          'user-123',
          startDate,
          endDate
        );

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE notifications'),
          ['user-123', startDate, endDate]
        );

        expect(result).toBe(5);
      });
    });

    describe('createBulkNotifications', () => {
      it('应该批量创建通知', async () => {
        const notifications = [
          {
            userId: 'user-1',
            type: 'quotation_received' as const,
            title: '收到新报价',
            content: '您的询单收到了新的报价',
            relatedId: 'inquiry-1',
            relatedType: 'inquiry' as const
          },
          {
            userId: 'user-2',
            type: 'order_confirmed' as const,
            title: '订单已确认',
            content: '您的订单已被供应商确认',
            relatedId: 'order-1',
            relatedType: 'order' as const
          }
        ];

        const mockNotificationRow = {
          id: 'notification-123',
          user_id: 'user-1',
          type: 'quotation_received',
          title: '收到新报价',
          content: '您的询单收到了新的报价',
          related_id: 'inquiry-1',
          related_type: 'inquiry',
          is_read: false,
          created_at: '2024-01-01T00:00:00Z'
        };

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

        const eventSpy = jest.spyOn(notificationService, 'emit');

        const result = await notificationService.createBulkNotifications(notifications);

        expect(result).toHaveLength(2);
        expect(eventSpy).toHaveBeenCalledWith('bulk_notifications_created', expect.any(Object));
      });
    });

    describe('Event listeners and real-time functionality', () => {
      it('应该设置事件监听器', () => {
        const setupSpy = jest.spyOn(notificationService, 'setupEventListeners');
        notificationService.setupEventListeners();
        expect(setupSpy).toHaveBeenCalled();
      });

      it('应该在通知创建时发送实时推送', async () => {
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

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockNotificationRow] });

        // Setup event listeners
        notificationService.setupEventListeners();

        // Create notification
        await notificationService.createNotification({
          userId: 'user-123',
          type: 'quotation_received',
          title: '收到新报价',
          content: '您的询单收到了新的报价',
          relatedId: 'inquiry-123',
          relatedType: 'inquiry'
        });

        // Wait for event to be processed
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSocketService.sendNotificationToUser).toHaveBeenCalledWith(
          'user-123',
          expect.any(Object)
        );
      });

      it('应该在标记已读时更新未读数量', async () => {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({ rowCount: 1 }) // markAsRead
          .mockResolvedValueOnce({ rows: [{ count: '4' }] }); // getUnreadCount

        // Setup event listeners
        notificationService.setupEventListeners();

        await notificationService.markAsRead('notification-123', 'user-123');

        // Wait for event to be processed
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSocketService.sendUnreadCountUpdate).toHaveBeenCalledWith('user-123', 4);
      });
    });

    describe('getRecentNotifications', () => {
      it('应该获取最近的通知', async () => {
        const mockNotificationRows = [
          {
            id: 'notification-1',
            user_id: 'user-123',
            type: 'quotation_received',
            title: '收到新报价',
            content: '您的询单收到了新的报价',
            related_id: 'inquiry-1',
            related_type: 'inquiry',
            is_read: false,
            created_at: '2024-01-01T00:00:00Z'
          }
        ];

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockNotificationRows });

        const result = await notificationService.getRecentNotifications('user-123', 5);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM notifications'),
          ['user-123', 5, 0]
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('notification-1');
      });
    });

    describe('markTypeAsRead', () => {
      it('应该标记特定类型的通知为已读', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 3 });

        const eventSpy = jest.spyOn(notificationService, 'emit');

        const result = await notificationService.markTypeAsRead(
          'user-123',
          'quotation_received',
          'inquiry-123'
        );

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE notifications'),
          ['user-123', 'quotation_received', 'inquiry-123']
        );

        expect(result).toBe(3);
        expect(eventSpy).toHaveBeenCalledWith('type_notifications_read', expect.any(Object));
      });
    });
  });
});