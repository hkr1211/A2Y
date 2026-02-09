import { jest } from '@jest/globals';
import { NotificationService } from '../NotificationService.js';

const mockNotificationRepo = {
  create: jest.fn(),
  findByUser: jest.fn(),
  getUnreadCount: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
} as any;

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(mockNotificationRepo);
  });

  describe('list', () => {
    it('should return paginated notifications', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue({
        items: [
          {
            id: 'notif-1',
            user_id: 'user-1',
            type: 'quotation_new',
            title: '收到新报价',
            content: '询单 INQ-001 收到了新的报价',
            related_id: 'inq-1',
            related_type: 'inquiry',
            is_read: false,
            created_at: '2026-02-09T00:00:00.000Z',
          },
        ],
        total: 1,
      });

      const result = await service.list('user-1', { page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('quotation_new');
      expect(result.items[0].isRead).toBe(false);
      expect(result.total).toBe(1);
    });

    it('should filter by isRead', async () => {
      mockNotificationRepo.findByUser.mockResolvedValue({
        items: [],
        total: 0,
      });

      await service.list('user-1', { page: 1, pageSize: 20, isRead: false });
      expect(mockNotificationRepo.findByUser).toHaveBeenCalledWith('user-1', {
        page: 1,
        pageSize: 20,
        isRead: false,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationRepo.getUnreadCount.mockResolvedValue(3);

      const count = await service.getUnreadCount('user-1');
      expect(count).toBe(3);
    });
  });

  describe('markRead', () => {
    it('should mark single notification as read', async () => {
      mockNotificationRepo.markRead.mockResolvedValue(true);

      const result = await service.markRead('notif-1', 'user-1');
      expect(result.message).toBe('已标记已读');
      expect(mockNotificationRepo.markRead).toHaveBeenCalledWith(
        'notif-1',
        'user-1'
      );
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationRepo.markAllRead.mockResolvedValue(5);

      const result = await service.markAllRead('user-1');
      expect(result.message).toContain('5');
      expect(mockNotificationRepo.markAllRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('notify', () => {
    it('should create a notification', async () => {
      mockNotificationRepo.create.mockResolvedValue({
        id: 'notif-1',
        user_id: 'user-1',
        type: 'order_new',
        title: '收到新订单',
      });

      await service.notify({
        userId: 'user-1',
        type: 'order_new',
        title: '收到新订单',
        content: '新订单 ORD-001',
        relatedId: 'ord-1',
        relatedType: 'order',
      });

      expect(mockNotificationRepo.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        type: 'order_new',
        title: '收到新订单',
        content: '新订单 ORD-001',
        related_id: 'ord-1',
        related_type: 'order',
      });
    });

    it('should not throw if notification creation fails', async () => {
      mockNotificationRepo.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await service.notify({
        userId: 'user-1',
        type: 'order_new',
        title: '收到新订单',
      });
    });
  });
});
