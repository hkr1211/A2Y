import { Router } from 'express';
import { InquiryController } from '../controllers/InquiryController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createInquirySchema,
  updateInquirySchema,
  inquiryActionSchema,
  inquiryListSchema,
  uuidParamSchema,
} from '../shared/validation.js';

export function createInquiryRoutes(controller: InquiryController): Router {
  const router = Router();

  // All inquiry routes require authentication
  router.use(authenticate);

  // List and detail - all authenticated users
  router.get('/', validate(inquiryListSchema), controller.list);
  router.get('/:id', validate(uuidParamSchema), controller.getById);

  // Create, update, action - buyer only
  router.post(
    '/',
    requireRole('buyer'),
    validate(createInquirySchema),
    controller.create
  );
  router.put(
    '/:id',
    requireRole('buyer'),
    validate(updateInquirySchema),
    controller.update
  );
  router.put(
    '/:id/action',
    requireRole('buyer'),
    validate(inquiryActionSchema),
    controller.action
  );

  return router;
}
