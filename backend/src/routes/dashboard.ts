import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

/**
 * @route GET /api/dashboard
 * @desc Get dashboard data for current user
 * @access Private
 */
router.get('/', authenticateToken, DashboardController.getDashboardData);

/**
 * @route GET /api/dashboard/user-stats
 * @desc Get user statistics
 * @access Private (Admin only)
 */
router.get('/user-stats', authenticateToken, requireRole(['admin']), DashboardController.getUserStatistics);

/**
 * @route GET /api/dashboard/system-health
 * @desc Get system health status
 * @access Private (Admin only)
 */
router.get('/system-health', authenticateToken, requireRole(['admin']), DashboardController.getSystemHealth);

export default router;