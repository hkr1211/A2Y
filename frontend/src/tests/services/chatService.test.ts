import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '@/services/chatService';
import axios from '@/services/api';
import type { ChatMessage, CreateChatMessageRequest, ChatListParams, TranslationRequest } from '@/types/chat';

// Mock axios
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockMessage: ChatMessage = {
  id: '1',
  relatedId: 'inquiry-1',
  relatedType: 'inquiry',
  senderId: 'user1',
  senderUsername: 'Test User',
  content: 'Hello, this is a test message',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  isRead: false,
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
};

const mockMessages: ChatMessage[] = [mockMessage];

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAxios = axios as any;

  describe('getChatMessages', () => {
    it('fetches chat messages successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { data: mockMessages, total: 1 },
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const params: ChatListParams = {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
        page: 1,
        limit: 20,
      };

      const result = await ChatService.getChatMessages(params);

      expect(mockAxios.get).toHaveBeenCalledWith('/api/chat/messages', { params });
      expect(result).toEqual({ data: mockMessages, total: 1 });
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Failed to fetch messages' },
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const params: ChatListParams = {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      };

      await expect(ChatService.getChatMessages(params)).rejects.toThrow('Failed to fetch messages');
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: mockMessage,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const messageData: CreateChatMessageRequest = {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
        content: 'Hello, this is a test message',
      };

      const result = await ChatService.sendMessage(messageData);

      expect(mockAxios.post).toHaveBeenCalledWith('/api/chat/messages', messageData);
      expect(result).toEqual(mockMessage);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Failed to send message' },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const messageData: CreateChatMessageRequest = {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
        content: 'Hello, this is a test message',
      };

      await expect(ChatService.sendMessage(messageData)).rejects.toThrow('Failed to send message');
    });
  });

  describe('markMessagesAsRead', () => {
    it('marks messages as read successfully', async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await ChatService.markMessagesAsRead('inquiry-1', 'inquiry');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/chat/messages/mark-read', {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
      });
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Failed to mark messages as read' },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await expect(ChatService.markMessagesAsRead('inquiry-1', 'inquiry')).rejects.toThrow(
        'Failed to mark messages as read'
      );
    });
  });

  describe('translateMessage', () => {
    it('translates message successfully', async () => {
      const mockTranslation = {
        messageId: '1',
        originalContent: 'Hello, this is a test message',
        translatedContent: 'こんにちは、これはテストメッセージです',
        targetLanguage: 'ja' as const,
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockTranslation,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const translationData: TranslationRequest = {
        messageId: '1',
        targetLanguage: 'ja',
      };

      const result = await ChatService.translateMessage(translationData);

      expect(mockAxios.post).toHaveBeenCalledWith('/api/chat/translate', translationData);
      expect(result).toEqual(mockTranslation);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Translation failed' },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const translationData: TranslationRequest = {
        messageId: '1',
        targetLanguage: 'ja',
      };

      await expect(ChatService.translateMessage(translationData)).rejects.toThrow('Translation failed');
    });
  });

  describe('batchTranslateMessages', () => {
    it('batch translates messages successfully', async () => {
      const mockResult = {
        translatedCount: 5,
        totalMessages: 10,
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockResult,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await ChatService.batchTranslateMessages('inquiry-1', 'inquiry', 'ja');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/chat/batch-translate', {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
        targetLanguage: 'ja',
      });
      expect(result).toEqual(mockResult);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Batch translation failed' },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await expect(ChatService.batchTranslateMessages('inquiry-1', 'inquiry', 'ja')).rejects.toThrow(
        'Batch translation failed'
      );
    });
  });

  describe('deleteMessage', () => {
    it('deletes message successfully', async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxios.delete.mockResolvedValue(mockResponse);

      await ChatService.deleteMessage('1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/api/chat/messages/1');
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Failed to delete message' },
        },
      };
      mockAxios.delete.mockResolvedValue(mockResponse);

      await expect(ChatService.deleteMessage('1')).rejects.toThrow('Failed to delete message');
    });
  });

  describe('getChatRoomInfo', () => {
    it('gets chat room info successfully', async () => {
      const mockRoomInfo = {
        relatedId: 'inquiry-1',
        relatedType: 'inquiry',
        participants: ['user1', 'user2'],
        unreadCount: 3,
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockRoomInfo,
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await ChatService.getChatRoomInfo('inquiry-1', 'inquiry');

      expect(mockAxios.get).toHaveBeenCalledWith('/api/chat/room/inquiry/inquiry-1');
      expect(result).toEqual(mockRoomInfo);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Failed to get chat room info' },
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      await expect(ChatService.getChatRoomInfo('inquiry-1', 'inquiry')).rejects.toThrow(
        'Failed to get chat room info'
      );
    });
  });
});