import { Response } from 'express';
import { Pool } from 'pg';
import { NotificationController } from '../../controllers/NotificationController';
import { NotificationService } from '../../services/NotificationService';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock NotificationService
jest.mock('../../services/NotificationService');

describe('NotificationController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockDb: Pool;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockDb = {} as Pool;
    mockRequest = {
      db: mockDb,
      query: {},
      params: {},
      user: {
        userId: 'user-123',
        role: 'buyer',
        username: 'buyer1',
        iat: Date.now()
      }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock NotificationService constructor and methods
    mockNotificationService = {
      getUserNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      createNotification: jest.fn(),
      createQuotationNotification: jest.fn(),
      cleanupOldNotifications: jest.fn(),
      getNotificationHistory: jest.fn(),
      getNotificationStatistics: jest.fn(),
      getRecentNotifications: jest.fn(),
      markTypeAsRead: jest.fn(),
      markNotificationsAsReadByDateRange: jest.fn(),
      getUnreadNotifications: jest.fn()
    } as any;

    (NotificationService as jest.MockedClass<typeof NotificationService>).mockImplementation(() => mockNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserNotifications', () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        userId: 'user-123',
        type: 'quotation_received' as const,
        title: '收到新报价',
        content: '您的询单收到了新的报价',
        relatedId: 'inquiry-1',
        relatedType: 'inquiry' as const,
        isRead: false,
        createdAt: new Date('2024-01-01T00:00:00Z')
      },
      {
        id: 'notification-2',
        userId: 'user-123',
        type: 'order_confirmed' as const,
        title: '订单已确认',
        content: '您的订单已被供应商确认',
        relatedId: 'order-1',
        relatedType: 'order' as const,
        isRead: true,
        createdAt: new Date('2024-01-02T00:00:00Z')
      }
    ];

    it('应该成功获取用户通知', async () => {
      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications);

      await NotificationController.getUserNotifications(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user-123', 50, 0);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: 'notification-1',
            type: 'quotation_received',
            title: '收到新报价',
            content: '您的询单收到了新的报价',
            relatedId: 'inquiry-1',
            relatedType: 'inquiry',
            isRead: false,
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          {
            id: 'notification-2',
            type: 'order_confirmed',
            title: '订单已确认',
            content: '您的订单已被供应商确认',
            relatedId: 'order-1',
            relatedType: 'order',
            isRead: true,
            createdAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      });
    });

    it('应该支持分页参数', async () => {
      mockRequest.query = { limit: '10', offset: '20' };
      mockNotificationService.getUserNotifications.mockResolvedValue([]);

      await NotificationController.getUserNotifications(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user-123', 10, 20);
    });

    it('应该处理获取通知时的错误', async () => {
      mockNotificationService.getUserNotifications.mockRejectedValue(new Error('Database error'));

      await NotificationController.getUserNotifications(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取通知失败'
        }
      });
    });
  });

  describe('getUnreadCount', () => {
    it('应该成功获取未读通知数量', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(5);

      await NotificationController.getUnreadCount(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { count: 5 }
      });
    });

    it('应该处理获取未读数量时的错误', async () => {
      mockNotificationService.getUnreadCount.mockRejectedValue(new Error('Database error'));

      await NotificationController.getUnreadCount(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取未读通知数量失败'
        }
      });
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记通知为已读', async () => {
      mockRequest.params = { id: 'notification-123' };
      mockNotificationService.markAsRead.mockResolvedValue(true);

      await NotificationController.markAsRead(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notification-123', 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '通知已标记为已读'
      });
    });

    it('应该在通知不存在时返回404', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockNotificationService.markAsRead.mockResolvedValue(false);

      await NotificationController.markAsRead(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: '通知不存在或无权限操作'
        }
      });
    });

    it('应该处理标记通知时的错误', async () => {
      mockRequest.params = { id: 'notification-123' };
      mockNotificationService.markAsRead.mockRejectedValue(new Error('Database error'));

      await NotificationController.markAsRead(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '标记通知失败'
        }
      });
    });
  });

  describe('markAllAsRead', () => {
    it('应该成功标记所有通知为已读', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(3);

      await NotificationController.markAllAsRead(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { markedCount: 3 },
        message: '已标记 3 条通知为已读'
      });
    });

    it('应该处理标记所有通知时的错误', async () => {
      mockNotificationService.markAllAsRead.mockRejectedValue(new Error('Database error'));

      await NotificationController.markAllAsRead(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '标记所有通知失败'
        }
      });
    });
  });

  describe('deleteNotification', () => {
    it('应该成功删除通知', async () => {
      mockRequest.params = { id: 'notification-123' };
      mockNotificationService.deleteNotification.mockResolvedValue(true);

      await NotificationController.deleteNotification(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith('notification-123', 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '通知删除成功'
      });
    });

    it('应该在通知不存在时返回404', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockNotificationService.deleteNotification.mockResolvedValue(false);

      await NotificationController.deleteNotification(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: '通知不存在或无权限操作'
        }
      });
    });

    it('应该处理删除通知时的错误', async () => {
      mockRequest.params = { id: 'notification-123' };
      mockNotificationService.deleteNotification.mockRejectedValue(new Error('Database error'));

      await NotificationController.deleteNotification(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '删除通知失败'
        }
      });
    });
  });

  describe('Real-time notification functionality', () => {
    describe('getNotificationHistory', () => {
      const mockHistoryResult = {
        notifications: [
          {
            id: 'notification-1',
            userId: 'user-123',
            type: 'quotation_received' as const,
            title: '收到新报价',
            content: '您的询单收到了新的报价',
            relatedId: 'inquiry-1',
            relatedType: 'inquiry' as const,
            isRead: false,
            createdAt: new Date('2024-01-01T00:00:00Z')
          }
        ],
        total: 25,
        hasMore: true
      };

      it('应该成功获取通知历史记录', async () => {
        mockRequest.query = { limit: '10', offset: '0' };
        mockNotificationService.getNotificationHistory.mockResolvedValue(mockHistoryResult);

        await NotificationController.getNotificationHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockNotificationService.getNotificationHistory).toHaveBeenCalledWith('user-123', {
          limit: 10,
          offset: 0,
          type: undefined,
          isRead: undefined,
          startDate: undefined,
          endDate: undefined
        });

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: {
            notifications: expect.any(Array),
            total: 25,
            hasMore: true,
            pagination: {
              limit: 10,
              offset: 0,
              total: 25
            }
          }
        });
      });

      it('应该支持过滤参数', async () => {
        mockRequest.query = {
          type: 'quotation_received',
          isRead: 'false',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        };
        mockNotificationService.getNotificationHistory.mockResolvedValue(mockHistoryResult);

        await NotificationController.getNotificationHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockNotificationService.getNotificationHistory).toHaveBeenCalledWith('user-123', {
          limit: 20,
          offset: 0,
          type: 'quotation_received',
          isRead: false,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        });
      });
    });

    describe('getNotificationStatistics', () => {
      const mockStatistics = {
        total: 50,
        unread: 10,
        byType: {
          quotation_received: 20,
          order_confirmed: 15,
          status_updated: 10,
          message_received: 5
        }
      };

      it('应该成功获取通知统计信息', async () => {
        mockNotificationService.getNotificationStatistics.mockResolvedValue(mockStatistics);

        await NotificationController.getNotificationStatistics(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockNotificationService.getNotificationStatistics).toHaveBeenCalledWith('user-123');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockStatistics
        });
      });
    });

    describe('getRecentNotifications', () => {
      const mockRecentNotifications = [
        {
          id: 'notification-1',
          userId: 'user-123',
          type: 'quotation_received' as const,
          title: '收到新报价',
          content: '您的询单收到了新的报价',
          relatedId: 'inquiry-1',
          relatedType: 'inquiry' as const,
          isRead: false,
          createdAt: new Date('2024-01-01T00:00:00Z')
        }
      ];

      it('应该成功获取最近的通知', async () => {
        mockRequest.query = { limit: '5' };
        mockNotificationService.getRecentNotifications.mockResolvedValue(mockRecentNotifications);

        await NotificationController.getRecentNotifications(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockNotificationService.getRecentNotifications).toHaveBeenCalledWith('user-123', 5);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: expect.any(Array)
        });
      });
    });

    describe('markTypeAsRead', () => {
      it('应该成功标记特定类型的通知为已读', async () => {
        mockRequest.params = { type: 'quotation_received' };
        mockRequest.body = { relatedId: 'inquiry-123' };
        mockNotificationService.markTypeAsRead.mockResolvedValue(3);

        await NotificationController.markTypeAsRead(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockNotificationService.markTypeAsRead).toHaveBeenCalledWith('user-123', 'quotation_received', 'inquiry-123');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: { markedCount: 3 },
          message: '已标记 3 条 quotation_received 类型的通知为已读'
        });
      });
    });

    describe('markNotificationsByDateRange', () => {
      it('应该成功按时间范围批量标记通知为已读', async () => {
        mockRequest.body = {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        };
        mockNotificationService.markNotificationsAsReadByDateRange.mockResolvedValue(5);

        await NotificationController.markNotificationsByDateRange(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockNotificationService.markNotificationsAsReadByDateRange).toHaveBeenCalledWith(
          'user-123',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: { markedCount: 5 },
          message: '已标记 5 条通知为已读'
        });
      });

      it('应该在缺少日期参数时返回400错误', async () => {
        mockRequest.body = { startDate: '2024-01-01' }; // 缺少 endDate

        await NotificationController.markNotificationsByDateRange(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '开始时间和结束时间不能为空'
          }
        });
      });
    });

    describe('getUnreadNotifications', () => {
      const mockUnreadNotifications = [
        {
          id: 'notification-1',
          userId: 'user-123',
          type: 'quotation_received' as const,
          title: '收到新报价',
          content: '您的询单收到了新的报价',
          relatedId: 'inquiry-1',
          relatedType: 'inquiry' as const,
          isRead: false,
          createdAt: new Date('2024-01-01T00:00:00Z')
        }
      ];

      it('应该成功获取用户未读通知', async () => {
        mockRequest.query = { limit: '20' };
        mockNotificationService.getUnreadNotifications.mockResolvedValue(mockUnreadNotifications);

        await NotificationController.getUnreadNotifications(mockRequest as AuthenticatedRequest, mockResponse as Response);

        expect(mockNotificationService.getUnreadNotifications).toHaveBeenCalledWith('user-123', 20);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: expect.any(Array)
        });
      });
    });
  });
});