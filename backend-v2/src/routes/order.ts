import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createOrderSchema,
  orderActionSchema,
  orderListSchema,
  uuidParamSchema,
} from '../shared/validation.js';

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  router.use(authenticate);

  // List and detail - all authenticated users
  router.get('/', validate(orderListSchema), controller.list);
  router.get('/:id', validate(uuidParamSchema), controller.getById);

  // Create - buyer only
  router.post(
    '/',
    requireRole('buyer'),
    validate(createOrderSchema),
    controller.create
  );

  // Action - buyer or supplier depending on action
  router.put(
    '/:id/action',
    validate(orderActionSchema),
    controller.action
  );

  return router;
}
