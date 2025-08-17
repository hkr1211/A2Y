import axios from './api';
import type { ChatMessage, CreateChatMessageRequest, ChatListParams, TranslationRequest, TranslationResponse } from '@/types/chat';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export class ChatService {
  /**
   * Get chat messages for a specific inquiry or order
   */
  static async getChatMessages(params: ChatListParams): Promise<PaginatedResponse<ChatMessage>> {
    const response = await axios.get<ApiResponse<PaginatedResponse<ChatMessage>>>('/api/chat/messages', {
      params,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch chat messages');
    }

    return response.data.data;
  }

  /**
   * Send a new chat message
   */
  static async sendMessage(messageData: CreateChatMessageRequest): Promise<ChatMessage> {
    const response = await axios.post<ApiResponse<ChatMessage>>('/api/chat/messages', messageData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to send message');
    }

    return response.data.data;
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(relatedId: string, relatedType: 'inquiry' | 'order'): Promise<void> {
    const response = await axios.post<ApiResponse<void>>('/api/chat/messages/mark-read', {
      relatedId,
      relatedType,
    });

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to mark messages as read');
    }
  }

  /**
   * Translate a message
   */
  static async translateMessage(translationData: TranslationRequest): Promise<TranslationResponse> {
    const response = await axios.post<ApiResponse<TranslationResponse>>('/api/chat/translate', translationData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to translate message');
    }

    return response.data.data;
  }

  /**
   * Batch translate messages
   */
  static async batchTranslateMessages(
    relatedId: string,
    relatedType: 'inquiry' | 'order',
    targetLanguage: 'zh' | 'ja'
  ): Promise<{ translatedCount: number; totalMessages: number }> {
    const response = await axios.post<ApiResponse<{ translatedCount: number; totalMessages: number }>>(
      '/api/chat/batch-translate',
      {
        relatedId,
        relatedType,
        targetLanguage,
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to batch translate messages');
    }

    return response.data.data;
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: string): Promise<void> {
    const response = await axios.delete<ApiResponse<void>>(`/api/chat/messages/${messageId}`);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete message');
    }
  }

  /**
   * Get chat room info
   */
  static async getChatRoomInfo(relatedId: string, relatedType: 'inquiry' | 'order'): Promise<any> {
    const response = await axios.get<ApiResponse<any>>(`/api/chat/room/${relatedType}/${relatedId}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get chat room info');
    }

    return response.data.data;
  }
}