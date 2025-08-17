import { Response } from 'express';
import { ChatMessageModel } from '../models/ChatMessage';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreateChatMessageRequest, UpdateChatMessageRequest } from '../types/chat';
import { pool } from '../config/database';
import { notifyNewMessage } from '../utils/socketUtils';
import { TranslationService } from '../services/TranslationService';

export class ChatController {
  private static chatMessageModel = new ChatMessageModel(pool);

  // 发送消息
  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { relatedId, relatedType, content } = req.body as CreateChatMessageRequest;
      const senderId = req.user!.userId;

      // 验证必填字段
      if (!relatedId || !relatedType || !content) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必填字段'
          }
        });
        return;
      }

      // 验证 relatedType
      if (!['inquiry', 'order'].includes(relatedType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的关联类型'
          }
        });
        return;
      }

      // 验证内容长度
      if (content.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '消息内容不能为空'
          }
        });
        return;
      }

      if (content.length > 1000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '消息内容不能超过1000个字符'
          }
        });
        return;
      }

      const message = await ChatController.chatMessageModel.create({
        relatedId,
        relatedType,
        senderId,
        content: content.trim()
      });

      // Notify other users in real-time
      notifyNewMessage(relatedId, relatedType, message);

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '发送消息失败'
        }
      });
    }
  }

  // 获取聊天记录
  static async getChatMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { relatedId, relatedType } = req.params;

      // 验证参数
      if (!relatedId || !relatedType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必填参数'
          }
        });
        return;
      }

      if (!['inquiry', 'order'].includes(relatedType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的关联类型'
          }
        });
        return;
      }

      const messages = await ChatController.chatMessageModel.findByRelated(relatedId, relatedType as 'inquiry' | 'order');

      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取聊天记录失败'
        }
      });
    }
  }

  // 更新消息
  static async updateMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const updateData = req.body as UpdateChatMessageRequest;
      const userId = req.user!.userId;

      if (!messageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少消息ID'
          }
        });
        return;
      }

      // 检查消息是否存在
      const existingMessage = await ChatController.chatMessageModel.findById(messageId);
      if (!existingMessage) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '消息不存在'
          }
        });
        return;
      }

      // 验证权限：只有消息发送者可以修改消息内容
      if (updateData.content !== undefined && existingMessage.senderId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: '只能修改自己发送的消息'
          }
        });
        return;
      }

      // 验证内容
      if (updateData.content !== undefined) {
        if (updateData.content.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '消息内容不能为空'
            }
          });
          return;
        }

        if (updateData.content.length > 1000) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '消息内容不能超过1000个字符'
            }
          });
          return;
        }

        updateData.content = updateData.content.trim();
      }

      const updatedMessage = await ChatController.chatMessageModel.update(messageId, updateData);

      res.json({
        success: true,
        data: updatedMessage
      });
    } catch (error) {
      console.error('Update message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新消息失败'
        }
      });
    }
  }

  // 标记消息为已读
  static async markMessagesAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { relatedId, relatedType } = req.params;
      const userId = req.user!.userId;

      if (!relatedId || !relatedType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必填参数'
          }
        });
        return;
      }

      if (!['inquiry', 'order'].includes(relatedType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的关联类型'
          }
        });
        return;
      }

      await ChatController.chatMessageModel.markAsRead(relatedId, relatedType as 'inquiry' | 'order', userId);

      res.json({
        success: true,
        message: '消息已标记为已读'
      });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '标记消息已读失败'
        }
      });
    }
  }

  // 获取未读消息数量
  static async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { relatedId, relatedType } = req.params;
      const userId = req.user!.userId;

      if (!relatedId || !relatedType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必填参数'
          }
        });
        return;
      }

      if (!['inquiry', 'order'].includes(relatedType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的关联类型'
          }
        });
        return;
      }

      const unreadCount = await ChatController.chatMessageModel.getUnreadCount(relatedId, relatedType as 'inquiry' | 'order', userId);

      res.json({
        success: true,
        data: {
          unreadCount
        }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取未读消息数量失败'
        }
      });
    }
  }

  // 翻译消息
  static async translateMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { targetLanguage } = req.body;

      if (!messageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少消息ID'
          }
        });
        return;
      }

      if (!targetLanguage || !['zh', 'ja'].includes(targetLanguage)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的目标语言'
          }
        });
        return;
      }

      // 获取消息
      const message = await ChatController.chatMessageModel.findById(messageId);
      if (!message) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '消息不存在'
          }
        });
        return;
      }

      // 检查是否已有翻译
      if (message.translatedContent) {
        res.json({
          success: true,
          data: {
            messageId,
            originalContent: message.content,
            translatedContent: message.translatedContent,
            targetLanguage,
            cached: true
          }
        });
        return;
      }

      // 执行翻译
      const translationService = new TranslationService();
      
      if (!translationService.isAvailable()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: '翻译服务暂不可用'
          }
        });
        return;
      }

      const sourceLanguage = translationService.detectLanguage(message.content);
      const translationResult = await translationService.translateText({
        text: message.content,
        from: sourceLanguage,
        to: targetLanguage
      });

      // 保存翻译结果
      await ChatController.chatMessageModel.update(messageId, {
        translatedContent: translationResult.translatedText
      });

      res.json({
        success: true,
        data: {
          messageId,
          originalContent: message.content,
          translatedContent: translationResult.translatedText,
          targetLanguage,
          provider: translationResult.provider,
          cached: false
        }
      });
    } catch (error) {
      console.error('Translate message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '翻译消息失败'
        }
      });
    }
  }

  // 批量翻译消息
  static async translateMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { relatedId, relatedType, targetLanguage } = req.body;

      if (!relatedId || !relatedType || !targetLanguage) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必填字段'
          }
        });
        return;
      }

      if (!['inquiry', 'order'].includes(relatedType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的关联类型'
          }
        });
        return;
      }

      if (!['zh', 'ja'].includes(targetLanguage)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的目标语言'
          }
        });
        return;
      }

      // 获取所有消息
      const messages = await ChatController.chatMessageModel.findByRelated(relatedId, relatedType as 'inquiry' | 'order');
      
      if (messages.length === 0) {
        res.json({
          success: true,
          data: {
            translatedCount: 0,
            messages: []
          }
        });
        return;
      }

      const translationService = new TranslationService();
      
      if (!translationService.isAvailable()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: '翻译服务暂不可用'
          }
        });
        return;
      }

      const translatedMessages = [];
      let translatedCount = 0;

      for (const message of messages) {
        try {
          // 跳过已翻译的消息
          if (message.translatedContent) {
            translatedMessages.push({
              messageId: message.id,
              originalContent: message.content,
              translatedContent: message.translatedContent,
              cached: true
            });
            continue;
          }

          const sourceLanguage = translationService.detectLanguage(message.content);
          
          // 如果源语言和目标语言相同，跳过翻译
          if (sourceLanguage === targetLanguage) {
            translatedMessages.push({
              messageId: message.id,
              originalContent: message.content,
              translatedContent: message.content,
              cached: false
            });
            continue;
          }

          const translationResult = await translationService.translateText({
            text: message.content,
            from: sourceLanguage,
            to: targetLanguage
          });

          // 保存翻译结果
          await ChatController.chatMessageModel.update(message.id, {
            translatedContent: translationResult.translatedText
          });

          translatedMessages.push({
            messageId: message.id,
            originalContent: message.content,
            translatedContent: translationResult.translatedText,
            cached: false
          });

          translatedCount++;
        } catch (translationError) {
          console.error(`Failed to translate message ${message.id}:`, translationError);
          // 继续处理其他消息
          translatedMessages.push({
            messageId: message.id,
            originalContent: message.content,
            translatedContent: null,
            error: '翻译失败'
          });
        }
      }

      res.json({
        success: true,
        data: {
          translatedCount,
          totalMessages: messages.length,
          messages: translatedMessages
        }
      });
    } catch (error) {
      console.error('Translate messages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '批量翻译消息失败'
        }
      });
    }
  }

  // 删除消息（仅管理员）
  static async deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const user = req.user!;

      if (!messageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少消息ID'
          }
        });
        return;
      }

      // 检查权限：只有管理员或消息发送者可以删除消息
      const existingMessage = await ChatController.chatMessageModel.findById(messageId);
      if (!existingMessage) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '消息不存在'
          }
        });
        return;
      }

      if (user.role !== 'admin' && existingMessage.senderId !== user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: '权限不足'
          }
        });
        return;
      }

      const deleted = await ChatController.chatMessageModel.delete(messageId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '消息不存在'
          }
        });
        return;
      }

      res.json({
        success: true,
        message: '消息已删除'
      });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '删除消息失败'
        }
      });
    }
  }
}