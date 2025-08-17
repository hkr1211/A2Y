import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/user';
import { AuthenticatedRequest } from './auth';

/**
 * Permission definitions for different operations
 */
export interface Permission {
  resource: string;
  action: string;
  condition?: (req: AuthenticatedRequest) => boolean;
}

/**
 * Role-based permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admin has all permissions
    { resource: '*', action: '*' },
  ],
  buyer: [
    // User management (read only for own profile)
    { resource: 'user', action: 'read', condition: (req) => req.params?.id === req.user?.userId },
    { resource: 'user', action: 'update', condition: (req) => req.params?.id === req.user?.userId },
    
    // Inquiry management
    { resource: 'inquiry', action: 'create' },
    { resource: 'inquiry', action: 'read' },
    { resource: 'inquiry', action: 'update', condition: (req) => isOwner(req, 'inquiry') },
    { resource: 'inquiry', action: 'cancel', condition: (req) => isOwner(req, 'inquiry') && !isReplied(req) },
    
    // Quotation management (read only)
    { resource: 'quotation', action: 'read' },
    
    // Order management
    { resource: 'order', action: 'create' },
    { resource: 'order', action: 'read' },
    { resource: 'order', action: 'update', condition: (req) => isOwner(req, 'order') },
    { resource: 'order', action: 'cancel', condition: (req) => isOwner(req, 'order') && !isConfirmed(req) },
    
    // Chat management
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    
    // File management
    { resource: 'file', action: 'upload' },
    { resource: 'file', action: 'download' },
    { resource: 'file', action: 'delete', condition: (req) => isFileOwner(req) },
    
    // Notification management
    { resource: 'notification', action: 'read' },
    { resource: 'notification', action: 'update' },
  ],
  supplier: [
    // User management (read only for own profile)
    { resource: 'user', action: 'read', condition: (req) => req.params?.id === req.user?.userId },
    { resource: 'user', action: 'update', condition: (req) => req.params?.id === req.user?.userId },
    
    // Inquiry management (read only)
    { resource: 'inquiry', action: 'read' },
    
    // Quotation management
    { resource: 'quotation', action: 'create' },
    { resource: 'quotation', action: 'read' },
    { resource: 'quotation', action: 'update' },
    { resource: 'quotation', action: 'cancel' },
    
    // Order management
    { resource: 'order', action: 'read' },
    { resource: 'order', action: 'update' }, // For status updates
    { resource: 'order', action: 'confirm' },
    { resource: 'order', action: 'cancel' }, // Suppliers can cancel any order
    
    // Chat management
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    
    // File management
    { resource: 'file', action: 'upload' },
    { resource: 'file', action: 'download' },
    { resource: 'file', action: 'delete', condition: (req) => isFileOwner(req) },
    
    // Notification management
    { resource: 'notification', action: 'read' },
    { resource: 'notification', action: 'update' },
  ],
};

/**
 * Helper function to check if user is the owner of a resource
 */
function isOwner(req: AuthenticatedRequest, resourceType: string): boolean {
  // This would typically check against the database
  // For now, we'll implement a basic check
  const resourceId = req.params?.id;
  const userId = req.user?.userId;
  
  if (!resourceId || !userId) {
    return false;
  }
  
  // In a real implementation, you would query the database to check ownership
  // For example: SELECT created_by FROM inquiries WHERE id = resourceId
  // This is a placeholder that should be implemented with actual database queries
  return true; // Placeholder - implement actual ownership check
}

/**
 * Helper function to check if an inquiry has been replied to
 */
function isReplied(req: AuthenticatedRequest): boolean {
  // This would check if the inquiry has any quotations
  // Placeholder implementation
  return false;
}

/**
 * Helper function to check if an order has been confirmed
 */
function isConfirmed(req: AuthenticatedRequest): boolean {
  // This would check the order status
  // Placeholder implementation
  return false;
}

/**
 * Helper function to check if user owns a file
 */
function isFileOwner(req: AuthenticatedRequest): boolean {
  // This would check file ownership
  // Placeholder implementation
  return true;
}

/**
 * Enhanced business rule validation middleware
 * Implements specific business rules from requirements 9.1-9.5
 */
