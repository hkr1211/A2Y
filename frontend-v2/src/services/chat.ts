import api from './api';
import type { ApiResponse } from '@/types';

export interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    role: string;
  };
  createdAt: string;
}

export interface ChatMessagesResponse {
  items: ChatMessage[];
  total: number;
}

export async function getChatMessages(
  relatedType: string,
  relatedId: string,
  params: { since?: string; page?: number; pageSize?: number } = {}
): Promise<ChatMessagesResponse> {
  const res = await api.get<ApiResponse<ChatMessagesResponse>>(
    `/chat/${relatedType}/${relatedId}/messages`,
    { params }
  );
  return res.data.data;
}

export async function sendChatMessage(
  relatedType: string,
  relatedId: string,
  content: string
): Promise<ChatMessage> {
  const res = await api.post<ApiResponse<ChatMessage>>(
    `/chat/${relatedType}/${relatedId}/messages`,
    { content }
  );
  return res.data.data;
}

export async function markChatRead(
  relatedType: string,
  relatedId: string
): Promise<void> {
  await api.put(`/chat/${relatedType}/${relatedId}/read`);
}
