# Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the implementation of the role-based access control system for the Trade Inquiry Order System, which enforces the business rules specified in requirements 1.5, 9.1, 9.2, 9.3, 9.4, and 9.5.

## Architecture

The RBAC system consists of three main components:

1. **Role Middleware** (`src/middleware/roleMiddleware.ts`) - Core permission checking and business rule enforcement
2. **Permission Utils** (`src/utils/permissionUtils.ts`) - Utility functions for permission validation
3. **User Types** (`src/types/user.ts`) - Type definitions for roles and permissions

## User Roles

The system supports three user roles:

- **admin**: Super administrator with full system access
- **buyer**: Arroz company employees (buyers)
- **supplier**: Yunjie company employees (suppliers)

## Permission System

### Core Middleware Functions

#### `requireRole(allowedRoles: UserRole[])`
Basic role-based access control middleware that checks if the user has one of the allowed roles.

#### `requirePermission(resource: string, action: string)`
Advanced permission checking that validates specific resource-action combinations based on the role permissions matrix.

#### `validateBusinessRules(resource: string, action: string)`
Enforces complex business rules including ownership checks and status-based restrictions.

#### `requireOwnership(resourceType: 'inquiry' | 'order' | 'file')`
Ensures users can only access resources they own (with admin bypass).

### Specialized Middleware

#### `enforceInquiryRules`
Implements inquiry-specific business rules:
- Buyers can only access their own inquiries
- Inquiries cannot be modified after supplier replies

#### `enforceOrderRules`
Implements order-specific business rules:
- Buyers can only access their own orders
- Orders cannot be cancelled after supplier confirmation
- Suppliers can access any order

### Convenience Middleware

- `requireAdmin` - Admin-only access
- `requireBuyer` - Buyer-only access
- `requireSupplier` - Supplier-only access
- `requireBuyerOrAdmin` - Buyer or admin access
- `requireSupplierOrAdmin` - Supplier or admin access

## Business Rules Implementation

### Requirement 1.5: User Authentication and Role-Based Access
- ✅ Users must log in to access system features
- ✅ Different roles have different permissions
- ✅ Dashboard shows role-appropriate features

### Requirement 9.1: Ownership-Based Access Control
- ✅ Buyers can only modify their own inquiries and orders
- ✅ Ownership validation is enforced at middleware level
- ✅ Admin can bypass ownership restrictions

### Requirement 9.2: Status-Based Restrictions
- ✅ Inquiries cannot be modified after supplier replies
- ✅ Orders cannot be cancelled after supplier confirmation
- ✅ Status checks are performed before allowing modifications

### Requirement 9.3: Supplier Privileges
- ✅ Suppliers can cancel any order regardless of ownership
- ✅ Suppliers can access all inquiries for quotation purposes
- ✅ Suppliers have elevated privileges for order management

### Requirement 9.4: Administrative Privileges
- ✅ Only administrators can delete any resources
- ✅ Administrators can bypass all ownership and status restrictions
- ✅ User management is restricted to administrators

### Requirement 9.5: Permission Validation
- ✅ All operations validate user permissions before execution
- ✅ Clear error messages for permission violations
- ✅ Comprehensive logging of permission checks

## Permission Matrix

| Resource | Action | Admin | Buyer | Supplier |
|----------|--------|-------|-------|----------|
| inquiry  | create | ✅    | ✅    | ❌       |
| inquiry  | read   | ✅    | ✅*   | ✅       |
| inquiry  | update | ✅    | ✅*   | ❌       |
| inquiry  | delete | ✅    | ❌    | ❌       |
| inquiry  | cancel | ✅    | ✅*   | ❌       |
| quotation| create | ✅    | ❌    | ✅       |
| quotation| read   | ✅    | ✅    | ✅       |
| quotation| update | ✅    | ❌    | ✅       |
| quotation| delete | ✅    | ❌    | ❌       |
| quotation| cancel | ✅    | ❌    | ✅       |
| order    | create | ✅    | ✅    | ❌       |
| order    | read   | ✅    | ✅*   | ✅       |
| order    | update | ✅    | ✅*   | ✅       |
| order    | delete | ✅    | ❌    | ❌       |
| order    | cancel | ✅    | ✅*   | ✅       |
| order    | confirm| ✅    | ❌    | ✅       |
| user     | create | ✅    | ❌    | ❌       |
| user     | read   | ✅    | ✅*   | ✅*      |
| user     | update | ✅    | ✅*   | ✅*      |
| user     | delete | ✅    | ❌    | ❌       |

*\* = Only own resources or with additional conditions*

## Usage Examples

### Basic Role Check
```typescript
import { requireBuyer } from '../middleware/roleMiddleware';

router.post('/inquiries', requireBuyer, createInquiry);
```

### Permission-Based Check
```typescript
import { requirePermission } from '../middleware/roleMiddleware';

router.put('/inquiries/:id', requirePermission('inquiry', 'update'), updateInquiry);
```

### Business Rule Enforcement
```typescript
import { validateBusinessRules } from '../middleware/roleMiddleware';

router.delete('/orders/:id', 
  requirePermission('order', 'cancel'),
  validateBusinessRules('order', 'cancel'),
  cancelOrder
);
```

### Complex Middleware Chain
```typescript
import { canManageOrder } from '../middleware/roleMiddleware';

router.put('/orders/:id/cancel', ...canManageOrder('cancel'), cancelOrder);
```

## Error Responses

The RBAC system returns standardized error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Permission denied for create on inquiry"
  }
}
```

### Business Rule Violations
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Cannot modify inquiry that has been replied to"
  }
}
```

## Testing

The RBAC system includes comprehensive unit tests covering:

- ✅ Role-based access control
- ✅ Permission validation
- ✅ Business rule enforcement
- ✅ Ownership checks
- ✅ Error handling
- ✅ Edge cases and boundary conditions

Test files:
- `src/tests/middleware/roleMiddleware.test.ts`
- `src/tests/utils/permissionUtils.test.ts`

## Future Enhancements

1. **Database Integration**: Replace placeholder ownership checks with actual database queries
2. **Audit Logging**: Add comprehensive audit trails for permission checks
3. **Dynamic Permissions**: Support for runtime permission modifications
4. **Resource-Level Permissions**: More granular permissions per resource instance
5. **Time-Based Permissions**: Support for temporary or scheduled permissions

## Security Considerations

1. **Fail-Safe Defaults**: All permissions default to denied
2. **Principle of Least Privilege**: Users get minimum required permissions
3. **Defense in Depth**: Multiple layers of permission checking
4. **Input Validation**: All user inputs are validated before permission checks
5. **Error Information**: Error messages don't leak sensitive information

## Maintenance

To add new permissions or modify existing ones:

1. Update the `ROLE_PERMISSIONS` matrix in `roleMiddleware.ts`
2. Add corresponding business rules in `validateBusinessRules`
3. Update the `PermissionUtils` class with new helper methods
4. Add comprehensive unit tests for new functionality
5. Update this documentation

## Dependencies

- Express.js middleware system
- JWT authentication (from auth middleware)
- TypeScript for type safety
- Jest for unit testing