import { Request, Response } from 'express';
import Joi from 'joi';
import { UserModel } from '../models/User';
import { I18nService } from '../services/I18nService';
import type { CreateUserRequest, UpdateUserRequest, Language } from '../types/user';
import type { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  /**
   * Validation schema for user creation
   */
  private static createUserSchema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 50 characters',
        'any.required': 'Username is required'
      }),
    password: Joi.string()
      .min(6)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 100 characters',
        'any.required': 'Password is required'
      }),
    role: Joi.string()
      .valid('admin', 'buyer', 'supplier')
      .required()
      .messages({
        'any.only': 'Role must be one of: admin, buyer, supplier',
        'any.required': 'Role is required'
      }),
    company: Joi.string()
      .valid('arroz', 'yunjie', 'admin')
      .required()
      .messages({
        'any.only': 'Company must be one of: arroz, yunjie, admin',
        'any.required': 'Company is required'
      }),
    language: Joi.string()
      .valid('zh', 'ja')
      .default('zh')
      .messages({
        'any.only': 'Language must be one of: zh, ja'
      })
  });

  /**
   * Validation schema for user update
   */
  private static updateUserSchema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 50 characters'
      }),
    password: Joi.string()
      .min(6)
      .max(100)
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 100 characters'
      }),
    role: Joi.string()
      .valid('admin', 'buyer', 'supplier')
      .messages({
        'any.only': 'Role must be one of: admin, buyer, supplier'
      }),
    company: Joi.string()
      .valid('arroz', 'yunjie', 'admin')
      .messages({
        'any.only': 'Company must be one of: arroz, yunjie, admin'
      }),
    language: Joi.string()
      .valid('zh', 'ja')
      .messages({
        'any.only': 'Language must be one of: zh, ja'
      })
  }).min(1); // At least one field must be provided for update

  /**
   * Get all users
   * @route GET /api/users
   * @access Private (Admin only)
   */
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserModel.findAll();

      res.status(200).json({
        success: true,
        data: {
          users,
          total: users.length
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching users'
        }
      });
    }
  }

  /**
   * Get user by ID
   * @route GET /api/users/:id
   * @access Private (Admin only)
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required'
          }
        });
        return;
      }

      const user = await UserModel.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword
        }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user'
        }
      });
    }
  }

  /**
   * Create new user
   * @route POST /api/users
   * @access Private (Admin only)
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = UserController.createUserSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
        return;
      }

      const userData: CreateUserRequest = value;

      // Create user
      const user = await UserModel.create(userData);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        data: {
          user: userWithoutPassword,
          message: 'User created successfully'
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Username already exists')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'USERNAME_EXISTS',
              message: 'Username already exists'
            }
          });
          return;
        }
        
        if (error.message.includes('Validation error')) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message.replace('Validation error: ', '')
            }
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating user'
        }
      });
    }
  }

  /**
   * Update user
   * @route PUT /api/users/:id
   * @access Private (Admin only)
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required'
          }
        });
        return;
      }

      // Validate request body
      const { error, value } = UserController.updateUserSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
        return;
      }

      const updateData: UpdateUserRequest = value;

      // Update user
      const updatedUser = await UserModel.update(id, updateData);
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;

      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword,
          message: 'User updated successfully'
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Username already exists')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'USERNAME_EXISTS',
              message: 'Username already exists'
            }
          });
          return;
        }
        
        if (error.message.includes('Validation error')) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message.replace('Validation error: ', '')
            }
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating user'
        }
      });
    }
  }

  /**
   * Delete user
   * @route DELETE /api/users/:id
   * @access Private (Admin only)
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = (req as any).user?.userId;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required'
          }
        });
        return;
      }

      // Prevent user from deleting themselves
      if (id === currentUserId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Cannot delete your own account'
          }
        });
        return;
      }

      // Check if user exists
      const user = await UserModel.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      // Delete user
      const deleted = await UserModel.delete(id);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete user'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'User deleted successfully'
        }
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting user'
        }
      });
    }
  }

  /**
   * Get current user's profile
   * @route GET /api/users/profile
   * @access Private (Any authenticated user)
   */
  static async getCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword
        }
      });
    } catch (error) {
      console.error('Get current user profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user profile'
        }
      });
    }
  }

  /**
   * Update current user's language preference
   * @route PUT /api/users/language
   * @access Private (Any authenticated user)
   */
  static async updateUserLanguage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { language } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      // Validate language
      if (!language || !I18nService.isSupportedLanguage(language)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Language must be one of: zh, ja'
          }
        });
        return;
      }

      // Update user language
      const updatedUser = await UserModel.update(userId, { language: language as Language });
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;

      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword,
          message: I18nService.translate('user.language_updated', language as Language)
        }
      });
    } catch (error) {
      console.error('Update user language error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating language preference'
        }
      });
    }
  }

  /**
   * Get supported languages
   * @route GET /api/users/languages
   * @access Public
   */
  static async getSupportedLanguages(req: Request, res: Response): Promise<void> {
    try {
      const languages = I18nService.getSupportedLanguages();
      const defaultLanguage = I18nService.getDefaultLanguage();

      res.status(200).json({
        success: true,
        data: {
          languages,
          defaultLanguage,
          translations: {
            zh: I18nService.getTranslations('zh'),
            ja: I18nService.getTranslations('ja')
          }
        }
      });
    } catch (error) {
      console.error('Get supported languages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching supported languages'
        }
      });
    }
  }
}