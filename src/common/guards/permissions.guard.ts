import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionMetadata, User, PermissionCheckResult } from '../types/permission.types';
import { PermissionsEnum } from '../enums/permissions.enum';

/**
 * Guard to check user permissions based on the @Permissions decorator
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Main method to determine if a request can proceed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission metadata from the decorator
    const permissionMetadata = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!permissionMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = this.extractUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has required permissions
    const permissionResult = await this.checkPermissions(
      user,
      permissionMetadata,
      request,
    );

    if (!permissionResult.hasPermission) {
      throw new ForbiddenException(
        permissionResult.reason || 'Insufficient permissions',
      );
    }

    return true;
  }

  /**
   * Extract user from request
   * This assumes the user is attached to the request by an authentication guard
   */
  private extractUserFromRequest(request: Request): User | null {
    // The user should be attached by a preceding AuthGuard or JwtGuard
    return (request as any).user || null;
  }

  /**
   * Check if user has the required permissions
   */
  private async checkPermissions(
    user: User,
    metadata: PermissionMetadata,
    request: Request,
  ): Promise<PermissionCheckResult> {
    const { permissions, requireAll, allowSelf, selfParam } = metadata;

    // Check if user is active
    if (!user.isActive) {
      return {
        hasPermission: false,
        reason: 'User account is inactive',
      };
    }

    // Check for self-access if allowed
    if (allowSelf && selfParam) {
      const isSelfAccess = this.checkSelfAccess(user, request, selfParam);
      if (isSelfAccess) {
        return {
          hasPermission: true,
          reason: 'Self-access granted',
          grantedBy: 'user',
        };
      }
    }

    // Get all user permissions (direct + from roles + from groups)
    const allUserPermissions = this.getAllUserPermissions(user);

    // Check permissions based on requireAll flag
    if (requireAll) {
      const hasAllPermissions = permissions.every(permission =>
        allUserPermissions.includes(permission),
      );
      
      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(
          permission => !allUserPermissions.includes(permission),
        );
        return {
          hasPermission: false,
          reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
        };
      }
    } else {
      const hasAnyPermission = permissions.some(permission =>
        allUserPermissions.includes(permission),
      );
      
      if (!hasAnyPermission) {
        return {
          hasPermission: false,
          reason: `Missing any of required permissions: ${permissions.join(', ')}`,
        };
      }
    }

    return {
      hasPermission: true,
      grantedBy: this.getPermissionSource(user, permissions[0]),
    };
  }

  /**
   * Check if the user is accessing their own resource
   */
  private checkSelfAccess(user: User, request: Request, selfParam: string): boolean {
    const paramValue = request.params[selfParam];
    const queryValue = request.query[selfParam];
    const bodyValue = (request.body as any)?.[selfParam];

    const targetUserId = paramValue || queryValue || bodyValue;
    
    return targetUserId === user.id;
  }

  /**
   * Get all permissions for a user (direct + roles + groups)
   * In a real implementation, this would query the database for role and group permissions
   */
  private getAllUserPermissions(user: User): PermissionsEnum[] {
    const permissions = new Set<PermissionsEnum>();

    // Add direct user permissions
    user.permissions?.forEach(permission => permissions.add(permission));

    // Note: In a real implementation, you would:
    // 1. Query the database for role permissions based on user.roles
    // 2. Query the database for group permissions based on user.groups
    // 3. Merge all permissions together
    
    // For now, we'll assume permissions are already resolved and attached to the user
    // This would typically be done in the authentication process

    return Array.from(permissions);
  }

  /**
   * Determine where the permission was granted from
   */
  private getPermissionSource(user: User, permission: PermissionsEnum): 'user' | 'role' | 'group' {
    if (user.permissions?.includes(permission)) {
      return 'user';
    }
    // In a real implementation, you would check roles and groups here
    return 'role'; // Default assumption
  }
}

/**
 * Service for permission checking outside of guards
 */
@Injectable()
export class PermissionService {
  /**
   * Check if a user has a specific permission
   */
  hasPermission(user: User, permission: PermissionsEnum): boolean {
    if (!user.isActive) {
      return false;
    }

    // Check direct permissions
    if (user.permissions?.includes(permission)) {
      return true;
    }

    // In a real implementation, check role and group permissions here
    return false;
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(user: User, permissions: PermissionsEnum[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(user: User, permissions: PermissionsEnum[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Get all permissions for a user
   */
  getAllPermissions(user: User): PermissionsEnum[] {
    if (!user.isActive) {
      return [];
    }

    const permissions = new Set<PermissionsEnum>();
    
    // Add direct permissions
    user.permissions?.forEach(permission => permissions.add(permission));
    
    // In a real implementation, add role and group permissions here
    
    return Array.from(permissions);
  }
}
