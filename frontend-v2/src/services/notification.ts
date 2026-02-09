import api from './api';
import type { ApiResponse } from '@/types';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  relatedId: string | null;
  relatedType: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
}

export async function getNotifications(
  params: { page?: number; pageSize?: number; isRead?: string } = {}
): Promise<NotificationListResponse> {
  const res = await api.get<ApiResponse<NotificationListResponse>>(
    '/notifications',
    { params }
  );
  return res.data.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<ApiResponse<{ count: number }>>(
    '/notifications/unread-count'
  );
  return res.data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put('/notifications/read', { id });
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/notifications/read', { all: true });
}
