import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  notificationListSchema,
  markNotificationReadSchema,
} from '../shared/validation.js';

export function createNotificationRoutes(
  controller: NotificationController
): Router {
  const router = Router();

  router.use(authenticate);

  // List notifications
  router.get('/', validate(notificationListSchema), controller.list);

  // Unread count
  router.get('/unread-count', controller.getUnreadCount);

  // Mark read
  router.put('/read', validate(markNotificationReadSchema), controller.markRead);

  return router;
}
