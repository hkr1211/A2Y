import { Router } from 'express';
import { AuditLogController } from '../controllers/AuditLogController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { auditLogListSchema } from '../shared/validation.js';

export function createAuditLogRoutes(
  controller: AuditLogController
): Router {
  const router = Router();

  router.use(authenticate);
  router.use(requireRole('admin'));

  router.get('/', validate(auditLogListSchema), controller.list);

  return router;
}