export const validateBusinessRules = (resource: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { role, userId } = req.user;
    const resourceId = req.params?.id;

    try {
      // Admin can do everything (requirement 9.4)
      if (role === 'admin') {
        next();
        return;
      }

      // Apply specific business rules based on resource and action
      switch (resource) {
        case 'inquiry':
          if (action === 'update' || action === 'cancel') {
            // Requirement 9.1: Buyers can only modify their own inquiries
            if (role === 'buyer') {
              const isResourceOwner = await checkResourceOwnership('inquiry', resourceId!, userId);
              if (!isResourceOwner) {
                res.status(403).json({
                  success: false,
                  error: {
                    code: 'FORBIDDEN',
                    message: 'You can only modify your own inquiries',
                  },
                });
                return;
              }

              // Requirement 9.2: Cannot modify inquiry after supplier has replied
              const hasReplies = await checkInquiryHasReplies(resourceId!);
              if (hasReplies) {
                res.status(403).json({
                  success: false,
                  error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot modify inquiry that has been replied to by supplier',
                  },
                });
                return;
              }
            }
          }
          break;

        case 'order':
          if (action === 'cancel') {
            if (role === 'buyer') {
              // Requirement 9.1: Buyers can only cancel their own orders
              const isResourceOwner = await checkResourceOwnership('order', resourceId!, userId);
              if (!isResourceOwner) {
                res.status(403).json({
                  success: false,
                  error: {
                    code: 'FORBIDDEN',
                    message: 'You can only cancel your own orders',
                  },
                });
                return;
              }

              // Requirement 9.2: Cannot cancel order after supplier confirmation
              const isOrderConfirmed = await checkOrderConfirmationStatus(resourceId!);
              if (isOrderConfirmed) {
                res.status(403).json({
                  success: false,
                  error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot cancel order that has been confirmed by supplier',
                  },
                });
                return;
              }
            }
            // Requirement 9.3: Suppliers can cancel any order
            // No additional checks needed for suppliers
          } else if (action === 'update') {
            if (role === 'buyer') {
              // Requirement 9.1: Buyers can only update their own orders
              const isResourceOwner = await checkResourceOwnership('order', resourceId!, userId);
              if (!isResourceOwner) {
                res.status(403).json({
                  success: false,
                  error: {
                    code: 'FORBIDDEN',
                    message: 'You can only update your own orders',
                  },
                });
                return;
              }
            }
          }
          break;

        case 'user':
          if (action === 'delete') {
            // Requirement 9.4: Only admin can delete users
            res.status(403).json({
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Only administrators can delete users',
              },
            });
            return;
          }
          break;

        default:
          // For resources not explicitly handled, apply general ownership rules
          if ((action === 'update' || action === 'delete') && resourceId) {
            const isResourceOwner = await checkResourceOwnership(resource, resourceId, userId);
            if (!isResourceOwner && role !== 'admin') {
              res.status(403).json({
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: `You can only ${action} your own ${resource}s`,
                },
              });
              return;
            }
          }
          break;
      }

      next();
    } catch (error) {
      console.error('Error validating business rules:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error validating business rules',
        },
      });
    }
  };
};

/**
 * Helper function to check if an inquiry has replies (quotations)
 */
export async function checkInquiryHasReplies(inquiryId: string): Promise<boolean> {
  // Placeholder implementation
  // In a real application, you would query the database:
  // const quotations = await QuotationModel.findByInquiryId(inquiryId);
  // return quotations.length > 0;
  return false;
}

/**
 * Helper function to check if an order has been confirmed by supplier
 */
