import { UserRole } from '../types/user';
import { checkPermission } from '../middleware/roleMiddleware';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Permission utility class for checking permissions in controllers
 */
export class PermissionUtils {
  /**
   * Check if user has permission for a specific action on a resource
   */
  static hasPermission(
    role: UserRole,
    resource: string,
    action: string,
    req?: AuthenticatedRequest
  ): boolean {
    return checkPermission(role, resource, action, req);
  }

  /**
   * Check if user can modify a resource (update/delete)
   */
  static canModify(
    role: UserRole,
    resource: string,
    req?: AuthenticatedRequest
  ): boolean {
    return this.hasPermission(role, resource, 'update', req) || 
           this.hasPermission(role, resource, 'delete', req);
  }

  /**
   * Check if user is admin
   */
  static isAdmin(role: UserRole): boolean {
    return role === 'admin';
  }

  /**
   * Check if user is buyer
   */
  static isBuyer(role: UserRole): boolean {
    return role === 'buyer';
  }

  /**
   * Check if user is supplier
   */
  static isSupplier(role: UserRole): boolean {
    return role === 'supplier';
  }

  /**
   * Check if user can access user management features
   */
  static canManageUsers(role: UserRole): boolean {
    return this.isAdmin(role);
  }

  /**
   * Check if user can create inquiries
   */
  static canCreateInquiry(role: UserRole): boolean {
    return this.hasPermission(role, 'inquiry', 'create');
  }

  /**
   * Check if user can create quotations
   */
  static canCreateQuotation(role: UserRole): boolean {
    return this.hasPermission(role, 'quotation', 'create');
  }

  /**
   * Check if user can create orders
   */
  static canCreateOrder(role: UserRole): boolean {
    return this.hasPermission(role, 'order', 'create');
  }

  /**
   * Check if user can confirm orders (suppliers only)
   */
  static canConfirmOrder(role: UserRole): boolean {
    return this.hasPermission(role, 'order', 'confirm');
  }

  /**
   * Check if user can cancel any order (suppliers and admin)
   */
  static canCancelAnyOrder(role: UserRole): boolean {
    return this.isSupplier(role) || this.isAdmin(role);
  }

  /**
   * Check if user can delete resources (admin only)
   */
  static canDelete(role: UserRole, resource: string): boolean {
    return this.isAdmin(role);
  }

