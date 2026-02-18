import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';
import {
  DefaultRolePermissions,
  PermissionsEnum,
} from '../enums/permissions.enum';

/**
 * Service for mapping user roles to their corresponding permissions
 */
@Injectable()
export class RoleMappingService {
  private readonly logger = new Logger(RoleMappingService.name);

  /**
   * Get permissions for a specific user role
   */
  getRolePermissions(role: UserRole): PermissionsEnum[] {
    const roleKey = this.getRoleKey(role);
    return [...(DefaultRolePermissions[roleKey] || [])];
  }

  /**
   * Get all permissions for multiple roles
   */
  getMultipleRolePermissions(roles: UserRole[]): PermissionsEnum[] {
    const allPermissions = new Set<PermissionsEnum>();

    roles.forEach((role) => {
      const permissions = this.getRolePermissions(role);
      permissions.forEach((permission) => allPermissions.add(permission));
    });

    return Array.from(allPermissions);
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: UserRole, permission: PermissionsEnum): boolean {
    const rolePermissions = this.getRolePermissions(role);
    return rolePermissions.includes(permission);
  }

  /**
   * Check if a role has any of the specified permissions
   */
  hasAnyPermission(role: UserRole, permissions: PermissionsEnum[]): boolean {
    return permissions.some((permission) =>
      this.hasPermission(role, permission),
    );
  }

  /**
   * Check if a role has all of the specified permissions
   */
  hasAllPermissions(role: UserRole, permissions: PermissionsEnum[]): boolean {
    return permissions.every((permission) =>
      this.hasPermission(role, permission),
    );
  }

  /**
   * Get the highest role in the hierarchy
   */
  getHighestRole(roles: UserRole[]): UserRole {
    const roleHierarchy = [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.DOCTOR,
      UserRole.STAFF,
      UserRole.PATIENT,
    ];

    for (const hierarchyRole of roleHierarchy) {
      if (roles.includes(hierarchyRole)) {
        return hierarchyRole;
      }
    }

    return UserRole.PATIENT; // Default fallback
  }

  /**
   * Check if a role can manage another role
   */
  canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, UserRole[]> = {
      [UserRole.SUPER_ADMIN]: [
        UserRole.OWNER, // Super admin cannot create another super admin
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.DOCTOR,
        UserRole.STAFF,
        UserRole.PATIENT,
      ],
      [UserRole.OWNER]: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.DOCTOR,
        UserRole.STAFF,
        UserRole.PATIENT,
      ],
      [UserRole.ADMIN]: [
        UserRole.MANAGER,
        UserRole.DOCTOR,
        UserRole.STAFF,
        UserRole.PATIENT,
      ],
      [UserRole.MANAGER]: [UserRole.DOCTOR, UserRole.STAFF, UserRole.PATIENT],
      [UserRole.DOCTOR]: [UserRole.PATIENT],
      [UserRole.STAFF]: [UserRole.PATIENT],
      [UserRole.PATIENT]: [],
    };

    return roleHierarchy[managerRole]?.includes(targetRole) || false;
  }

  /**
   * Get all roles that a given role can manage
   */
  getManageableRoles(role: UserRole): UserRole[] {
    const roleHierarchy: Record<UserRole, UserRole[]> = {
      [UserRole.SUPER_ADMIN]: [
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.DOCTOR,
        UserRole.STAFF,
        UserRole.PATIENT,
      ],
      [UserRole.OWNER]: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.DOCTOR,
        UserRole.STAFF,
        UserRole.PATIENT,
      ],
      [UserRole.ADMIN]: [
        UserRole.MANAGER,
        UserRole.DOCTOR,
        UserRole.STAFF,
        UserRole.PATIENT,
      ],
      [UserRole.MANAGER]: [UserRole.DOCTOR, UserRole.STAFF, UserRole.PATIENT],
      [UserRole.DOCTOR]: [UserRole.PATIENT],
      [UserRole.STAFF]: [UserRole.PATIENT],
      [UserRole.PATIENT]: [],
    };

    return roleHierarchy[role] || [];
  }

  /**
   * Convert role enum to permission key
   */
  private getRoleKey(role: UserRole): keyof typeof DefaultRolePermissions {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'SUPER_ADMIN';
      case UserRole.OWNER:
        return 'OWNER';
      case UserRole.ADMIN:
        return 'ADMIN';
      case UserRole.MANAGER:
        return 'MANAGER';
      case UserRole.DOCTOR:
        return 'DOCTOR';
      case UserRole.STAFF:
        return 'STAFF';
      case UserRole.PATIENT:
        return 'PATIENT';
      default:
        this.logger.warn(
          `Unknown role: ${role}, defaulting to PATIENT permissions`,
        );
        return 'PATIENT';
    }
  }
}
