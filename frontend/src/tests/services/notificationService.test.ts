import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { NotificationService, type Notification } from '@/services/notificationService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('NotificationService', () => {
  const mockNotification: Notification = {
    id: 'notification-1',
    userId: 'user-1',
    type: 'quotation_received',
    title: 'New Quotation Received',
    content: 'You have received a new quotation for inquiry INQ-001',
    relatedId: 'inquiry-1',
    relatedType: 'inquiry',
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserNotifications', () => {
    it('fetches user notifications successfully', async () => {
      const mockResponse = {
        data: [mockNotification],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await NotificationService.getUserNotifications({
        page: 1,
        limit: 10,
        type: 'quotation_received',
        isRead: false,
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/notifications/user', {
        params: {
          page: 1,
          limit: 10,
          type: 'quotation_received',
          isRead: false,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('fetches user notifications without parameters', async () => {
      const mockResponse = {
        data: [mockNotification],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await NotificationService.getUserNotifications();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/notifications/user', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error when fetch fails', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Fetch failed' },
        },
      });

      await expect(NotificationService.getUserNotifications())
        .rejects.toThrow('Fetch failed');
    });

    it('throws default error when no error message provided', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
        },
      });

      await expect(NotificationService.getUserNotifications())
        .rejects.toThrow('Failed to fetch notifications');
    });
  });

  describe('getUnreadCount', () => {
    it('fetches unread count successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: { count: 5 },
        },
      });

      const result = await NotificationService.getUnreadCount();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/notifications/unread-count');
      expect(result).toBe(5);
    });

    it('throws error when fetch fails', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Count fetch failed' },
        },
      });

      await expect(NotificationService.getUnreadCount())
        .rejects.toThrow('Count fetch failed');
    });

    it('throws default error when no error message provided', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
        },
      });

      await expect(NotificationService.getUnreadCount())
        .rejects.toThrow('Failed to fetch unread count');
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await NotificationService.markAsRead('notification-1');

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/notifications/notification-1/read');
    });

    it('throws error when mark as read fails', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Mark read failed' },
        },
      });

      await expect(NotificationService.markAsRead('notification-1'))
        .rejects.toThrow('Mark read failed');
    });

    it('throws default error when no error message provided', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
        },
      });

      await expect(NotificationService.markAsRead('notification-1'))
        .rejects.toThrow('Failed to mark notification as read');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await NotificationService.markAllAsRead();

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/notifications/mark-all-read');
    });

    it('throws error when mark all as read fails', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Mark all read failed' },
        },
      });

      await expect(NotificationService.markAllAsRead())
        .rejects.toThrow('Mark all read failed');
    });

    it('throws default error when no error message provided', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
        },
      });

      await expect(NotificationService.markAllAsRead())
        .rejects.toThrow('Failed to mark all notifications as read');
    });
  });

  describe('deleteNotification', () => {
    it('deletes notification successfully', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await NotificationService.deleteNotification('notification-1');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/notifications/notification-1');
    });

    it('throws error when delete fails', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Delete failed' },
        },
      });

      await expect(NotificationService.deleteNotification('notification-1'))
        .rejects.toThrow('Delete failed');
    });

    it('throws default error when no error message provided', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: {
          success: false,
        },
      });

      await expect(NotificationService.deleteNotification('notification-1'))
        .rejects.toThrow('Failed to delete notification');
    });
  });
});