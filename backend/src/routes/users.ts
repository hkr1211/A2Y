import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

/**
 * @route GET /api/users/languages
 * @desc Get supported languages and translations
 * @access Public
 */
router.get('/languages', UserController.getSupportedLanguages);

/**
 * @route GET /api/users/profile
 * @desc Get current user's profile
 * @access Private (Any authenticated user)
 */
router.get('/profile', authenticateToken, UserController.getCurrentUserProfile);

/**
 * @route PUT /api/users/language
 * @desc Update current user's language preference
 * @access Private (Any authenticated user)
 */
router.put('/language', authenticateToken, UserController.updateUserLanguage);

/**
 * @route GET /api/users
 * @desc Get all users
 * @access Private (Admin only)
 */
router.get('/', authenticateToken, requireRole(['admin']), UserController.getAllUsers);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private (Admin only)
 */
router.get('/:id', authenticateToken, requireRole(['admin']), UserController.getUserById);

/**
 * @route POST /api/users
 * @desc Create new user
 * @access Private (Admin only)
 */
router.post('/', authenticateToken, requireRole(['admin']), UserController.createUser);

/**
 * @route PUT /api/users/:id
 * @desc Update user
 * @access Private (Admin only)
 */
router.put('/:id', authenticateToken, requireRole(['admin']), UserController.updateUser);

/**
 * @route DELETE /api/users/:id
 * @desc Delete user
 * @access Private (Admin only)
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), UserController.deleteUser);

export default router;