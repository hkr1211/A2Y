import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// 所有聊天路由都需要认证
router.use(authenticateToken);

// 发送消息
router.post('/messages', 
  validateRequest({
    body: Joi.object({
      relatedId: Joi.string().uuid().required(),
      relatedType: Joi.string().valid('inquiry', 'order').required(),
      content: Joi.string().min(1).max(1000).required()
    })
  }),
  ChatController.sendMessage
);

// 获取聊天记录
router.get('/messages/:relatedType/:relatedId', 
  validateRequest({
    params: Joi.object({
      relatedType: Joi.string().valid('inquiry', 'order').required(),
      relatedId: Joi.string().uuid().required()
    })
  }),
  ChatController.getChatMessages
);

// 更新消息
router.put('/messages/:messageId', 
  validateRequest({
    params: Joi.object({
      messageId: Joi.string().uuid().required()
    }),
    body: Joi.object({
      content: Joi.string().min(1).max(1000).optional(),
      isRead: Joi.boolean().optional(),
      translatedContent: Joi.string().optional()
    })
  }),
  ChatController.updateMessage
);

// 标记消息为已读
router.post('/messages/:relatedType/:relatedId/read', 
  validateRequest({
    params: Joi.object({
      relatedType: Joi.string().valid('inquiry', 'order').required(),
      relatedId: Joi.string().uuid().required()
    })
  }),
  ChatController.markMessagesAsRead
);

// 获取未读消息数量
router.get('/messages/:relatedType/:relatedId/unread-count', 
  validateRequest({
    params: Joi.object({
      relatedType: Joi.string().valid('inquiry', 'order').required(),
      relatedId: Joi.string().uuid().required()
    })
  }),
  ChatController.getUnreadCount
);

// 删除消息（管理员或消息发送者）
router.delete('/messages/:messageId', 
  validateRequest({
    params: Joi.object({
      messageId: Joi.string().uuid().required()
    })
  }),
  ChatController.deleteMessage
);

// 翻译单个消息
router.post('/messages/:messageId/translate', 
  validateRequest({
    params: Joi.object({
      messageId: Joi.string().uuid().required()
    }),
    body: Joi.object({
      targetLanguage: Joi.string().valid('zh', 'ja').required()
    })
  }),
  ChatController.translateMessage
);

// 批量翻译消息
router.post('/translate', 
  validateRequest({
    body: Joi.object({
      relatedId: Joi.string().uuid().required(),
      relatedType: Joi.string().valid('inquiry', 'order').required(),
      targetLanguage: Joi.string().valid('zh', 'ja').required()
    })
  }),
  ChatController.translateMessages
);

export default router;