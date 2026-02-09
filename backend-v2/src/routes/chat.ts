import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  chatMessagesSchema,
  sendMessageSchema,
  chatParamsSchema,
} from '../shared/validation.js';

export function createChatRoutes(controller: ChatController): Router {
  const router = Router();

  router.use(authenticate);

  // Get messages
  router.get(
    '/:relatedType/:relatedId/messages',
    validate(chatMessagesSchema),
    controller.getMessages
  );

  // Send message
  router.post(
    '/:relatedType/:relatedId/messages',
    validate(sendMessageSchema),
    controller.sendMessage
  );

  // Mark read
  router.put(
    '/:relatedType/:relatedId/read',
    validate(chatParamsSchema),
    controller.markRead
  );

  return router;
}
