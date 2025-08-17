import { Request, Response, NextFunction } from 'express';
import {
  requireRole,
  requirePermission,
  requireOwnership,
  checkPermission,
  requireAdmin,
  requireBuyer,
  requireSupplier,
  validateBusinessRules,
  enforceInquiryRules,
  enforceOrderRules,
  checkResourceOwnership,
  checkInquiryHasReplies,
  checkOrderConfirmationStatus,
  ROLE_PERMISSIONS,
} from '../../middleware/roleMiddleware';
import { AuthenticatedRequest } from '../../middleware/auth';

describe('RoleMiddleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockNext = jest.fn();
    
    mockRequest = {
      params: {},
      user: undefined,
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('requireRole', () => {
    it('should allow access for users with correct role', () => {
      const middleware = requireRole(['buyer', 'admin']);
      
      mockRequest.user = {
        userId: 'user-uuid',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now(),
      };

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access for users without correct role', () => {
      const middleware = requireRole(['admin']);
      
      mockRequest.user = {
        userId: 'user-uuid',
        username: 'testuser',
        role: 'buyer',
        iat: Date.now(),
      };

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    });

    it('should deny access for unauthenticated users', () => {
      const middleware = requireRole(['buyer']);
      
      mockRequest.user = undefined;

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('requirePermission', () => {
    it('should allow access for admin with wildcard permissions', () => {
      const middleware = requirePermission('inquiry', 'create');
      
      mockRequest.user = {
        userId: 'admin-uuid',
        username: 'admin',
        role: 'admin',
        iat: Date.now(),
      };

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should allow access for buyer creating inquiry', () => {
      const middleware = requirePermission('inquiry', 'create');
      
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access for supplier creating inquiry', () => {
      const middleware = requirePermission('inquiry', 'create');
      
      mockRequest.user = {
        userId: 'supplier-uuid',
        username: 'supplier',
        role: 'supplier',
        iat: Date.now(),
      };

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Permission denied for create on inquiry',
        },
      });
    });

    it('should deny access for unauthenticated users', () => {
      const middleware = requirePermission('inquiry', 'create');
      
      mockRequest.user = undefined;

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('requireOwnership', () => {
    it('should allow access for admin regardless of ownership', async () => {
      const middleware = requireOwnership('inquiry');
      
      mockRequest.user = {
        userId: 'admin-uuid',
        username: 'admin',
        role: 'admin',
        iat: Date.now(),
      };
      mockRequest.params = { id: 'inquiry-uuid' };

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should allow access for resource owner', async () => {
      const middleware = requireOwnership('inquiry');
      
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };
      mockRequest.params = { id: 'inquiry-uuid' };

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access when resource ID is missing', async () => {
      const middleware = requireOwnership('inquiry');
      
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };
      mockRequest.params = {};

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Resource ID is required',
        },
      });
    });

    it('should deny access for unauthenticated users', async () => {
      const middleware = requireOwnership('inquiry');
      
      mockRequest.user = undefined;
      mockRequest.params = { id: 'inquiry-uuid' };

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('checkPermission', () => {
    it('should return true for admin with any permission', () => {
      const result = checkPermission('admin', 'inquiry', 'create');
      expect(result).toBe(true);
    });

    it('should return true for buyer creating inquiry', () => {
      const result = checkPermission('buyer', 'inquiry', 'create');
      expect(result).toBe(true);
    });

    it('should return false for supplier creating inquiry', () => {
      const result = checkPermission('supplier', 'inquiry', 'create');
      expect(result).toBe(false);
    });

    it('should return true for supplier creating quotation', () => {
      const result = checkPermission('supplier', 'quotation', 'create');
      expect(result).toBe(true);
    });

    it('should return false for buyer creating quotation', () => {
      const result = checkPermission('buyer', 'quotation', 'create');
      expect(result).toBe(false);
    });

    it('should return true for both roles reading notifications', () => {
      expect(checkPermission('buyer', 'notification', 'read')).toBe(true);
      expect(checkPermission('supplier', 'notification', 'read')).toBe(true);
    });

    it('should return false for invalid role', () => {
      const result = checkPermission('invalid' as any, 'inquiry', 'create');
      expect(result).toBe(false);
    });
  });

  describe('role-specific middleware', () => {
    it('requireAdmin should only allow admin users', () => {
      mockRequest.user = {
        userId: 'admin-uuid',
        username: 'admin',
        role: 'admin',
        iat: Date.now(),
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('requireBuyer should only allow buyer users', () => {
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };

      requireBuyer(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('requireSupplier should only allow supplier users', () => {
      mockRequest.user = {
        userId: 'supplier-uuid',
        username: 'supplier',
        role: 'supplier',
        iat: Date.now(),
      };

      requireSupplier(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('requireAdmin should deny non-admin users', () => {
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should have permissions defined for all roles', () => {
      expect(ROLE_PERMISSIONS.admin).toBeDefined();
      expect(ROLE_PERMISSIONS.buyer).toBeDefined();
      expect(ROLE_PERMISSIONS.supplier).toBeDefined();
    });

    it('should have wildcard permission for admin', () => {
      const adminPermissions = ROLE_PERMISSIONS.admin;
      const wildcardPermission = adminPermissions.find(p => p.resource === '*' && p.action === '*');
      expect(wildcardPermission).toBeDefined();
    });

    it('should have inquiry create permission for buyer', () => {
      const buyerPermissions = ROLE_PERMISSIONS.buyer;
      const inquiryCreatePermission = buyerPermissions.find(p => p.resource === 'inquiry' && p.action === 'create');
      expect(inquiryCreatePermission).toBeDefined();
    });

    it('should have quotation create permission for supplier', () => {
      const supplierPermissions = ROLE_PERMISSIONS.supplier;
      const quotationCreatePermission = supplierPermissions.find(p => p.resource === 'quotation' && p.action === 'create');
      expect(quotationCreatePermission).toBeDefined();
    });

    it('should not have inquiry create permission for supplier', () => {
      const supplierPermissions = ROLE_PERMISSIONS.supplier;
      const inquiryCreatePermission = supplierPermissions.find(p => p.resource === 'inquiry' && p.action === 'create');
      expect(inquiryCreatePermission).toBeUndefined();
    });
  });

  describe('validateBusinessRules', () => {
    it('should allow admin to perform any action', async () => {
      const middleware = validateBusinessRules('inquiry', 'delete');
      
      mockRequest.user = {
        userId: 'admin-uuid',
        username: 'admin',
        role: 'admin',
        iat: Date.now(),
      };
      mockRequest.params = { id: 'inquiry-uuid' };

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should allow supplier to cancel any order', async () => {
      const middleware = validateBusinessRules('order', 'cancel');
      
      mockRequest.user = {
        userId: 'supplier-uuid',
        username: 'supplier',
        role: 'supplier',
        iat: Date.now(),
      };
      mockRequest.params = { id: 'order-uuid' };

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny user deletion for non-admin', async () => {
      const middleware = validateBusinessRules('user', 'delete');
      
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };
      mockRequest.params = { id: 'user-uuid' };

      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can delete users',
        },
      });
    });
  });

  describe('enforceInquiryRules', () => {
    it('should allow admin to bypass all rules', async () => {
      mockRequest.user = {
        userId: 'admin-uuid',
        username: 'admin',
        role: 'admin',
        iat: Date.now(),
      };
      mockRequest.params = { id: 'inquiry-uuid' };

      await enforceInquiryRules(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access when inquiry ID is missing', async () => {
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };
      mockRequest.params = {};

      await enforceInquiryRules(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Inquiry ID is required',
        },
      });
    });
  });

  describe('enforceOrderRules', () => {
    it('should allow supplier to access any order', async () => {
      mockRequest.user = {
        userId: 'supplier-uuid',
        username: 'supplier',
        role: 'supplier',
        iat: Date.now(),
      };
      mockRequest.params = { id: 'order-uuid' };

      await enforceOrderRules(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access when order ID is missing', async () => {
      mockRequest.user = {
        userId: 'buyer-uuid',
        username: 'buyer',
        role: 'buyer',
        iat: Date.now(),
      };
      mockRequest.params = {};

      await enforceOrderRules(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Order ID is required',
        },
      });
    });
  });
});