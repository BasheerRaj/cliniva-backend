import { Injectable, Logger } from '@nestjs/common';
import {
  PermissionsEnum,
  PermissionGroups,
  DefaultRolePermissions,
} from '../enums/permissions.enum';
import {
  User,
  Role,
  Group,
  PermissionCheckResult,
} from '../types/permission.types';

/**
 * Service for mapping and resolving permissions across users, roles, and groups
 */
@Injectable()
export class PermissionMappingService {
  private readonly logger = new Logger(PermissionMappingService.name);

  /**
   * Get all permissions for a user by resolving through roles and groups
   */
  async resolveUserPermissions(
    user: User,
    roles?: Role[],
    groups?: Group[],
  ): Promise<PermissionsEnum[]> {
    const allPermissions = new Set<PermissionsEnum>();

    // Add direct user permissions
    if (user.permissions?.length) {
      user.permissions.forEach((permission) => allPermissions.add(permission));
    }

    // Add permissions from roles
    if (roles?.length) {
      for (const role of roles) {
        if (role.isActive && user.roles.includes(role.id)) {
          role.permissions.forEach((permission) =>
            allPermissions.add(permission),
          );
        }
      }
    }

    // Add permissions from groups
    if (groups?.length) {
      for (const group of groups) {
        if (group.isActive && group.users.includes(user.id)) {
          // Add direct group permissions
          group.permissions.forEach((permission) =>
            allPermissions.add(permission),
          );

          // Add permissions from group roles
          if (group.roles?.length && roles?.length) {
            const groupRoles = roles.filter((role) =>
              group.roles.includes(role.id),
            );
            for (const role of groupRoles) {
              if (role.isActive) {
                role.permissions.forEach((permission) =>
                  allPermissions.add(permission),
                );
              }
            }
          }
        }
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Check if a user has specific permissions
   */
  async checkUserPermissions(
    user: User,
    requiredPermissions: PermissionsEnum[],
    requireAll = false,
    roles?: Role[],
    groups?: Group[],
  ): Promise<PermissionCheckResult> {
    if (!user.isActive) {
      return {
        hasPermission: false,
        reason: 'User account is inactive',
      };
    }

    const userPermissions = await this.resolveUserPermissions(
      user,
      roles,
      groups,
    );

    if (requireAll) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );

      if (missingPermissions.length > 0) {
        return {
          hasPermission: false,
          reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
        };
      }
    } else {
      const hasAnyPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasAnyPermission) {
        return {
          hasPermission: false,
          reason: `Missing any of required permissions: ${requiredPermissions.join(', ')}`,
        };
      }
    }

    return {
      hasPermission: true,
      grantedBy: this.getPermissionSource(
        user,
        requiredPermissions[0],
        roles,
        groups,
      ),
    };
  }

  /**
   * Get groups that a user belongs to
   */
  getUserGroups(user: User, allGroups: Group[]): Group[] {
    return allGroups.filter(
      (group) => group.isActive && group.users.includes(user.id),
    );
  }

  /**
   * Get roles assigned to a user (directly or through groups)
   */
  getUserRoles(user: User, allRoles: Role[], userGroups?: Group[]): Role[] {
    const roleIds = new Set<string>();

    // Add direct user roles
    user.roles.forEach((roleId) => roleIds.add(roleId));

    // Add roles from groups
    if (userGroups) {
      userGroups.forEach((group) => {
        group.roles.forEach((roleId) => roleIds.add(roleId));
      });
    }

    return allRoles.filter((role) => role.isActive && roleIds.has(role.id));
  }

