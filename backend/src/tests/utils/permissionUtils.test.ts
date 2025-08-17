import { PermissionUtils } from '../../utils/permissionUtils';
import { UserRole } from '../../types/user';

describe('PermissionUtils', () => {
  describe('hasPermission', () => {
    it('should return true for admin with any permission', () => {
      expect(PermissionUtils.hasPermission('admin', 'inquiry', 'create')).toBe(true);
      expect(PermissionUtils.hasPermission('admin', 'order', 'delete')).toBe(true);
      expect(PermissionUtils.hasPermission('admin', 'user', 'update')).toBe(true);
    });

    it('should return correct permissions for buyer', () => {
      expect(PermissionUtils.hasPermission('buyer', 'inquiry', 'create')).toBe(true);
      expect(PermissionUtils.hasPermission('buyer', 'quotation', 'create')).toBe(false);
      expect(PermissionUtils.hasPermission('buyer', 'order', 'create')).toBe(true);
    });

    it('should return correct permissions for supplier', () => {
      expect(PermissionUtils.hasPermission('supplier', 'inquiry', 'create')).toBe(false);
      expect(PermissionUtils.hasPermission('supplier', 'quotation', 'create')).toBe(true);
      expect(PermissionUtils.hasPermission('supplier', 'order', 'confirm')).toBe(true);
    });
  });

  describe('role checking methods', () => {
    it('should correctly identify admin role', () => {
      expect(PermissionUtils.isAdmin('admin')).toBe(true);
      expect(PermissionUtils.isAdmin('buyer')).toBe(false);
      expect(PermissionUtils.isAdmin('supplier')).toBe(false);
    });

    it('should correctly identify buyer role', () => {
      expect(PermissionUtils.isBuyer('buyer')).toBe(true);
      expect(PermissionUtils.isBuyer('admin')).toBe(false);
      expect(PermissionUtils.isBuyer('supplier')).toBe(false);
    });

    it('should correctly identify supplier role', () => {
      expect(PermissionUtils.isSupplier('supplier')).toBe(true);
      expect(PermissionUtils.isSupplier('admin')).toBe(false);
      expect(PermissionUtils.isSupplier('buyer')).toBe(false);
    });
  });

  describe('specific permission methods', () => {
    it('should check user management permissions', () => {
      expect(PermissionUtils.canManageUsers('admin')).toBe(true);
      expect(PermissionUtils.canManageUsers('buyer')).toBe(false);
      expect(PermissionUtils.canManageUsers('supplier')).toBe(false);
    });

    it('should check inquiry creation permissions', () => {
      expect(PermissionUtils.canCreateInquiry('buyer')).toBe(true);
      expect(PermissionUtils.canCreateInquiry('admin')).toBe(true);
      expect(PermissionUtils.canCreateInquiry('supplier')).toBe(false);
    });

    it('should check quotation creation permissions', () => {
      expect(PermissionUtils.canCreateQuotation('supplier')).toBe(true);
      expect(PermissionUtils.canCreateQuotation('admin')).toBe(true);
      expect(PermissionUtils.canCreateQuotation('buyer')).toBe(false);
    });

    it('should check order creation permissions', () => {
      expect(PermissionUtils.canCreateOrder('buyer')).toBe(true);
      expect(PermissionUtils.canCreateOrder('admin')).toBe(true);
      expect(PermissionUtils.canCreateOrder('supplier')).toBe(false);
    });

    it('should check order confirmation permissions', () => {
      expect(PermissionUtils.canConfirmOrder('supplier')).toBe(true);
      expect(PermissionUtils.canConfirmOrder('admin')).toBe(true);
      expect(PermissionUtils.canConfirmOrder('buyer')).toBe(false);
    });

    it('should check order cancellation permissions', () => {
      expect(PermissionUtils.canCancelAnyOrder('supplier')).toBe(true);
      expect(PermissionUtils.canCancelAnyOrder('admin')).toBe(true);
      expect(PermissionUtils.canCancelAnyOrder('buyer')).toBe(false);
    });

    it('should check deletion permissions', () => {
      expect(PermissionUtils.canDelete('admin', 'inquiry')).toBe(true);
      expect(PermissionUtils.canDelete('buyer', 'inquiry')).toBe(false);
      expect(PermissionUtils.canDelete('supplier', 'order')).toBe(false);
    });
  });

  describe('getCompanyByRole', () => {
    it('should return correct company for each role', () => {
      expect(PermissionUtils.getCompanyByRole('admin')).toBe('admin');
      expect(PermissionUtils.getCompanyByRole('buyer')).toBe('arroz');
      expect(PermissionUtils.getCompanyByRole('supplier')).toBe('yunjie');
    });

    it('should return unknown for invalid role', () => {
      expect(PermissionUtils.getCompanyByRole('invalid' as UserRole)).toBe('unknown');
    });
  });

  describe('canInteract', () => {
    it('should allow admin to interact with everyone', () => {
      expect(PermissionUtils.canInteract('admin', 'buyer')).toBe(true);
      expect(PermissionUtils.canInteract('admin', 'supplier')).toBe(true);
      expect(PermissionUtils.canInteract('buyer', 'admin')).toBe(true);
      expect(PermissionUtils.canInteract('supplier', 'admin')).toBe(true);
    });

    it('should allow buyer and supplier to interact', () => {
      expect(PermissionUtils.canInteract('buyer', 'supplier')).toBe(true);
      expect(PermissionUtils.canInteract('supplier', 'buyer')).toBe(true);
    });

    it('should allow same role users to interact', () => {
      expect(PermissionUtils.canInteract('buyer', 'buyer')).toBe(true);
      expect(PermissionUtils.canInteract('supplier', 'supplier')).toBe(true);
      expect(PermissionUtils.canInteract('admin', 'admin')).toBe(true);
    });
  });

  describe('getAllowedActions', () => {
    it('should return all actions for admin', () => {
      const actions = PermissionUtils.getAllowedActions('admin', 'inquiry');
      expect(actions).toContain('create');
      expect(actions).toContain('read');
      expect(actions).toContain('update');
      expect(actions).toContain('delete');
    });

    it('should return limited actions for buyer on inquiry', () => {
      const actions = PermissionUtils.getAllowedActions('buyer', 'inquiry');
      expect(actions).toContain('create');
      expect(actions).toContain('read');
      expect(actions).toContain('update');
      expect(actions).not.toContain('confirm');
    });

    it('should return limited actions for supplier on quotation', () => {
      const actions = PermissionUtils.getAllowedActions('supplier', 'quotation');
      expect(actions).toContain('create');
      expect(actions).toContain('read');
      expect(actions).toContain('update');
      expect(actions).toContain('cancel');
    });
  });

  describe('validateBusinessRule', () => {
    it('should allow admin to perform any action', () => {
      const result = PermissionUtils.validateBusinessRule('admin', 'inquiry', 'delete');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny action when user lacks basic permission', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'quotation', 'create');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have permission');
    });

    it('should deny inquiry modification when not owner', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'inquiry', 'update', {
        isOwner: false
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('your own inquiries');
    });

    it('should deny inquiry modification when already replied', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'inquiry', 'update', {
        isOwner: true,
        isReplied: true
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('replied to');
    });

    it('should allow inquiry modification when owner and not replied', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'inquiry', 'update', {
        isOwner: true,
        isReplied: false
      });
      expect(result.allowed).toBe(true);
    });

    it('should deny order cancellation when not owner (buyer)', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'order', 'cancel', {
        isOwner: false
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('your own orders');
    });

    it('should deny order cancellation when confirmed (buyer)', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'order', 'cancel', {
        isOwner: true,
        isConfirmed: true
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('confirmed orders');
    });

    it('should allow order cancellation when owner and not confirmed (buyer)', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'order', 'cancel', {
        isOwner: true,
        isConfirmed: false
      });
      expect(result.allowed).toBe(true);
    });

    it('should allow supplier to cancel any order', () => {
      const result = PermissionUtils.validateBusinessRule('supplier', 'order', 'cancel', {
        isOwner: false,
        isConfirmed: true
      });
      expect(result.allowed).toBe(true);
    });

    it('should deny order update when not owner (buyer)', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'order', 'update', {
        isOwner: false
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('your own orders');
    });

    it('should allow order update when owner (buyer)', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'order', 'update', {
        isOwner: true
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('canModify', () => {
    it('should return true when user can update or delete', () => {
      expect(PermissionUtils.canModify('admin', 'inquiry')).toBe(true);
      expect(PermissionUtils.canModify('buyer', 'inquiry')).toBe(true);
      expect(PermissionUtils.canModify('supplier', 'quotation')).toBe(true);
    });

    it('should return false when user cannot update or delete', () => {
      expect(PermissionUtils.canModify('supplier', 'inquiry')).toBe(false);
      expect(PermissionUtils.canModify('buyer', 'quotation')).toBe(false);
    });
  });

  describe('enhanced business rule methods', () => {
    describe('canModifyInquiry', () => {
      it('should allow admin to modify any inquiry', () => {
        const result = PermissionUtils.canModifyInquiry('admin', false, true);
        expect(result.allowed).toBe(true);
      });

      it('should deny buyer modification when not owner', () => {
        const result = PermissionUtils.canModifyInquiry('buyer', false, false);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('your own inquiries');
      });

      it('should deny buyer modification when inquiry has replies', () => {
        const result = PermissionUtils.canModifyInquiry('buyer', true, true);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('replied to');
      });

      it('should allow buyer modification when owner and no replies', () => {
        const result = PermissionUtils.canModifyInquiry('buyer', true, false);
        expect(result.allowed).toBe(true);
      });
    });

    describe('canCancelOrder', () => {
      it('should allow admin to cancel any order', () => {
        const result = PermissionUtils.canCancelOrder('admin', false, true);
        expect(result.allowed).toBe(true);
      });

      it('should deny buyer cancellation when not owner', () => {
        const result = PermissionUtils.canCancelOrder('buyer', false, false);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('your own orders');
      });

      it('should deny buyer cancellation when order is confirmed', () => {
        const result = PermissionUtils.canCancelOrder('buyer', true, true);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('confirmed orders');
      });

      it('should allow buyer cancellation when owner and not confirmed', () => {
        const result = PermissionUtils.canCancelOrder('buyer', true, false);
        expect(result.allowed).toBe(true);
      });

      it('should allow supplier to cancel any order', () => {
        const result = PermissionUtils.canCancelOrder('supplier', false, true);
        expect(result.allowed).toBe(true);
      });
    });

    describe('hasAdminPrivileges', () => {
      it('should return true for admin role', () => {
        expect(PermissionUtils.hasAdminPrivileges('admin')).toBe(true);
      });

      it('should return false for non-admin roles', () => {
        expect(PermissionUtils.hasAdminPrivileges('buyer')).toBe(false);
        expect(PermissionUtils.hasAdminPrivileges('supplier')).toBe(false);
      });
    });

    describe('canDeleteResource', () => {
      it('should allow admin to delete any resource', () => {
        expect(PermissionUtils.canDeleteResource('admin', 'inquiry')).toBe(true);
        expect(PermissionUtils.canDeleteResource('admin', 'order')).toBe(true);
        expect(PermissionUtils.canDeleteResource('admin', 'user')).toBe(true);
      });

      it('should deny deletion for non-admin roles', () => {
        expect(PermissionUtils.canDeleteResource('buyer', 'inquiry')).toBe(false);
        expect(PermissionUtils.canDeleteResource('supplier', 'order')).toBe(false);
        expect(PermissionUtils.canDeleteResource('buyer', 'user')).toBe(false);
      });
    });

    describe('getPermissionSummary', () => {
      it('should return correct summary for admin', () => {
        const summary = PermissionUtils.getPermissionSummary('admin');
        expect(summary.canCreateInquiry).toBe(true);
        expect(summary.canCreateQuotation).toBe(true);
        expect(summary.canCreateOrder).toBe(true);
        expect(summary.canConfirmOrder).toBe(true);
        expect(summary.canCancelAnyOrder).toBe(true);
        expect(summary.canManageUsers).toBe(true);
        expect(summary.canDeleteResources).toBe(true);
        expect(summary.company).toBe('admin');
      });

      it('should return correct summary for buyer', () => {
        const summary = PermissionUtils.getPermissionSummary('buyer');
        expect(summary.canCreateInquiry).toBe(true);
        expect(summary.canCreateQuotation).toBe(false);
        expect(summary.canCreateOrder).toBe(true);
        expect(summary.canConfirmOrder).toBe(false);
        expect(summary.canCancelAnyOrder).toBe(false);
        expect(summary.canManageUsers).toBe(false);
        expect(summary.canDeleteResources).toBe(false);
        expect(summary.company).toBe('arroz');
      });

      it('should return correct summary for supplier', () => {
        const summary = PermissionUtils.getPermissionSummary('supplier');
        expect(summary.canCreateInquiry).toBe(false);
        expect(summary.canCreateQuotation).toBe(true);
        expect(summary.canCreateOrder).toBe(false);
        expect(summary.canConfirmOrder).toBe(true);
        expect(summary.canCancelAnyOrder).toBe(true);
        expect(summary.canManageUsers).toBe(false);
        expect(summary.canDeleteResources).toBe(false);
        expect(summary.company).toBe('yunjie');
      });
    });
  });

  describe('enhanced validateBusinessRule', () => {
    it('should enforce inquiry deletion rules', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'inquiry', 'delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have permission');
    });

    it('should enforce order deletion rules', () => {
      const result = PermissionUtils.validateBusinessRule('supplier', 'order', 'delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have permission');
    });

    it('should enforce user deletion rules', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'user', 'delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have permission');
    });

    it('should enforce quotation creation rules', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'quotation', 'create');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have permission');
    });

    it('should enforce quotation deletion rules', () => {
      const result = PermissionUtils.validateBusinessRule('supplier', 'quotation', 'delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have permission');
    });

    it('should enforce user management rules for non-owners', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'user', 'update', {
        isOwner: false
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('your own user profile');
    });

    it('should allow user to manage their own profile', () => {
      const result = PermissionUtils.validateBusinessRule('buyer', 'user', 'update', {
        isOwner: true
      });
      expect(result.allowed).toBe(true);
    });
  });
});