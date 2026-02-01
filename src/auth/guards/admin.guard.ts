import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

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
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly allowedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
  ];

  canActivate(context: ExecutionContext): boolean {
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
