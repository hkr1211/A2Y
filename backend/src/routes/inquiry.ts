import { Router } from 'express';
import { InquiryController } from '../controllers/InquiryController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// All inquiry routes require authentication
router.use(authenticateToken);

// GET /api/inquiries - Get all inquiries (admin sees all, users see their own)
router.get('/', InquiryController.getAllInquiries);

// GET /api/inquiries/:id - Get inquiry by ID
router.get('/:id', InquiryController.getInquiryById);

// POST /api/inquiries - Create new inquiry (buyers and admin only)
router.post('/', requireRole(['buyer', 'admin']), InquiryController.createInquiry);

// PUT /api/inquiries/:id - Update inquiry
router.put('/:id', InquiryController.updateInquiry);

// POST /api/inquiries/:id/cancel - Cancel inquiry
router.post('/:id/cancel', InquiryController.cancelInquiry);

// POST /api/inquiries/:id/publish - Publish inquiry
router.post('/:id/publish', InquiryController.publishInquiry);

// DELETE /api/inquiries/:id - Delete inquiry (admin only)
router.delete('/:id', requireRole(['admin']), InquiryController.deleteInquiry);

export default router;