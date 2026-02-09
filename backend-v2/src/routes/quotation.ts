import { Router } from 'express';
import { QuotationController } from '../controllers/QuotationController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createQuotationSchema,
  withdrawQuotationSchema,
} from '../shared/validation.js';

export function createQuotationRoutes(
  controller: QuotationController
): Router {
  const router = Router();

  router.use(authenticate);

  // Create quotation - supplier only
  router.post(
    '/',
    requireRole('supplier'),
    validate(createQuotationSchema),
    controller.create
  );

  // Withdraw quotations for an inquiry - supplier only
  router.put(
    '/inquiry/:inquiryId/withdraw',
    requireRole('supplier'),
    validate(withdrawQuotationSchema),
    controller.withdraw
  );

  return router;
}
