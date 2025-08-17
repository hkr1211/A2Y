import axios from 'axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface Notification {
  id: string;
  userId: string;
  type: 'quotation_received' | 'order_confirmed' | 'status_updated' | 'message_received';
  title: string;
  content: string;
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
}

export class NotificationService {
  private static readonly BASE_URL = '/api/notifications';

  /**
   * 获取用户通知列表
   */
  static async getUserNotifications(params?: NotificationListParams): Promise<PaginatedResponse<Notification>> {
    const response = await axios.get<ApiResponse<PaginatedResponse<Notification>>>(
      `${this.BASE_URL}/user`,
      { params }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch notifications');
    }

    return response.data.data;
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadCount(): Promise<number> {
    const response = await axios.get<ApiResponse<{ count: number }>>(
      `${this.BASE_URL}/unread-count`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch unread count');
    }

    return response.data.data.count;
  }

  /**
   * 标记通知为已读
   */
  static async markAsRead(id: string): Promise<void> {
    const response = await axios.post<ApiResponse<void>>(
      `${this.BASE_URL}/${id}/read`
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to mark notification as read');
    }
  }

  /**
   * 标记所有通知为已读
   */
  static async markAllAsRead(): Promise<void> {
    const response = await axios.post<ApiResponse<void>>(
      `${this.BASE_URL}/mark-all-read`
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to mark all notifications as read');
    }
  }

  /**
   * 删除通知
   */
  static async deleteNotification(id: string): Promise<void> {
    const response = await axios.delete<ApiResponse<void>>(
      `${this.BASE_URL}/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete notification');
    }
  }
}