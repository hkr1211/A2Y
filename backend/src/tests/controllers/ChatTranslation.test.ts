import { Response } from 'express';
import { ChatController } from '../../controllers/ChatController';
import { ChatMessageModel } from '../../models/ChatMessage';
import { AuthenticatedRequest } from '../../middleware/auth';
import { TranslationService } from '../../services/TranslationService';

// Mock the dependencies
jest.mock('../../models/ChatMessage');
jest.mock('../../config/database');
jest.mock('../../services/TranslationService');

describe('ChatController Translation', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockChatMessageModel: jest.Mocked<ChatMessageModel>;
  let mockTranslationService: jest.Mocked<TranslationService>;

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

    // Create mock instances
    mockChatMessageModel = {
      findById: jest.fn(),
      update: jest.fn(),
      findByRelated: jest.fn()
    } as any;

    mockTranslationService = {
      isAvailable: jest.fn(),
      detectLanguage: jest.fn(),
      translateText: jest.fn()
    } as any;

    // Mock the static property
    (ChatController as any).chatMessageModel = mockChatMessageModel;

    // Mock TranslationService constructor
    (TranslationService as jest.MockedClass<typeof TranslationService>).mockImplementation(() => mockTranslationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('translateMessage', () => {
    it('should translate message successfully', async () => {
      const existingMessage = {
        id: 'message-123',
        content: 'Hello world',
        translatedContent: null,
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'user-123',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const translationResult = {
        originalText: 'Hello world',
        translatedText: '你好世界',
        fromLanguage: 'auto',
        toLanguage: 'zh',
        provider: 'mock'
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { targetLanguage: 'zh' };

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);
      mockTranslationService.isAvailable.mockReturnValue(true);
      mockTranslationService.detectLanguage.mockReturnValue('auto');
      mockTranslationService.translateText.mockResolvedValue(translationResult);
      mockChatMessageModel.update.mockResolvedValue({
        ...existingMessage,
        translatedContent: '你好世界'
      });

      await ChatController.translateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.findById).toHaveBeenCalledWith('message-123');
      expect(mockTranslationService.translateText).toHaveBeenCalledWith({
        text: 'Hello world',
        from: 'auto',
        to: 'zh'
      });
      expect(mockChatMessageModel.update).toHaveBeenCalledWith('message-123', {
        translatedContent: '你好世界'
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messageId: 'message-123',
          originalContent: 'Hello world',
          translatedContent: '你好世界',
          targetLanguage: 'zh',
          provider: 'mock',
          cached: false
        }
      });
    });

    it('should return cached translation if available', async () => {
      const existingMessage = {
        id: 'message-123',
        content: 'Hello world',
        translatedContent: '你好世界',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'user-123',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { targetLanguage: 'zh' };

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);

      await ChatController.translateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.findById).toHaveBeenCalledWith('message-123');
      expect(mockTranslationService.translateText).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messageId: 'message-123',
          originalContent: 'Hello world',
          translatedContent: '你好世界',
          targetLanguage: 'zh',
          cached: true
        }
      });
    });

    it('should return 400 for missing messageId', async () => {
      mockRequest.params = {};
      mockRequest.body = { targetLanguage: 'zh' };

      await ChatController.translateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少消息ID'
        }
      });
    });

    it('should return 400 for invalid target language', async () => {
      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { targetLanguage: 'invalid' };

      await ChatController.translateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的目标语言'
        }
      });
    });

    it('should return 404 for non-existent message', async () => {
      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { targetLanguage: 'zh' };

      mockChatMessageModel.findById.mockResolvedValue(null);

      await ChatController.translateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '消息不存在'
        }
      });
    });

    it('should return 503 when translation service is unavailable', async () => {
      const existingMessage = {
        id: 'message-123',
        content: 'Hello world',
        translatedContent: null,
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'user-123',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { targetLanguage: 'zh' };

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);
      mockTranslationService.isAvailable.mockReturnValue(false);

      await ChatController.translateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: '翻译服务暂不可用'
        }
      });
    });
  });

  describe('translateMessages', () => {
    it('should translate multiple messages successfully', async () => {
      const messages = [
        {
          id: 'message-1',
          content: 'Hello',
          translatedContent: null,
          relatedId: 'inquiry-123',
          relatedType: 'inquiry' as const,
          senderId: 'user-123',
          timestamp: new Date(),
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'message-2',
          content: 'World',
          translatedContent: null,
          relatedId: 'inquiry-123',
          relatedType: 'inquiry' as const,
          senderId: 'user-456',
          timestamp: new Date(),
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.body = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        targetLanguage: 'zh'
      };

      mockChatMessageModel.findByRelated.mockResolvedValue(messages);
      mockTranslationService.isAvailable.mockReturnValue(true);
      mockTranslationService.detectLanguage.mockReturnValue('auto');
      mockTranslationService.translateText
        .mockResolvedValueOnce({
          originalText: 'Hello',
          translatedText: '你好',
          fromLanguage: 'auto',
          toLanguage: 'zh',
          provider: 'mock'
        })
        .mockResolvedValueOnce({
          originalText: 'World',
          translatedText: '世界',
          fromLanguage: 'auto',
          toLanguage: 'zh',
          provider: 'mock'
        });

      mockChatMessageModel.update.mockResolvedValue({} as any);

      await ChatController.translateMessages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockChatMessageModel.findByRelated).toHaveBeenCalledWith('inquiry-123', 'inquiry');
      expect(mockTranslationService.translateText).toHaveBeenCalledTimes(2);
      expect(mockChatMessageModel.update).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          translatedCount: 2,
          totalMessages: 2,
          messages: [
            {
              messageId: 'message-1',
              originalContent: 'Hello',
              translatedContent: '你好',
              cached: false
            },
            {
              messageId: 'message-2',
              originalContent: 'World',
              translatedContent: '世界',
              cached: false
            }
          ]
        }
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        relatedId: 'inquiry-123'
        // missing relatedType and targetLanguage
      };

      await ChatController.translateMessages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段'
        }
      });
    });

    it('should handle empty message list', async () => {
      mockRequest.body = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        targetLanguage: 'zh'
      };

      mockChatMessageModel.findByRelated.mockResolvedValue([]);

      await ChatController.translateMessages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          translatedCount: 0,
          messages: []
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle translation errors gracefully', async () => {
      const existingMessage = {
        id: 'message-123',
        content: 'Hello world',
        translatedContent: null,
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        senderId: 'user-123',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { messageId: 'message-123' };
      mockRequest.body = { targetLanguage: 'zh' };

      mockChatMessageModel.findById.mockResolvedValue(existingMessage);
      mockTranslationService.isAvailable.mockReturnValue(true);
      mockTranslationService.detectLanguage.mockReturnValue('auto');
      mockTranslationService.translateText.mockRejectedValue(new Error('Translation failed'));

      await ChatController.translateMessage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '翻译消息失败'
        }
      });
    });
  });
});