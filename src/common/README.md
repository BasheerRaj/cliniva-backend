# Permission System Documentation

This document explains how to use the comprehensive permission system implemented for the Cliniva backend application.

## Overview

The permission system provides role-based access control (RBAC) with support for:
- User management CRUD permissions
- Group-based permission mapping
- Decorators for route protection
- Flexible permission checking
- Self-access capabilities

## Core Components

### 1. PermissionsEnum
Located in `enums/permissions.enum.ts`, this defines all available permissions in the system:

```typescript
// User Management CRUD
USER_CREATE, USER_READ, USER_UPDATE, USER_DELETE, USER_LIST

// Extended User Management  
USER_ACTIVATE, USER_DEACTIVATE, USER_RESET_PASSWORD, USER_CHANGE_ROLE

// Group Management
GROUP_CREATE, GROUP_READ, GROUP_UPDATE, GROUP_DELETE, GROUP_LIST

// Admin Permissions
ADMIN_ACCESS, ADMIN_VIEW_LOGS, ADMIN_MANAGE_SETTINGS

// And more...
```

### 2. Permission Decorators
Located in `decorators/permissions.decorator.ts`, these provide easy route protection:

```typescript
// Basic usage
@Permissions([PermissionsEnum.USER_READ])

// Require all permissions
@RequireAllPermissions(PermissionsEnum.USER_UPDATE, PermissionsEnum.USER_ACTIVATE)

// Require any permission
@RequireAnyPermission(PermissionsEnum.USER_READ, PermissionsEnum.ADMIN_ACCESS)

// Self-access allowed
@CanUpdateUserOrSelf('userId')

// Shorthand decorators
@CanCreateUser()
@CanReadUser()
@RequireAdminAccess()
```

### 3. PermissionsGuard
Located in `guards/permissions.guard.ts`, this enforces the permission checks:

```typescript
@UseGuards(PermissionsGuard)
@Controller('users')
export class UserController {
  @Get(':id')
  @CanReadUserOrSelf('id')
  getUser(@Param('id') id: string) {
    // Only users with USER_READ permission or accessing their own profile
  }
}
```

### 4. Permission Mapping Service
Located in `services/permission-mapping.service.ts`, this handles complex permission resolution:

```typescript
// Resolve all permissions for a user (including from roles and groups)
const permissions = await permissionMappingService.resolveUserPermissions(user, roles, groups);

// Check specific permissions
const result = await permissionMappingService.checkUserPermissions(
  user, 
  [PermissionsEnum.USER_CREATE], 
  false, // requireAll
  roles, 
  groups
);
```

## Usage Examples

### 1. Basic Route Protection

```typescript
@Controller('users')
@UseGuards(PermissionsGuard)
export class UserController {
  @Post()
  @CanCreateUser()
  async createUser(@Body() userData: any) {
    return { message: 'User created' };
  }

  @Get(':userId')
  @CanReadUserOrSelf('userId')
  async getUser(@Param('userId') userId: string) {
    return { message: 'User retrieved' };
  }
}
```

### 2. Group Management

```typescript
// Add user to group
const updatedGroup = permissionMappingService.addUserToGroup(group, userId);

// Assign role to group
const groupWithRole = permissionMappingService.addRoleToGroup(group, roleId);

// Get effective permissions for a group
const permissions = await permissionMappingService.getGroupEffectivePermissions(group, roles);
```

### 3. Programmatic Permission Checking

```typescript
@Injectable()
export class SomeService {
  constructor(private permissionService: PermissionService) {}

  async checkAccess(user: User) {
    // Check single permission
    const canRead = this.permissionService.hasPermission(user, PermissionsEnum.USER_READ);
    
    // Check multiple permissions (ANY)
    const canManage = this.permissionService.hasAnyPermission(user, [
      PermissionsEnum.USER_UPDATE,
      PermissionsEnum.USER_DELETE
    ]);
    
    // Check multiple permissions (ALL)
    const isAdmin = this.permissionService.hasAllPermissions(user, [
      PermissionsEnum.ADMIN_ACCESS,
      PermissionsEnum.ADMIN_VIEW_LOGS
    ]);
  }
}
```

## Permission Groups

Pre-defined permission groups are available for common use cases:

```typescript
import { PermissionGroups, DefaultRolePermissions } from './enums/permissions.enum';

// Use pre-defined groups
const userManagementPerms = PermissionGroups.USER_FULL_ACCESS;
const adminPerms = PermissionGroups.ADMIN_PERMISSIONS;

// Create roles with default permissions
const adminRole = permissionMappingService.createRoleWithDefaultPermissions('ADMIN');
```

## Setup in Module

```typescript
import { Module } from '@nestjs/common';
import { PermissionsGuard, PermissionService, PermissionMappingService } from './common';

@Module({
  providers: [
    PermissionsGuard,
    PermissionService,
    PermissionMappingService,
  ],
  exports: [PermissionService, PermissionMappingService],
})
export class CommonModule {}
```

## Data Models

The system expects these interfaces to be implemented:

```typescript
interface User {
  id: string;
  roles: string[];           // Role IDs
  groups: string[];          // Group IDs  
  permissions: PermissionsEnum[]; // Direct permissions
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  permissions: PermissionsEnum[];
  isActive: boolean;
}

interface Group {
  id: string;
  name: string;
  users: string[];           // User IDs
  roles: string[];           // Role IDs
  permissions: PermissionsEnum[]; // Direct group permissions
  isActive: boolean;
}
```

## Best Practices

1. **Use Guards**: Always apply `PermissionsGuard` to controllers that need protection
2. **Prefer Decorators**: Use shorthand decorators like `@CanCreateUser()` for better readability
3. **Self-Access**: Use self-access decorators for user profile endpoints
4. **Group Permissions**: Organize users into groups for easier permission management
5. **Validation**: Use `validatePermissionAssignment()` when assigning permissions programmatically

## Next Steps

To fully integrate this system:

1. Implement User, Role, and Group entities/schemas in your database
2. Create authentication middleware that attaches user to request
3. Implement role and group queries in the permission resolution
4. Add permission management endpoints for admins
5. Create middleware to resolve user permissions during authentication
