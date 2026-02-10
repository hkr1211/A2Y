import { Router } from 'express';
import { TrashController } from '../controllers/TrashController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { trashListSchema, trashItemSchema } from '../shared/validation.js';

export function createTrashRoutes(controller: TrashController): Router {
  const router = Router();

  router.use(authenticate);
  router.use(requireRole('admin'));

  router.get('/', validate(trashListSchema), controller.list);
  router.put('/:type/:id/restore', validate(trashItemSchema), controller.restore);
  router.delete('/:type/:id', validate(trashItemSchema), controller.permanentDelete);

  return router;
}
