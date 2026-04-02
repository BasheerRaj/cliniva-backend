import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums/user-role.enum';

export const SKIP_ADMIN_GUARD_KEY = 'skipAdminGuard';

/**
 * Decorator to bypass AdminGuard for a specific endpoint while still
 * requiring JWT authentication. Use on endpoints within an AdminGuard-protected
 * controller that should be accessible by non-admin roles (e.g., doctor, staff).
 *
 * Usage: @SkipAdminGuard()
 */
export const SkipAdminGuard = () => SetMetadata(SKIP_ADMIN_GUARD_KEY, true);

/**
 * AdminGuard - Ensures user has admin, owner, or super_admin role
 *
 * This guard should be used after JwtAuthGuard to ensure the user is authenticated
 * and has the necessary administrative privileges.
 *
 * Allowed roles:
 * - super_admin: Platform-level administration
 * - owner: Organization/complex/clinic owner with full control
 * - admin: Administrative staff with management permissions
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 *
 * To allow non-admin access to a specific endpoint within an AdminGuard controller:
 * @SkipAdminGuard()
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly allowedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
  ];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Allow endpoints decorated with @SkipAdminGuard() to bypass this guard
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ADMIN_GUARD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user exists (should be populated by JwtAuthGuard)
    if (!user) {
      this.logger.warn('AdminGuard: No user found in request');
      throw new UnauthorizedException({
        message: {
          ar: 'المستخدم غير مصادق عليه',
          en: 'User not authenticated',
        },
        code: 'USER_NOT_AUTHENTICATED',
      });
    }

    // Check if user has an allowed role
    const hasAdminRole = this.allowedRoles.includes(user.role);

    if (!hasAdminRole) {
      this.logger.warn(
        `AdminGuard: User ${user.userId || user.sub} with role ${user.role} attempted to access admin endpoint`,
      );
      throw new ForbiddenException({
        message: {
          ar: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          en: 'You do not have permission to access this resource',
        },
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    this.logger.log(
      `AdminGuard: User ${user.userId || user.sub} with role ${user.role} granted access`,
    );
    return true;
  }
}
