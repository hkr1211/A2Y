import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema } from '../shared/validation.js';

export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  router.post('/login', validate(loginSchema), controller.login);
  router.get('/me', authenticate, controller.getMe);
  router.put(
    '/password',
    authenticate,
    validate(changePasswordSchema),
    controller.changePassword
  );

  return router;
}