  /**
   * Get user's company based on role
   */
  static getCompanyByRole(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'admin';
      case 'buyer':
        return 'arroz';
      case 'supplier':
        return 'yunjie';
      default:
        return 'unknown';
    }
  }

  /**
   * Check if two users are from the same company or if one is admin
   */
  static canInteract(role1: UserRole, role2: UserRole): boolean {
    // Admin can interact with everyone
    if (role1 === 'admin' || role2 === 'admin') {
      return true;
    }

    // Buyers and suppliers can interact with each other
    if ((role1 === 'buyer' && role2 === 'supplier') || 
        (role1 === 'supplier' && role2 === 'buyer')) {
      return true;
    }

    // Same role users can interact
    return role1 === role2;
  }

  /**
   * Get allowed actions for a role on a specific resource
   */
  static getAllowedActions(role: UserRole, resource: string): string[] {
    const actions = ['create', 'read', 'update', 'delete', 'cancel', 'confirm'];
    return actions.filter(action => this.hasPermission(role, resource, action));
  }

  /**
   * Validate if a user can perform an action based on business rules
   */
  static validateBusinessRule(
    role: UserRole,
    resource: string,
    action: string,
    context?: {
      isOwner?: boolean;
      isReplied?: boolean;
      isConfirmed?: boolean;
      status?: string;
    }
  ): { allowed: boolean; reason?: string } {
    // Admin can do everything (requirement 9.4)
    if (this.isAdmin(role)) {
      return { allowed: true };
    }

    // Check basic permission first
    if (!this.hasPermission(role, resource, action)) {
      return { 
        allowed: false, 
        reason: `Role ${role} does not have permission to ${action} ${resource}` 
      };
    }

    // Apply business rules based on context
    if (context) {
      // Inquiry business rules (requirements 9.1, 9.2)
      if (resource === 'inquiry') {
        if (action === 'update' || action === 'cancel') {
          // Requirement 9.1: Buyers can only modify their own inquiries
          if (role === 'buyer' && !context.isOwner) {
            return { 
              allowed: false, 
              reason: 'You can only modify your own inquiries' 
            };
          }
          // Requirement 9.2: Cannot modify inquiry after supplier has replied
          if (context.isReplied) {
            return { 
              allowed: false, 
              reason: 'Cannot modify inquiry that has been replied to' 
            };
          }
        }
        // Only admin can delete inquiries (requirement 9.4)
        if (action === 'delete' && role !== 'admin') {
          return {
            allowed: false,
            reason: 'Only administrators can delete inquiries'
          };
        }
      }

      // Order business rules (requirements 9.1, 9.2, 9.3)
      if (resource === 'order') {
        if (action === 'cancel') {
          // Requirement 9.1: Buyers can only cancel their own orders
          if (role === 'buyer' && !context.isOwner) {
            return { 
              allowed: false, 
              reason: 'You can only cancel your own orders' 
            };
          }
          // Requirement 9.2: Cannot cancel order after supplier confirmation
          if (role === 'buyer' && context.isConfirmed) {
            return { 
              allowed: false, 
              reason: 'Cannot cancel confirmed orders' 
            };
          }
          // Requirement 9.3: Suppliers can cancel any order (no additional checks)
        }
        if (action === 'update' && role === 'buyer' && !context.isOwner) {
          return { 
            allowed: false, 
            reason: 'You can only modify your own orders' 
          };
        }
        // Only admin can delete orders (requirement 9.4)
        if (action === 'delete' && role !== 'admin') {
          return {
            allowed: false,
            reason: 'Only administrators can delete orders'
          };
        }
      }

      // User management business rules (requirement 9.4)
      if (resource === 'user') {
        if (action === 'delete' && role !== 'admin') {
          return {
            allowed: false,
            reason: 'Only administrators can delete users'
          };
        }
        if ((action === 'create' || action === 'update') && role !== 'admin' && !context.isOwner) {
          return {
            allowed: false,
            reason: 'You can only manage your own user profile'
          };
        }
      }

      // Quotation business rules
      if (resource === 'quotation') {
        // Only suppliers can create/modify quotations
        if ((action === 'create' || action === 'update' || action === 'cancel') && role === 'buyer') {
          return {
            allowed: false,
            reason: 'Only suppliers can manage quotations'
          };
        }
        // Only admin can delete quotations (requirement 9.4)
        if (action === 'delete' && role !== 'admin') {
          return {
            allowed: false,
            reason: 'Only administrators can delete quotations'
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check if user can modify inquiry based on business rules
   * Implements requirements 9.1 and 9.2
   */
  static canModifyInquiry(
    role: UserRole,
    isOwner: boolean,
    hasReplies: boolean
  ): { allowed: boolean; reason?: string } {
    return this.validateBusinessRule(role, 'inquiry', 'update', {
      isOwner,
      isReplied: hasReplies
    });
  }

  /**
   * Check if user can cancel order based on business rules
   * Implements requirements 9.1, 9.2, and 9.3
   */
  static canCancelOrder(
    role: UserRole,
    isOwner: boolean,
    isConfirmed: boolean
  ): { allowed: boolean; reason?: string } {
    return this.validateBusinessRule(role, 'order', 'cancel', {
      isOwner,
      isConfirmed
    });
  }

  /**
   * Check if user has administrative privileges
   * Implements requirement 9.4
   */
  static hasAdminPrivileges(role: UserRole): boolean {
    return role === 'admin';
  }

  /**
   * Check if user can perform deletion operations
   * Implements requirement 9.4 - only admin can delete
   */
  static canDeleteResource(role: UserRole, resource: string): boolean {
    return this.hasAdminPrivileges(role);
  }

  /**
   * Get permission summary for a user role
   */
  static getPermissionSummary(role: UserRole): {
    canCreateInquiry: boolean;
    canCreateQuotation: boolean;
    canCreateOrder: boolean;
    canConfirmOrder: boolean;
    canCancelAnyOrder: boolean;
    canManageUsers: boolean;
    canDeleteResources: boolean;
    company: string;
  } {
    return {
      canCreateInquiry: this.canCreateInquiry(role),
      canCreateQuotation: this.canCreateQuotation(role),
      canCreateOrder: this.canCreateOrder(role),
      canConfirmOrder: this.canConfirmOrder(role),
      canCancelAnyOrder: this.canCancelAnyOrder(role),
      canManageUsers: this.canManageUsers(role),
      canDeleteResources: this.canDeleteResource(role, 'any'),
      company: this.getCompanyByRole(role)
    };
  }
}

// ==================== 简化的订单权限检查函数 ====================

/**
 * 检查用户是否可以访问订单
 */
export function canUserAccessOrder(user: any, order: any): boolean {
  // 管理员可以访问所有订单
  if (user.role === 'admin') {
    return true;
  }
  
  // 买方用户只能访问自己创建的订单
  if (user.role === 'buyer') {
    return order.createdBy === user.id;
  }
  
  // 供应商可以访问所有订单
  if (user.role === 'supplier') {
    return true;
  }
  
  return false;
}

/**
 * 检查用户是否可以修改订单
 */
export function canUserModifyOrder(user: any, order: any): boolean {
  // 管理员可以修改所有订单
  if (user.role === 'admin') {
    return true;
  }
  
  // 买方用户只能修改自己创建的订单
  if (user.role === 'buyer') {
    return order.createdBy === user.id;
  }
  
  // 供应商不能修改订单基本信息，只能更新状态
  return false;
}

/**
 * 检查用户是否可以删除订单
 */
export function canUserDeleteOrder(user: any, order: any): boolean {
  // 只有管理员可以删除订单
  return user.role === 'admin';
}