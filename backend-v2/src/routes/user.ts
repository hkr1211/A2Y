import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  userIdParamSchema,
  userListSchema,
} from '../shared/validation.js';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  // All user routes require admin role
  router.use(authenticate, requireRole('admin'));

  router.get('/', validate(userListSchema), controller.list);
  router.post('/', validate(createUserSchema), controller.create);
  router.put('/:id', validate(updateUserSchema), controller.update);
  router.put(
    '/:id/reset-password',
    validate(resetPasswordSchema),
    controller.resetPassword
  );
  router.delete('/:id', validate(userIdParamSchema), controller.remove);

  return router;
}
