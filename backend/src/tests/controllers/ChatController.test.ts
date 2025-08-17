import { Response } from 'express';
import { ChatController } from '../../controllers/ChatController';
import { ChatMessageModel } from '../../models/ChatMessage';
import { AuthenticatedRequest } from '../../middleware/auth';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the ChatMessageModel
jest.mock('../../models/ChatMessage');
jest.mock('../../config/database');

describe('ChatController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockChatMessageModel: jest.Mocked<ChatMessageModel>;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'user-123',
        username: 'testuser',
        role: 'buyer',
        iat: 123456789
      },
      body: {},
      params: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Create a mock instance
    mockChatMessageModel = {
      create: jest.fn(),
      findByRelated: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
      delete: jest.fn()
    } as any;

    // Mock the static property
    (ChatController as any).chatMessageModel = mockChatMessageModel;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        content: 'Hello, this is a test message'
      };

      const createdMessage = {
        id: 'message-123',
        ...messageData,
        senderId: 'user-123',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = messageData;
      mockChatMessageModel.create.mockResolvedValue(createdMessage);

      await ChatController.sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.create).toHaveBeenCalledWith({
        relatedId: messageData.relatedId,
        relatedType: messageData.relatedType,
        senderId: 'user-123',
        content: messageData.content
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdMessage
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        relatedId: 'inquiry-123',
        // missing relatedType and content
      };

      await ChatController.sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段'
        }
      });
    });

    it('should return 400 for invalid relatedType', async () => {
      mockRequest.body = {
        relatedId: 'inquiry-123',
        relatedType: 'invalid',
        content: 'Test message'
      };

      await ChatController.sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的关联类型'
        }
      });
    });

    it('should return 400 for empty content', async () => {
      mockRequest.body = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        content: '   '
      };

      await ChatController.sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '消息内容不能为空'
        }
      });
    });

    it('should return 400 for content too long', async () => {
      mockRequest.body = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        content: 'a'.repeat(1001)
      };

      await ChatController.sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '消息内容不能超过1000个字符'
        }
      });
    });
  });

  describe('getChatMessages', () => {
    it('should get chat messages successfully', async () => {
      const messages = [
        {
          id: 'message-1',
          relatedId: 'inquiry-123',
          relatedType: 'inquiry' as const,
          senderId: 'user-123',
          content: 'Message 1',
          timestamp: new Date(),
          isRead: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'message-2',
          relatedId: 'inquiry-123',
          relatedType: 'inquiry' as const,
          senderId: 'user-456',
          content: 'Message 2',
          timestamp: new Date(),
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.params = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry'
      };

      mockChatMessageModel.findByRelated.mockResolvedValue(messages);

      await ChatController.getChatMessages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.findByRelated).toHaveBeenCalledWith('inquiry-123', 'inquiry');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: messages
      });
    });

    it('should return 400 for missing parameters', async () => {
      mockRequest.params = {
        relatedId: 'inquiry-123'
        // missing relatedType
      };

      await ChatController.getChatMessages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填参数'
        }
      });
    });
  });

  describe('updateMessage', () => {
    it('should update message successfully', async () => {
      const existingMessage = {
        id: 'message-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'user-123',
        content: 'Original message',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedMessage = {
        ...existingMessage,
        content: 'Updated message'
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { content: 'Updated message' };

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);
      mockChatMessageModel.update.mockResolvedValue(updatedMessage);

      await ChatController.updateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.findById).toHaveBeenCalledWith('message-123');
      expect(mockChatMessageModel.update).toHaveBeenCalledWith('message-123', { content: 'Updated message' });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedMessage
      });
    });

    it('should return 404 for non-existent message', async () => {
      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { content: 'Updated message' };

      mockChatMessageModel.findById.mockResolvedValue(null);

      await ChatController.updateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '消息不存在'
        }
      });
    });

    it('should return 403 for unauthorized update', async () => {
      const existingMessage = {
        id: 'message-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'other-user',
        content: 'Original message',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { content: 'Updated message' };

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);

      await ChatController.updateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '只能修改自己发送的消息'
        }
      });
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read successfully', async () => {
      mockRequest.params = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry'
      };

      mockChatMessageModel.markAsRead.mockResolvedValue(undefined);

      await ChatController.markMessagesAsRead(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.markAsRead).toHaveBeenCalledWith('inquiry-123', 'inquiry', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '消息已标记为已读'
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      mockRequest.params = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry'
      };

      mockChatMessageModel.getUnreadCount.mockResolvedValue(5);

      await ChatController.getUnreadCount(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.getUnreadCount).toHaveBeenCalledWith('inquiry-123', 'inquiry', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          unreadCount: 5
        }
      });
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully as admin', async () => {
      const existingMessage = {
        id: 'message-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'other-user',
        content: 'Message to delete',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.user!.role = 'admin';

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);
      mockChatMessageModel.delete.mockResolvedValue(true);

      await ChatController.deleteMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.delete).toHaveBeenCalledWith('message-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '消息已删除'
      });
    });

    it('should delete message successfully as sender', async () => {
      const existingMessage = {
        id: 'message-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'user-123',
        content: 'Message to delete',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { messageId: 'message-123' };

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);
      mockChatMessageModel.delete.mockResolvedValue(true);

      await ChatController.deleteMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.delete).toHaveBeenCalledWith('message-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '消息已删除'
      });
    });

    it('should return 403 for unauthorized delete', async () => {
      const existingMessage = {
        id: 'message-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'other-user',
        content: 'Message to delete',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.user!.role = 'buyer';

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);

      await ChatController.deleteMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '权限不足'
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors in sendMessage', async () => {
      mockRequest.body = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        content: 'Test message'
      };

      mockChatMessageModel.create.mockRejectedValue(new Error('Database error'));

      await ChatController.sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '发送消息失败'
        }
      });
    });

    it('should handle database errors in getChatMessages', async () => {
      mockRequest.params = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry'
      };

      mockChatMessageModel.findByRelated.mockRejectedValue(new Error('Database error'));

      await ChatController.getChatMessages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取聊天记录失败'
        }
      });
    });
  });
});