  /**
   * Create a role with default permissions
   */
  createRoleWithDefaultPermissions(roleName: string): Partial<Role> {
    const permissions =
      DefaultRolePermissions[roleName as keyof typeof DefaultRolePermissions] ||
      [];

    return {
      name: roleName,
      permissions: Array.isArray(permissions)
        ? (permissions as PermissionsEnum[])
        : [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Assign permission group to a role
   */
  assignPermissionGroupToRole(
    role: Role,
    groupName: keyof typeof PermissionGroups,
  ): Role {
    const groupPermissions = PermissionGroups[groupName];
    const newPermissions = new Set([...role.permissions, ...groupPermissions]);

    return {
      ...role,
      permissions: Array.from(newPermissions),
      updatedAt: new Date(),
    };
  }

  /**
   * Add user to group
   */
  addUserToGroup(group: Group, userId: string): Group {
    if (!group.users.includes(userId)) {
      return {
        ...group,
        users: [...group.users, userId],
        updatedAt: new Date(),
      };
    }
    return group;
  }

  /**
   * Remove user from group
   */
  removeUserFromGroup(group: Group, userId: string): Group {
    return {
      ...group,
      users: group.users.filter((id) => id !== userId),
      updatedAt: new Date(),
    };
  }

  /**
   * Add role to group
   */
  addRoleToGroup(group: Group, roleId: string): Group {
    if (!group.roles.includes(roleId)) {
      return {
        ...group,
        roles: [...group.roles, roleId],
        updatedAt: new Date(),
      };
    }
    return group;
  }

  /**
   * Remove role from group
   */
  removeRoleFromGroup(group: Group, roleId: string): Group {
    return {
      ...group,
      roles: group.roles.filter((id) => id !== roleId),
      updatedAt: new Date(),
    };
  }

  /**
   * Get effective permissions for a group (direct + role permissions)
   */
  async getGroupEffectivePermissions(
    group: Group,
    roles: Role[],
  ): Promise<PermissionsEnum[]> {
    const permissions = new Set<PermissionsEnum>();

    // Add direct group permissions
    group.permissions.forEach((permission) => permissions.add(permission));

    // Add permissions from group roles
    const groupRoles = roles.filter(
      (role) => role.isActive && group.roles.includes(role.id),
    );

    groupRoles.forEach((role) => {
      role.permissions.forEach((permission) => permissions.add(permission));
    });

    return Array.from(permissions);
  }

  /**
   * Determine where a permission was granted from
   */
  private getPermissionSource(
    user: User,
    permission: PermissionsEnum,
    roles?: Role[],
    groups?: Group[],
  ): 'user' | 'role' | 'group' {
    // Check direct user permissions
    if (user.permissions?.includes(permission)) {
      return 'user';
    }

    // Check user roles
    if (roles) {
      const userRoles = roles.filter(
        (role) =>
          role.isActive &&
          user.roles.includes(role.id) &&
          role.permissions.includes(permission),
      );
      if (userRoles.length > 0) {
        return 'role';
      }
    }

    // Check groups (either direct group permissions or group roles)
    if (groups) {
      const userGroups = groups.filter(
        (group) => group.isActive && group.users.includes(user.id),
      );

      for (const group of userGroups) {
        if (group.permissions.includes(permission)) {
          return 'group';
        }

        // Check group roles
        if (roles && group.roles.length > 0) {
          const groupRoles = roles.filter(
            (role) =>
              role.isActive &&
              group.roles.includes(role.id) &&
              role.permissions.includes(permission),
          );
          if (groupRoles.length > 0) {
            return 'group';
          }
        }
      }
    }

    return 'user'; // Default fallback
  }

  /**
   * Validate permission assignment (prevent circular dependencies, etc.)
   */
  validatePermissionAssignment(
    targetType: 'user' | 'role' | 'group',
    targetId: string,
    permissions: PermissionsEnum[],
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicate permissions
    const uniquePermissions = [...new Set(permissions)];
    if (uniquePermissions.length !== permissions.length) {
      errors.push('Duplicate permissions detected');
    }

    // Check for invalid permission values
    const validPermissions = Object.values(PermissionsEnum);
    const invalidPermissions = permissions.filter(
      (permission) => !validPermissions.includes(permission),
    );

    if (invalidPermissions.length > 0) {
      errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }

    // Additional validation rules can be added here
    // For example: certain permissions might be mutually exclusive
    // or require other permissions to be present

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
