import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticateToken, AuthController.logout);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh', authenticateToken, AuthController.refreshToken);

export default router;