# Super Admin Role Implementation

This document describes the implementation of the super admin role in the Cliniva backend system.

## Overview

The super admin role has been added to provide the highest level of administrative access to the system. Super admins have access to all permissions and can manage all other roles.

## Role Hierarchy

The system now implements a role hierarchy where higher roles can manage lower roles:

```
Super Admin (super_admin)
├── Owner (owner)
│   ├── Admin (admin)
│   │   ├── Doctor (doctor)
│   │   │   ├── Staff (staff)
│   │   │   │   └── Patient (patient)
│   │   └── Staff (staff)
│   └── Doctor (doctor)
└── Admin (admin)
```

## Implementation Details

### 1. User Role Enum

Created `src/common/enums/user-role.enum.ts` with:
- `UserRole` enum defining all roles including `SUPER_ADMIN`
- Role hierarchy mapping
- Display names for UI
- Helper functions for role management

### 2. Database Schema Updates

Updated the following schemas to support the super_admin role:
- `User` schema: Added `super_admin` to the role enum
- `UserAccess` schema: Added `super_admin` to the role enum

### 3. Permission System

The super admin role automatically gets all permissions defined in the system:
- All user management permissions
- All group management permissions
- All role management permissions
- All system administration permissions
- All database management permissions

### 4. Role Mapping Service

Created `src/common/services/role-mapping.service.ts` to handle:
- Role-to-permission mapping
- Permission checking
- Role hierarchy validation
- Manageable roles determination

## Usage

### Creating a Super Admin User

1. **Via Registration API:**
```json
{
  "email": "superadmin@cliniva.com",
  "password": "SecurePassword123!",
  "firstName": "Super",
  "lastName": "Administrator",
  "role": "super_admin"
}
```

2. **Via Migration Script:**
```bash
npm run db:migrate:super-admin
```

### Checking Super Admin Permissions

```typescript
import { RoleMappingService } from '../common/services/role-mapping.service';
import { UserRole } from '../common/enums/user-role.enum';
import { PermissionsEnum } from '../common/enums/permissions.enum';

// Check if super admin has a specific permission
const hasPermission = roleMappingService.hasPermission(
  UserRole.SUPER_ADMIN, 
  PermissionsEnum.USER_CREATE
); // Returns true

// Get all permissions for super admin
const permissions = roleMappingService.getRolePermissions(UserRole.SUPER_ADMIN);
// Returns all permissions in the system
```

### Role Management

```typescript
// Check if super admin can manage another role
const canManage = roleMappingService.canManageRole(
  UserRole.SUPER_ADMIN, 
  UserRole.ADMIN
); // Returns true

// Get all roles that super admin can manage
const manageableRoles = roleMappingService.getManageableRoles(UserRole.SUPER_ADMIN);
// Returns all roles in the system
```

## Security Considerations

1. **Default Super Admin:** The migration script creates a default super admin user with a known password hash. This should be changed immediately after deployment.

2. **Role Validation:** All role assignments are validated against the role hierarchy to prevent privilege escalation.

3. **Permission Inheritance:** Super admin automatically inherits all permissions, making it the most powerful role in the system.

4. **Audit Trail:** All super admin actions should be logged for security auditing.

## Migration

To add super admin support to an existing system:

1. **Run the migration script:**
```bash
npm run db:migrate:super-admin
```

2. **Update your application code** to use the new `UserRole` enum instead of string literals.

3. **Test the implementation** to ensure all role-based access controls work correctly.

## Testing

The test fixtures have been updated to include super admin test cases:

```typescript
// Test super admin registration
const superAdminData = {
  email: 'superadmin@clinic.com',
  password: 'SecurePassword123!',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'super_admin'
};
```

## API Changes

### Registration Endpoint

The registration endpoint now accepts `super_admin` as a valid role:

```json
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "super_admin"
}
```

### Response Changes

JWT tokens now include the role information:

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "super_admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Future Enhancements

1. **Role-based UI:** Implement role-based UI components that show/hide features based on user role.

2. **Advanced Permissions:** Add more granular permissions for specific features.

3. **Role Templates:** Create predefined role templates for common use cases.

4. **Audit Logging:** Implement comprehensive audit logging for all super admin actions.

5. **Multi-tenant Support:** Extend the role system to support multi-tenant environments.