export async function checkOrderConfirmationStatus(orderId: string): Promise<boolean> {
  // Placeholder implementation
  // In a real application, you would query the database:
  // const order = await OrderModel.findById(orderId);
  // return order?.status === 'confirmed' || order?.confirmedBy !== null;
  return false;
}

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check specific permission
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const hasPermission = checkPermission(req.user.role, resource, action, req);
    
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied for ${action} on ${resource}`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Check if a role has permission for a specific resource and action
 */
export function checkPermission(
  role: UserRole,
  resource: string,
  action: string,
  req?: AuthenticatedRequest
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return false;
  }

  // Check for wildcard permissions (admin)
  const wildcardPermission = permissions.find(p => p.resource === '*' && p.action === '*');
  if (wildcardPermission) {
    return true;
  }

  // Check for specific resource permissions
  const resourcePermissions = permissions.filter(p => 
    p.resource === resource || p.resource === '*'
  );

  for (const permission of resourcePermissions) {
    // Check action match
    if (permission.action === action || permission.action === '*') {
      // If no condition, permission is granted
      if (!permission.condition) {
        return true;
      }
      // If condition exists and request is provided, check condition
      if (permission.condition && req) {
        return permission.condition(req);
      }
      // If condition exists but no request provided, assume permission exists
      // (for cases where we're just checking if the role has the permission in general)
      if (permission.condition && !req) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Middleware to check ownership of a resource
 */
export const requireOwnership = (resourceType: 'inquiry' | 'order' | 'file') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      next();
      return;
    }

    const resourceId = req.params?.id;
    if (!resourceId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Resource ID is required',
        },
      });
      return;
    }

    try {
      // Here you would implement actual ownership checks against the database
      // For now, we'll use a placeholder implementation
      const isOwner = await checkResourceOwnership(resourceType, resourceId, req.user.userId);
      
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own resources',
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking resource ownership:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error checking resource ownership',
        },
      });
    }
  };
};

/**
 * Helper function to check resource ownership
 * This should be implemented with actual database queries
 */
export async function checkResourceOwnership(
  resourceType: string,
  resourceId: string,
  userId: string
): Promise<boolean> {
  // Placeholder implementation
  // In a real application, you would query the database:
  // 
  // switch (resourceType) {
  //   case 'inquiry':
  //     const inquiry = await InquiryModel.findById(resourceId);
  //     return inquiry?.createdBy === userId;
  //   case 'order':
  //     const order = await OrderModel.findById(resourceId);
  //     return order?.createdBy === userId;
  //   case 'file':
  //     const file = await FileModel.findById(resourceId);
  //     return file?.uploadedBy === userId;
  //   default:
  //     return false;
  // }
  
  return true; // Placeholder - implement actual ownership check
}

/**
 * Middleware for admin-only operations
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware for buyer-only operations
 */
export const requireBuyer = requireRole(['buyer']);

/**
 * Middleware for supplier-only operations
 */
export const requireSupplier = requireRole(['supplier']);

/**
 * Middleware for buyer or admin operations
 */
export const requireBuyerOrAdmin = requireRole(['buyer', 'admin']);

/**
 * Middleware for supplier or admin operations
 */
export const requireSupplierOrAdmin = requireRole(['supplier', 'admin']);

/**
 * Middleware to check if user can manage inquiries
 * Buyers can create/read/update their own inquiries (if not replied)
 * Suppliers can read inquiries
 * Admin can do everything
 */
export const canManageInquiry = (action: 'create' | 'read' | 'update' | 'delete' | 'cancel') => {
  return [
    requirePermission('inquiry', action),
    ...(action === 'update' || action === 'cancel' ? [validateBusinessRules('inquiry', action)] : [])
  ];
};

/**
 * Middleware to check if user can manage orders
 * Buyers can create/read/update/cancel their own orders (if not confirmed)
 * Suppliers can read/update/confirm/cancel any order
 * Admin can do everything
 */
export const canManageOrder = (action: 'create' | 'read' | 'update' | 'delete' | 'cancel' | 'confirm') => {
  return [
    requirePermission('order', action),
    ...(action === 'update' || action === 'cancel' ? [validateBusinessRules('order', action)] : [])
  ];
};

/**
 * Middleware to check if user can manage quotations
 * Only suppliers can create/update/cancel quotations
 * Buyers can read quotations
 * Admin can do everything
 */
export const canManageQuotation = (action: 'create' | 'read' | 'update' | 'delete' | 'cancel') => {
  return [requirePermission('quotation', action)];
};

/**
 * Middleware to check if user can manage users
 * Only admin can create/update/delete users
 * Users can read/update their own profile
 */
export const canManageUser = (action: 'create' | 'read' | 'update' | 'delete') => {
  return [
    requirePermission('user', action),
    ...(action === 'delete' ? [validateBusinessRules('user', action)] : [])
  ];
};

/**
 * Middleware to enforce inquiry ownership and reply status rules
 * Implements requirements 9.1 and 9.2
 */
export const enforceInquiryRules = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // Admin can bypass all rules
  if (req.user.role === 'admin') {
    next();
    return;
  }

  const inquiryId = req.params?.id;
  const { role, userId } = req.user;

  if (!inquiryId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Inquiry ID is required',
      },
    });
    return;
  }

  try {
    // Check ownership for buyers
    if (role === 'buyer') {
      const isOwner = await checkResourceOwnership('inquiry', inquiryId, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own inquiries',
          },
        });
        return;
      }

      // For modification operations, check if inquiry has been replied
      if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        const hasReplies = await checkInquiryHasReplies(inquiryId);
        if (hasReplies) {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot modify inquiry that has been replied to',
            },
          });
          return;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error enforcing inquiry rules:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error checking inquiry permissions',
      },
    });
  }
};

/**
 * Middleware to enforce order ownership and confirmation status rules
 * Implements requirements 9.1 and 9.2
 */
export const enforceOrderRules = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // Admin can bypass all rules
  if (req.user.role === 'admin') {
    next();
    return;
  }

  const orderId = req.params?.id;
  const { role, userId } = req.user;

  if (!orderId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Order ID is required',
      },
    });
    return;
  }

  try {
    // Check ownership for buyers
    if (role === 'buyer') {
      const isOwner = await checkResourceOwnership('order', orderId, userId);
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own orders',
          },
        });
        return;
      }

      // For cancellation, check if order has been confirmed
      if (req.method === 'DELETE' || (req.method === 'PATCH' && req.body?.status === 'cancelled')) {
        const isConfirmed = await checkOrderConfirmationStatus(orderId);
        if (isConfirmed) {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot cancel order that has been confirmed by supplier',
            },
          });
          return;
        }
      }
    }

    // Suppliers can access any order (requirement 9.3)
    next();
  } catch (error) {
    console.error('Error enforcing order rules:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error checking order permissions',
      },
    });
  }
};